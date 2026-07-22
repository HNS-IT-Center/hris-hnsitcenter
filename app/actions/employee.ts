'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { generateNextEmployeeId } from '@/lib/utils/employee-id'
import { hasRole } from '@/lib/auth'

async function requireHRD() {
  if (!(await hasRole('HRD', 'BOSS', 'ADMIN', 'SUPER_ADMIN'))) {
    throw new Error('Unauthorized')
  }
}

export async function getEmployees() {
  console.log("Cache bust action")
  return await prisma.user.findMany({
    include: {
      department: true,
      store: true,
      shift: true,
      userDevices: true,
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
  avatarOriginalUrl?: string | null
}) {
  try {
    await requireHRD()
    
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
        avatarOriginalUrl: data.avatarOriginalUrl,
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
  joinDate?: Date
  password?: string
}) {
  try {
    await requireHRD()

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

    let passwordHash = null
    if (data.password) {
      const salt = await bcrypt.genSalt(10)
      passwordHash = await bcrypt.hash(data.password, salt)
    }

    const employeeId = await generateNextEmployeeId()

    const newUser = await prisma.user.create({
      data: {
        employeeId,
        name: data.name,
        email: data.email,
        passwordHash,
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
        joinDate: data.joinDate ?? new Date(),
        leaveQuotaRemaining: 0,
        lastQuotaResetDate: data.joinDate ?? new Date(),
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

export async function toggleDeviceBlock(deviceId: string, userId: string, block: boolean) {
  try {
    await requireHRD()
    await prisma.userDevice.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { isBlocked: block },
    })
    revalidatePath('/hrd/employees')
    return { success: true }
  } catch (err) {
    console.error('Error toggling device block:', err)
    return { success: false, error: 'Gagal memblokir/membuka blokir perangkat.' }
  }
}

export async function deleteEmployee(id: string, currentUserId: string) {
  try {
    await requireHRD()
    if (id === currentUserId) {
      return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' }
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return { success: false, error: 'Karyawan tidak ditemukan.' }
    }

    // Use transaction to perform cascading delete of related records
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { userId: id } }),
      prisma.leaveRequest.deleteMany({ where: { userId: id } }),
      prisma.overtimeRequest.deleteMany({ where: { userId: id } }),
      prisma.leaveQuota.deleteMany({ where: { userId: id } }),
      prisma.performanceMonthly.deleteMany({ where: { userId: id } }),
      prisma.storeAssignment.deleteMany({ where: { userId: id } }),
      prisma.shiftAssignment.deleteMany({ where: { userId: id } }),
      prisma.shiftOverride.deleteMany({ where: { userId: id } }),
      prisma.shiftSwap.deleteMany({ where: { userAId: id } }),
      prisma.shiftSwap.deleteMany({ where: { userBId: id } }),
      prisma.userDevice.deleteMany({ where: { userId: id } }),
      prisma.attentionFlag.deleteMany({ where: { userId: id } }),
      prisma.pushSubscription.deleteMany({ where: { userId: id } }),
      prisma.appNotification.deleteMany({ where: { userId: id } }),
      prisma.broadcastFilterUser.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ])

    revalidatePath('/hrd/employees')
    return { success: true }
  } catch (err) {
    console.error('Error deleting employee:', err)
    return { success: false, error: 'Gagal menghapus karyawan. Terdapat data terkait yang tidak dapat dihapus.' }
  }
}
