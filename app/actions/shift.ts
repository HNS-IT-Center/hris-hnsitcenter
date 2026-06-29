'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getShifts() {
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
    const shift = await prisma.shift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        checkinWindowMin: data.checkinWindowMin || 15
      }
    })
    revalidatePath('/hrd/shifts')
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
    const shift = await prisma.shift.update({
      where: { id },
      data
    })
    revalidatePath('/hrd/shifts')
    return { success: true, data: shift }
  } catch (error) {
    console.error('Error updating shift:', error)
    return { success: false, error: 'Failed to update shift' }
  }
}

export async function deleteShift(id: string) {
  try {
    await prisma.shift.delete({
      where: { id }
    })
    revalidatePath('/hrd/shifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting shift:', error)
    return { success: false, error: 'Failed to delete shift' }
  }
}
