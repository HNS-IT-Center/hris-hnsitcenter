'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requirePrivileged } from '@/lib/auth/guards'
import { notify } from '@/lib/notify'

export async function getShifts() {
  await requirePrivileged()
  return await prisma.shift.findMany({
    orderBy: {
      name: 'asc'
    }
  })
}

export async function createShift(data: {
  name: string
  startTime: string
  endTime: string
  checkinWindowMin?: number
}) {
  try {
    await requirePrivileged()
    const shift = await prisma.shift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        checkinWindowMin: data.checkinWindowMin ?? 30
      }
    })
    revalidatePath('/hrd/pengaturan-absensi')
    return { success: true, data: shift }
  } catch (error) {
    console.error('Error creating shift:', error)
    return { success: false, error: 'Failed to create shift' }
  }
}

export async function updateShift(id: string, data: {
  name?: string
  startTime?: string
  endTime?: string
  checkinWindowMin?: number
}) {
  try {
    await requirePrivileged()
    const before = await prisma.shift.findUnique({ where: { id } })
    const shift = await prisma.shift.update({
      where: { id },
      data
    })
    revalidatePath('/hrd/pengaturan-absensi')
    if (before && (before.startTime !== shift.startTime || before.endTime !== shift.endTime)) {
      const users = await prisma.user.findMany({ where: { shiftId: id, isActive: true }, select: { id: true } })
      await notify(
        { userIds: users.map((u) => u.id) },
        {
          category: 'SHIFT',
          title: 'Jam Shift Berubah',
          body: `Shift ${shift.name} sekarang ${shift.startTime} - ${shift.endTime} (sebelumnya ${before.startTime} - ${before.endTime}).`,
          url: '/attendance',
        }
      )
    }
    return { success: true, data: shift }
  } catch (error) {
    console.error('Error updating shift:', error)
    return { success: false, error: 'Failed to update shift' }
  }
}

export async function deleteShift(id: string) {
  try {
    await requirePrivileged()
    await prisma.shift.delete({
      where: { id }
    })
    revalidatePath('/hrd/pengaturan-absensi')
    return { success: true }
  } catch (error) {
    console.error('Error deleting shift:', error)
    return { success: false, error: 'Failed to delete shift' }
  }
}
