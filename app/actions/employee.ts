'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { generateNextEmployeeId } from '@/lib/utils/employee-id'
import { getServerUser, hasRole, type SSOUser } from '@/lib/auth'
import { PRIVILEGED_ROLES, ROLE_LABELS, isHrisRole, type HrisRole } from '@/lib/auth/roles'
import { toNumberArray, toStringArray } from '@/lib/utils/json-array'
import { notify } from '@/lib/notify'

async function requireHRD() {
  if (!(await hasRole(...PRIVILEGED_ROLES))) {
    throw new Error('Unauthorized')
  }
}

/**
 * Roles live in User.role (the SSO carries none). Rules: nobody changes their
 * own role (no self-lockout or self-promotion), and only an ADMIN may grant
 * or remove ADMIN.
 */
function roleChangeError(actor: SSOUser, targetId: string | null, from: HrisRole, to: HrisRole): string | null {
  if (from === to) return null
  if (targetId === actor.id) return 'Anda tidak dapat mengubah role akun Anda sendiri.'
  if ((from === 'ADMIN' || to === 'ADMIN') && actor.role !== 'ADMIN') return 'Hanya Admin yang dapat memberi atau mencabut role Admin.'
  return null
}

/** Department is managed in the HRIS now; create it on first use. */
async function resolveDepartmentId(name: string): Promise<string | null> {
  if (!name) return null
  const dept = await prisma.department.upsert({ where: { name }, update: {}, create: { name } })
  return dept.id
}

export async function getEmployees() {
  await requireHRD()
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
  await requireHRD()
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
  role?: HrisRole
  departmentName?: string
  positionName?: string
  avatarUrl?: string | null
  avatarOriginalUrl?: string | null
}) {
  try {
    await requireHRD()
    const actor = await getServerUser()

    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        role: true, storeId: true, shiftId: true, leaveQuotaRemaining: true, departmentName: true, positionName: true,
        weeklyOffDays: true, halfDays: true, shiftCycle: true, cycleStartDate: true,
      },
    })
    if (!before) return { success: false, error: 'Karyawan tidak ditemukan.' }

    let role: HrisRole | undefined
    if (data.role !== undefined) {
      if (!isHrisRole(data.role)) return { success: false, error: 'Role tidak valid.' }
      const error = roleChangeError(actor, id, before.role as HrisRole, data.role)
      if (error) return { success: false, error }
      role = data.role
    }

    const departmentName = data.departmentName?.trim()
    const positionName = data.positionName?.trim()
    const departmentId = departmentName === undefined ? undefined : await resolveDepartmentId(departmentName)

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
        role,
        ...(departmentName !== undefined ? { departmentName: departmentName || null, departmentId } : {}),
        ...(positionName !== undefined ? { positionName: positionName || null } : {}),
        avatarUrl: data.avatarUrl,
        avatarOriginalUrl: data.avatarOriginalUrl,
      },
      include: { store: { select: { name: true } }, shift: { select: { name: true, startTime: true, endTime: true } } },
    })

    // Tell the employee what HRD changed (notify() skips inactive accounts).
    const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
    const changes: string[] = []
    if (role && role !== before.role) changes.push(`role menjadi ${ROLE_LABELS[role]}`)
    if (data.storeId !== undefined && data.storeId !== before.storeId) changes.push(`lokasi absen menjadi ${updatedUser.store?.name ?? 'tidak ada'}`)
    if (data.shiftId !== undefined && data.shiftId !== before.shiftId) {
      changes.push(updatedUser.shift ? `shift menjadi ${updatedUser.shift.name} (${updatedUser.shift.startTime} - ${updatedUser.shift.endTime})` : 'shift dikosongkan')
    }
    if (
      (data.weeklyOffDays !== undefined && !sameJson(toNumberArray(before.weeklyOffDays), data.weeklyOffDays)) ||
      (data.halfDays !== undefined && !sameJson(toNumberArray(before.halfDays), data.halfDays)) ||
      (data.shiftCycle !== undefined && !sameJson(toStringArray(before.shiftCycle), data.shiftCycle)) ||
      (data.cycleStartDate !== undefined && (data.cycleStartDate?.getTime() ?? null) !== (before.cycleStartDate?.getTime() ?? null))
    ) changes.push('jadwal kerja (hari libur / rotasi shift)')
    if (data.leaveQuotaRemaining !== undefined && data.leaveQuotaRemaining !== before.leaveQuotaRemaining) {
      changes.push(`sisa kuota cuti menjadi ${data.leaveQuotaRemaining} hari`)
    }
    if (departmentName !== undefined && (departmentName || null) !== before.departmentName) changes.push(`departemen menjadi ${departmentName || '-'}`)
    if (positionName !== undefined && (positionName || null) !== before.positionName) changes.push(`posisi menjadi ${positionName || '-'}`)

    if (changes.length > 0 && id !== actor.id) {
      await notify(
        { userIds: [id] },
        {
          category: 'ACCOUNT',
          title: 'Data Kepegawaian Diperbarui',
          body: `HRD memperbarui data Anda: ${changes.join('; ')}.`,
          url: '/profile',
        }
      )
    }

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
  role?: HrisRole
}) {
  try {
    await requireHRD()
    const actor = await getServerUser()

    const email = data.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { success: false, error: 'Email sudah terdaftar.' }
    }

    const role: HrisRole = data.role && isHrisRole(data.role) ? data.role : 'EMPLOYEE'
    const roleError = roleChangeError(actor, null, 'EMPLOYEE', role)
    if (roleError) return { success: false, error: roleError }

    const departmentName = data.departmentName.trim()
    const departmentId = await resolveDepartmentId(departmentName)

    const employeeId = await generateNextEmployeeId()

    const newUser = await prisma.user.create({
      data: {
        employeeId,
        name: data.name,
        // No password: staff sign in only through the HNS SSO. The row links to
        // the SSO account by email on first login (lib/auth/sync.ts).
        email,
        departmentName,
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
    await requireHRD()
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
    const device = await prisma.userDevice.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { isBlocked: block },
    })
    await notify(
      { userIds: [userId] },
      {
        category: 'ACCOUNT',
        title: block ? 'Perangkat Diblokir' : 'Blokir Perangkat Dibuka',
        body: block
          ? `HRD memblokir perangkat ${device.userAgent ? `"${device.userAgent.slice(0, 60)}"` : 'Anda'} untuk absensi. Hubungi HRD bila ini keliru.`
          : 'HRD membuka blokir perangkat Anda. Anda bisa absen dari perangkat itu lagi.',
        url: '/attendance',
      }
    )
    revalidatePath('/hrd/employees')
    return { success: true }
  } catch (err) {
    console.error('Error toggling device block:', err)
    return { success: false, error: 'Gagal memblokir/membuka blokir perangkat.' }
  }
}

export async function deleteEmployee(id: string, _currentUserId?: string) {
  try {
    await requireHRD()
    // Compare with the session, not the id sent by the client.
    const actor = await getServerUser()
    if (id === actor.id) {
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
      prisma.authSession.deleteMany({ where: { userId: id } }),
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
