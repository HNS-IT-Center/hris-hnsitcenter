'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAppNotifications(userId: string) {
  try {
    const notifications = await prisma.appNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // limit to last 20 notifications
    })
    return { success: true, data: notifications }
  } catch (error: any) {
    console.error('Failed to get notifications:', error)
    return { success: false, error: error.message }
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await prisma.appNotification.update({
      where: { id },
      data: { isRead: true }
    })
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
