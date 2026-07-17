'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth'
import { sendPushNotification } from '@/lib/web-push'

export type BroadcastWithFilters = Awaited<ReturnType<typeof getBroadcasts>>[number]

/**
 * Fetches all broadcasts ordered by creation date descending.
 */
export async function getBroadcasts() {
  return prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      filterDepts: true,
      filterStores: true,
      filterShifts: true,
      filterUsers: { include: { user: { select: { name: true } } } },
    },
  })
}

/**
 * Creates a new Broadcast record with filter records.
 * If scheduledAt is null, the broadcast cron will pick it up immediately on next run.
 */
export async function createBroadcast(data: {
  title: string
  message: string
  tag: 'NOTICE' | 'EVENT' | 'URGENT'
  scheduledAt: Date | null
  allEmployees: boolean
  departmentIds: string[]
  storeIds: string[]
  shiftIds: string[]
  userIds: string[]
}) {
  try {
    const ssoUser = await getServerUser()
    if (!ssoUser) return { success: false, error: 'Unauthorized' }
    const creator = await prisma.user.findUnique({ where: { email: ssoUser.email } })
    if (!creator || !['HRD', 'BOSS', 'ADMIN'].includes(creator.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!data.title.trim()) return { success: false, error: 'Judul tidak boleh kosong.' }
    if (!data.message.trim()) return { success: false, error: 'Pesan tidak boleh kosong.' }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        tag: data.tag,
        scheduledAt: data.scheduledAt,
        isSent: false,
        createdById: creator.id,
        filterDepts: data.allEmployees ? undefined : {
          create: data.departmentIds.map(id => ({ departmentId: id }))
        },
        filterStores: data.allEmployees ? undefined : {
          create: data.storeIds.map(id => ({ storeId: id }))
        },
        filterShifts: data.allEmployees ? undefined : {
          create: data.shiftIds.map(id => ({ shiftId: id }))
        },
        filterUsers: data.allEmployees ? undefined : {
          create: data.userIds.map(id => ({ userId: id }))
        },
      }
    })

    // If no scheduled time (send immediately), trigger sending right now
    if (!data.scheduledAt) {
      await deliverBroadcast(broadcast.id, data.allEmployees)
    }

    revalidatePath('/hrd/broadcast')
    return { success: true, broadcastId: broadcast.id }
  } catch (error: any) {
    console.error('createBroadcast error:', error)
    return { success: false, error: 'Gagal membuat broadcast.' }
  }
}

/**
 * Core delivery function: resolves recipients from filters, sends push, marks as sent.
 * Called directly for immediate sends, or by the cron for scheduled ones.
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

  // Send push notifications
  const tagEmoji: Record<string, string> = {
    NOTICE: '[NOTICE]',
    EVENT: '[EVENT]',
    URGENT: '[URGENT]',
  }
  const prefix = tagEmoji[broadcast.tag] ?? ''

  await Promise.all(
    recipients.map(r =>
      sendPushNotification(r.id, {
        title: `${prefix} ${broadcast.title}`,
        body: broadcast.message,
        url: '/dashboard',
      })
    )
  )

  // Mark as sent
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { isSent: true, sentAt: new Date() },
  })
}
