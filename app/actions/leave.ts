'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
}) {
  try {
    const record = await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: 'PENDING',
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        reason: data.reason,
        sickNoteUrl: data.sickNoteUrl,
      },
    })
    revalidatePath('/leave')
    revalidatePath('/hrd/leave')
    return { success: true, data: record }
  } catch (error) {
    console.error('Error submitting leave request:', error)
    return { success: false, error: 'Gagal mengirim pengajuan.' }
  }
}

/**
 * For HRD: get all PENDING leave requests with user info.
 */
export async function getPendingLeaveRequests() {
  return await prisma.leaveRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, departmentName: true, positionName: true },
      },
    },
    orderBy: { createdAt: 'asc' },
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
    const request = await prisma.leaveRequest.findUnique({ where: { id } })
    if (!request) return { success: false, error: 'Pengajuan tidak ditemukan.' }

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        rejectReason: approved ? null : rejectReason,
      },
    })

    // Deduct quota if annual leave was approved
    if (approved && request.type === 'ANNUAL_LEAVE') {
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          leaveQuotaRemaining: {
            decrement: Math.ceil(request.totalDays),
          },
        },
      })
    }

    revalidatePath('/hrd/leave')
    revalidatePath('/leave')
    return { success: true }
  } catch (error) {
    console.error('Error approving leave request:', error)
    return { success: false, error: 'Gagal memproses pengajuan.' }
  }
}
