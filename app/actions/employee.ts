'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEmployees() {
  return await prisma.user.findMany({
    include: {
      department: true,
      store: true,
      shift: true,
    },
    orderBy: {
      name: 'asc'
    }
  })
}

export async function getEmployee(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      store: true,
      shift: true,
    }
  })
}

export async function updateEmployee(id: string, data: {
  joinDate?: Date
  weeklyOffDays?: number[]
  shiftPattern?: string | null
  storeId?: string | null
  shiftId?: string | null
  secondaryShiftId?: string | null
  isActive?: boolean
  avatarUrl?: string | null
}) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        joinDate: data.joinDate,
        weeklyOffDays: data.weeklyOffDays,
        shiftPattern: data.shiftPattern,
        storeId: data.storeId,
        shiftId: data.shiftId,
        secondaryShiftId: data.secondaryShiftId,
        isActive: data.isActive,
        avatarUrl: data.avatarUrl,
      },
    })
    
    revalidatePath('/hrd/employees')
    return { success: true, data: updatedUser }
  } catch (error) {
    console.error('Error updating employee:', error)
    return { success: false, error: 'Failed to update employee' }
  }
}
