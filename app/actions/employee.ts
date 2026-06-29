'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEmployees() {
  console.log("Cache bust action")
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
  halfDays?: number[]
  shiftCycle?: string[]
  cycleStartDate?: Date | null
  storeId?: string | null
  shiftId?: string | null
  leaveQuotaRemaining?: number
  isActive?: boolean
  avatarUrl?: string | null
}) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        joinDate: data.joinDate,
        weeklyOffDays: data.weeklyOffDays,
        halfDays: data.halfDays,
        shiftCycle: data.shiftCycle,
        cycleStartDate: data.cycleStartDate,
        storeId: data.storeId,
        shiftId: data.shiftId,
        leaveQuotaRemaining: data.leaveQuotaRemaining,
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

export async function createEmployee(data: {
  name: string
  email: string
  departmentName: string
  positionName: string
  storeId?: string | null
  shiftId?: string | null
  phoneNumber?: string | null
}) {
  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return { success: false, error: 'Email sudah terdaftar.' }
    }

    let departmentId = null
    if (data.departmentName) {
      const dept = await prisma.department.findUnique({ where: { name: data.departmentName } })
      if (dept) departmentId = dept.id
    }

    let role: any = 'EMPLOYEE'
    if (data.departmentName === 'HRD') {
      role = 'HRD'
    } else if (data.departmentName === 'BOSS') {
      role = 'BOSS'
    }

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        departmentName: data.departmentName,
        departmentId,
        positionName: data.positionName,
        storeId: data.storeId,
        shiftId: data.shiftId,
        phoneNumber: data.phoneNumber,
        role,
        isActive: true,
        notifEnabled: true,
        twoFAEnabled: false,
      }
    })

    revalidatePath('/hrd/employees')
    return { success: true, data: newUser }
  } catch (error) {
    console.error('Error creating employee:', error)
    return { success: false, error: 'Gagal membuat karyawan baru.' }
  }
}

export async function getUniquePositions() {
  try {
    const users = await prisma.user.findMany({
      select: { positionName: true },
      distinct: ['positionName']
    })
    return users.map(u => u.positionName).filter(Boolean) as string[]
  } catch {
    return []
  }
}
