import 'server-only'

import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notify'

/**
 * Core delivery function: resolves recipients from filters, sends push, marks as sent.
 * Called by createBroadcast for immediate sends, or by the cron for scheduled ones.
 * Lives outside app/actions so it is not callable from the browser.
 */
export async function deliverBroadcast(broadcastId: string, allEmployees?: boolean) {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      filterDepts: true,
      filterStores: true,
      filterShifts: true,
      filterUsers: true,
    }
  })

  if (!broadcast || broadcast.isSent) return

  const hasFilters =
    broadcast.filterDepts.length > 0 ||
    broadcast.filterStores.length > 0 ||
    broadcast.filterShifts.length > 0 ||
    broadcast.filterUsers.length > 0

  let recipients: { id: string }[] = []

  if (!hasFilters || allEmployees) {
    // Send to ALL active employees
    recipients = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    })
  } else {
    // Resolve recipients from filter sets (union)
    const recipientSet = new Set<string>()

    if (broadcast.filterDepts.length > 0) {
      const users = await prisma.user.findMany({
        where: { departmentId: { in: broadcast.filterDepts.map(f => f.departmentId) }, isActive: true },
        select: { id: true },
      })
      users.forEach(u => recipientSet.add(u.id))
    }
    if (broadcast.filterStores.length > 0) {
      const users = await prisma.user.findMany({
        where: { storeId: { in: broadcast.filterStores.map(f => f.storeId) }, isActive: true },
        select: { id: true },
      })
      users.forEach(u => recipientSet.add(u.id))
    }
    if (broadcast.filterShifts.length > 0) {
      const users = await prisma.user.findMany({
        where: { shiftId: { in: broadcast.filterShifts.map(f => f.shiftId) }, isActive: true },
        select: { id: true },
      })
      users.forEach(u => recipientSet.add(u.id))
    }
    if (broadcast.filterUsers.length > 0) {
      broadcast.filterUsers.forEach(f => recipientSet.add(f.userId))
    }

    recipients = Array.from(recipientSet).map(id => ({ id }))
  }

  const tagLabel: Record<string, string> = {
    NOTICE: 'Pengumuman',
    EVENT: 'Event',
    URGENT: 'Penting',
  }

  await notify(
    { userIds: recipients.map(r => r.id) },
    {
      category: 'ANNOUNCEMENT',
      title: `${tagLabel[broadcast.tag] ?? 'Pengumuman'}: ${broadcast.title}`,
      body: broadcast.message,
      url: '/dashboard',
      // Urgent announcements also go out by email.
      email: broadcast.tag === 'URGENT',
    }
  )

  // Mark as sent
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { isSent: true, sentAt: new Date() },
  })
}
