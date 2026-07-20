import { prisma } from '@/lib/prisma'

/**
 * Generates the next Employee ID in the format HNS-XXXX.
 * E.g. HNS-0001, HNS-0002.
 */
export async function generateNextEmployeeId(): Promise<string> {
  const lastUser = await prisma.user.findFirst({
    where: {
      employeeId: {
        startsWith: 'HNS-',
      },
    },
    orderBy: {
      employeeId: 'desc',
    },
    select: {
      employeeId: true,
    },
  })

  if (!lastUser || !lastUser.employeeId) {
    return 'HNS-0001'
  }

  // Extract the numeric part (e.g. "HNS-0042" -> "0042")
  const numStr = lastUser.employeeId.replace('HNS-', '')
  const nextNum = parseInt(numStr, 10) + 1

  return `HNS-${String(nextNum).padStart(4, '0')}`
}
