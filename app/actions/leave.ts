'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendPushNotification, sendPushNotificationToRole } from '@/lib/web-push'

/**
 * Get all leave requests for a specific employee.
 */
export async function getMyLeaveRequests(userId: string) {
  return await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get the remaining leave quota from the User record.
 */
export async function getMyLeaveQuota(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { leaveQuotaRemaining: true },
  })
  const remaining = user?.leaveQuotaRemaining ?? 0
  return {
    total: 12,
    used: 12 - remaining,
    remaining,
  }
}

/**
 * Submit a new leave or sick/permission request.
 */
export async function submitLeaveRequest(data: {
  userId: string
  type: 'ANNUAL_LEAVE' | 'SICK' | 'PERSONAL' | 'HALF_DAY' | 'OVERTIME'
  startDate: Date
  endDate: Date
  totalDays: number
  reason?: string
  sickNoteUrl?: string
  sickNoteFileName?: string
  halfDayType?: string
  halfDayTime?: string
}) {
  try {
    // 1. Overlap validation
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: data.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: data.endDate },
        endDate: { gte: data.startDate }
      }
    })
    
    if (overlapping) {
      return { success: false, error: 'Terdapat pengajuan izin yang bertabrakan pada rentang tanggal tersebut.' }
    }

    // 2. Strict totalDays calculation (Server-Side Truth)
    let calculatedTotalDays = 0
    if (data.type === 'HALF_DAY') {
       calculatedTotalDays = 1
    } else {
       const user = await prisma.user.findUnique({
         where: { id: data.userId },
         select: { weeklyOffDays: true }
       })
       const holidays = await prisma.holidayAssignment.findMany({
         where: {
           OR: [{ applyToAll: true }, { userId: data.userId }]
         },
         include: { holidayMarker: true }
       })
       const holidayMs = holidays.map(h => new Date(h.holidayMarker.date).setHours(0,0,0,0))
       const start = new Date(data.startDate).setHours(0,0,0,0)
       const end = new Date(data.endDate).setHours(0,0,0,0)
       
       for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
         if (user?.weeklyOffDays.includes(new Date(d).getDay())) continue
         if (holidayMs.includes(d)) continue
         calculatedTotalDays++
       }
       
       if (calculatedTotalDays === 0) {
         return { success: false, error: 'Tidak ada hari kerja pada rentang tanggal ini.' }
       }
    }

    let unpaidHours = 0
    if (data.type === 'HALF_DAY' && data.halfDayTime && data.halfDayType) {
      const user = await prisma.user.findUnique({ where: { id: data.userId }, include: { shift: true } })
      if (user?.shift) {
        const [sH, sM] = user.shift.startTime.split(':').map(Number)
        const [eH, eM] = user.shift.endTime.split(':').map(Number)
        const [rH, rM] = data.halfDayTime.split(':').map(Number)
        
        if (data.halfDayType === 'LATE_IN') {
          const diffHrs = (rH + rM/60) - (sH + sM/60)
          unpaidHours = Math.max(0, Math.ceil(diffHrs))
        } else if (data.halfDayType === 'EARLY_OUT') {
          const diffHrs = (eH + eM/60) - (rH + rM/60)
          unpaidHours = Math.max(0, Math.ceil(diffHrs))
        }
      }
    }

    const record = await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: 'PENDING',
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: calculatedTotalDays,
        reason: data.reason,
        sickNoteUrl: data.sickNoteUrl,
        sickNoteFileName: data.sickNoteFileName,
        halfDayType: data.halfDayType,
        halfDayTime: data.halfDayTime,
        unpaidHours,
        isPaid: data.type === 'SICK' && !data.sickNoteUrl ? false : true,
      },
    })
    revalidatePath('/leave')
    revalidatePath('/hrd/leave')

    // Trigger push notification to HRD/BOSS
    const userName = (await prisma.user.findUnique({ where: { id: data.userId }, select: { name: true } }))?.name || 'Seorang karyawan'
    let leaveTypeString = data.type
    if (data.type === 'SICK') leaveTypeString = 'Sakit'
    if (data.type === 'ANNUAL_LEAVE') leaveTypeString = 'Cuti'
    if (data.type === 'PERSONAL') leaveTypeString = 'Izin'
    if (data.type === 'HALF_DAY') leaveTypeString = 'Izin Setengah Hari'
    
    await sendPushNotificationToRole(
      ['HRD', 'BOSS', 'ADMIN'],
      {
        title: 'Pengajuan Izin Baru',
        body: `${userName} telah mengajukan ${leaveTypeString}.`,
        url: '/hrd/leave'
      }
    )

    return { success: true, data: record }
  } catch (error) {
    console.error('Error submitting leave request:', error)
    return { success: false, error: 'Gagal mengirim pengajuan.' }
  }
}

/**
 * For HRD: get all leave requests (for history and approval)
 */
export async function getAllLeaveRequests() {
  return await prisma.leaveRequest.findMany({
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, departmentName: true, positionName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * For HRD: Approve or reject a leave request.
 * If approved and type is ANNUAL_LEAVE, deducts from quota.
 */
export async function approveLeaveRequest(
  id: string,
  approved: boolean,
  rejectReason?: string
) {
  try {
    const request = await prisma.leaveRequest.findUnique({ 
      where: { id },
      include: { user: { select: { lastQuotaResetDate: true } } }
    })
    if (!request) return { success: false, error: 'Pengajuan tidak ditemukan.' }

    // Lock constraint: Cannot edit if endDate (WIB day) has already passed
    const endOfLeaveDay = request.endDate.getTime() + 86400000 // Add 24h to midnight UTC
    if (Date.now() > endOfLeaveDay) {
       return { success: false, error: 'Tidak dapat mengubah status karena tanggal izin sudah berlalu.' }
    }

    const finalRejectReason = approved ? null : (rejectReason?.trim() || "Tidak diizinkan")

    let quotaChange = 0
    if (request.type === 'ANNUAL_LEAVE') {
       const isCurrentPeriod = !request.user.lastQuotaResetDate || request.startDate >= request.user.lastQuotaResetDate
       if (isCurrentPeriod) {
         if (approved && request.status !== 'APPROVED') {
            quotaChange = -Math.ceil(request.totalDays)
         } else if (!approved && request.status === 'APPROVED') {
            quotaChange = Math.ceil(request.totalDays)
         }
       }
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          rejectReason: finalRejectReason,
        },
      })

      if (quotaChange !== 0) {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            leaveQuotaRemaining: { increment: quotaChange },
          },
        })
      }
    })

    revalidatePath('/hrd/leave')
    revalidatePath('/leave')
    
    const statusLabel = approved ? 'disetujui' : 'ditolak'
    const rejectText = !approved ? ` Alasan: ${finalRejectReason}` : ''
    await sendPushNotification(
      request.userId,
      {
        title: `Pengajuan Izin ${approved ? 'Disetujui' : 'Ditolak'}`,
        body: `Pengajuan izin Anda telah ${statusLabel}.${rejectText}`,
        url: '/leave'
      }
    )

    return { success: true }
  } catch (error) {
    console.error('Error approving leave request:', error)
    return { success: false, error: 'Gagal memproses pengajuan.' }
  }
}

/**
 * For HRD: Verify sick leave letter and mark as Paid.
 */
export async function verifySickLeave(id: string, isPaid: boolean) {
  try {
    await prisma.leaveRequest.update({
      where: { id },
      data: { isPaid },
    })
    revalidatePath('/hrd/leave')
    revalidatePath('/leave')
    return { success: true }
  } catch (error) {
    console.error('Error verifying sick leave:', error)
    return { success: false, error: 'Gagal memverifikasi surat sakit.' }
  }
}

/**
 * For Employee: Upload sick note later for an existing sick leave request.
 */
export async function uploadSickNote(id: string, sickNoteUrl: string, sickNoteFileName: string) {
  try {
    const request = await prisma.leaveRequest.findUnique({ where: { id } })
    if (!request) return { success: false, error: 'Pengajuan tidak ditemukan.' }
    
    // 3 days limit constraint (3 * 24 * 60 * 60 * 1000 = 259200000 ms)
    if (Date.now() - request.createdAt.getTime() > 259200000) {
       return { success: false, error: 'Batas waktu 3 hari untuk mengunggah surat sakit telah habis.' }
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: { sickNoteUrl, sickNoteFileName },
    })
    revalidatePath('/leave')
    revalidatePath('/hrd/leave')
    return { success: true }
  } catch (error) {
    console.error('Error uploading sick note:', error)
    return { success: false, error: 'Gagal mengunggah surat sakit.' }
  }
}
