'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/guards'

/** The signed-in user's latest notifications and unread count. */
export async function getAppNotifications() {
  try {
    const user = await requireUser()
    const [notifications, unreadCount] = await Promise.all([
      prisma.appNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.appNotification.count({ where: { userId: user.id, isRead: false } }),
    ])
    return { success: true as const, data: notifications, unreadCount }
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return { success: false as const, error: 'Gagal memuat notifikasi.' }
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const user = await requireUser()
    await prisma.appNotification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menandai notifikasi.' }
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const user = await requireUser()
    await prisma.appNotification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menandai notifikasi.' }
  }
}
