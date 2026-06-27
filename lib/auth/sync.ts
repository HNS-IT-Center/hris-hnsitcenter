import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function syncUserFromSSO(payload: {
  id: string
  email: string
  name: string
  globalRole: string
  departmentName: string | null
}) {
  const { id, email, name, globalRole, departmentName } = payload

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

  // 3. Upsert User in database
  // Using upsert ensures that if they exist, their details (name, role, dept) stay in sync with SSO.
  // If they don't exist, they are auto-provisioned seamlessly!
  await prisma.user.upsert({
    where: { email },
    update: {
      ssoId: id,
      name,
      role,
      departmentId
    },
    create: {
      ssoId: id,
      email,
      name,
      role,
      departmentId,
      isActive: true, // Auto-activate
      notifEnabled: true,
      twoFAEnabled: false
    }
  })
}
