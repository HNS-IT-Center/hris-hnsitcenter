'use server'

import { prisma } from '@/lib/prisma'
import { toNumberArray } from '@/lib/utils/json-array'
import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth'
import { isPrivilegedRole } from '@/lib/auth/roles'
import { requirePrivileged, requireSelfOrPrivileged } from '@/lib/auth/guards'
import { HRD_AUDIENCE, formatDay, notify } from '@/lib/notify'

const LEAVE_LABELS: Record<string, string> = {
  SICK: 'Sakit',
  ANNUAL_LEAVE: 'Cuti',
  PERSONAL: 'Izin',
  HALF_DAY: 'Izin Setengah Hari',
  OVERTIME: 'Lembur',
}

function leavePeriod(start: Date, end: Date): string {
  return start.getTime() === end.getTime() ? formatDay(start) : `${formatDay(start)} - ${formatDay(end)}`
}

/**
 * Get all leave requests for a specific employee.
 */
export async function getMyLeaveRequests(userId: string) {
  await requireSelfOrPrivileged(userId)
  return await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get the remaining leave quota from the User record.
 */
export async function getMyLeaveQuota(userId: string) {
  await requireSelfOrPrivileged(userId)
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
    // Employees submit only for themselves; HRD may submit on someone's behalf.
    const caller = await requireSelfOrPrivileged(data.userId)

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
         if (toNumberArray(user?.weeklyOffDays).includes(new Date(d).getDay())) continue
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

    const userName = (await prisma.user.findUnique({ where: { id: data.userId }, select: { name: true } }))?.name || 'Seorang karyawan'
    const label = LEAVE_LABELS[data.type] ?? data.type
    const period = leavePeriod(record.startDate, record.endDate)

    await notify(
      { roles: HRD_AUDIENCE, excludeUserIds: [data.userId] },
      {
        category: 'LEAVE',
        title: `Pengajuan ${label} Baru`,
        body: `${userName} mengajukan ${label} untuk ${period}.${data.reason ? ` Alasan: ${data.reason}` : ''}`,
        url: '/hrd/leave',
        email: true,
      }
    )
    if (caller.id !== data.userId) {
      await notify(
        { userIds: [data.userId] },
        { category: 'LEAVE', title: `${label} Diajukan oleh HRD`, body: `${caller.name} mengajukan ${label} atas nama Anda untuk ${period}.`, url: '/leave' }
      )
    }

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
  await requirePrivileged()
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
    await requirePrivileged()
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
    
    const label = LEAVE_LABELS[request.type] ?? 'Izin'
    const statusLabel = approved ? 'disetujui' : 'ditolak'
    const rejectText = !approved ? ` Alasan: ${finalRejectReason}` : ''
    const quotaText = quotaChange !== 0 ? ` Sisa kuota cuti ${quotaChange < 0 ? 'berkurang' : 'dikembalikan'} ${Math.abs(quotaChange)} hari.` : ''
    await notify(
      { userIds: [request.userId] },
      {
        category: 'LEAVE',
        title: `Pengajuan ${label} ${approved ? 'Disetujui' : 'Ditolak'}`,
        body: `Pengajuan ${label} Anda untuk ${leavePeriod(request.startDate, request.endDate)} telah ${statusLabel}.${rejectText}${quotaText}`,
        url: '/leave',
        email: true,
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
    await requirePrivileged()
    const request = await prisma.leaveRequest.update({
      where: { id },
      data: { isPaid },
    })
    await notify(
      { userIds: [request.userId] },
      {
        category: 'LEAVE',
        title: 'Surat Sakit Diverifikasi',
        body: `Surat sakit untuk ${leavePeriod(request.startDate, request.endDate)} telah diverifikasi. Izin sakit dihitung ${isPaid ? 'dibayar' : 'tidak dibayar'}.`,
        url: '/leave',
      }
    )
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
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    })
    if (!request) return { success: false, error: 'Pengajuan tidak ditemukan.' }

    const caller = await getServerUser()
    if (!isPrivilegedRole(caller.role) && request.user.email !== caller.email) {
      return { success: false, error: 'Anda tidak berhak mengubah pengajuan ini.' }
    }

    // 3 days limit constraint (3 * 24 * 60 * 60 * 1000 = 259200000 ms)
    if (Date.now() - request.createdAt.getTime() > 259200000) {
       return { success: false, error: 'Batas waktu 3 hari untuk mengunggah surat sakit telah habis.' }
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: { sickNoteUrl, sickNoteFileName },
    })
    const owner = await prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } })
    await notify(
      { roles: HRD_AUDIENCE, excludeUserIds: [caller.id] },
      {
        category: 'LEAVE',
        title: 'Surat Sakit Diunggah',
        body: `${owner?.name ?? 'Karyawan'} mengunggah surat sakit untuk ${leavePeriod(request.startDate, request.endDate)}. Mohon diverifikasi.`,
        url: '/hrd/leave',
      }
    )
    revalidatePath('/leave')
    revalidatePath('/hrd/leave')
    return { success: true }
  } catch (error) {
    console.error('Error uploading sick note:', error)
    return { success: false, error: 'Gagal mengunggah surat sakit.' }
  }
}
