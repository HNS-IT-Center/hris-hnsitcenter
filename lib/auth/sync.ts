import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

import { SSOUser } from '@/lib/auth'
import { generateNextEmployeeId } from '@/lib/utils/employee-id'

export async function syncUserFromSSO(payload: SSOUser) {
  const { id, email, name, globalRole, departmentName, departmentId: ssoDepartmentId, positionId: ssoPositionId, positionName } = payload

  // 1. Resolve Department
  let departmentId: string | null = null
  if (departmentName) {
    let dept = await prisma.department.findUnique({
      where: { name: departmentName }
    })
    
    // Create department if it doesn't exist
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: departmentName }
      })
    }
    departmentId = dept.id
  }

  // 2. Resolve Role
  let role = Role.EMPLOYEE
  
  // Department takes absolute priority
  if (departmentName === 'HRD') {
    role = Role.HRD
  } else if (globalRole === 'SUPER_ADMIN' || globalRole === 'ADMIN') {
    // If not HRD, but they have global admin privileges, make them an ADMIN
    role = Role.ADMIN
  } else if (departmentName === 'BOSS') {
    // Optional fallback for BOSS if needed
    role = Role.BOSS
  }

  // 3. Check existing user and handle Quota Reset
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    const now = new Date()
    const joinDate = new Date(existingUser.joinDate)
    
    // Determine the most recent anniversary date in the past
    const anniversaryThisYear = new Date(joinDate)
    anniversaryThisYear.setFullYear(now.getFullYear())

    if (anniversaryThisYear > now) {
      anniversaryThisYear.setFullYear(now.getFullYear() - 1)
    }

    const lastReset = existingUser.lastQuotaResetDate ? new Date(existingUser.lastQuotaResetDate) : new Date(0)
    
    let newQuota = existingUser.leaveQuotaRemaining
    let newResetDate = existingUser.lastQuotaResetDate

    // Only reset if they have worked strictly more than 0 years (anniversary > joinDate)
    // and we haven't reset it since that specific anniversary.
    if (anniversaryThisYear > joinDate && lastReset < anniversaryThisYear) {
      newQuota = 12
      newResetDate = anniversaryThisYear
    }

    await prisma.user.update({
      where: { email },
      data: {
        ssoId: id,
        name,
        role,
        departmentId,
        ssoDepartmentId,
        departmentName,
        ssoPositionId,
        positionName,
        leaveQuotaRemaining: newQuota,
        lastQuotaResetDate: newResetDate,
      },
    })
  } else {
    // Generate a sequential HNS-XXXX employee ID
    const employeeId = await generateNextEmployeeId()

    // If they don't exist, they are auto-provisioned seamlessly!
    await prisma.user.create({
      data: {
        ssoId: id,
        employeeId,
        email,
        name,
        role,
        departmentId,
        ssoDepartmentId,
        departmentName,
        ssoPositionId,
        positionName,
        isActive: true, // Auto-activate
        notifEnabled: true,
        twoFAEnabled: false,
        // New employees get 0 quota initially. lastQuotaResetDate is set to their joinDate.
        leaveQuotaRemaining: 0, 
        lastQuotaResetDate: new Date(),
      }
    })
  }
}
