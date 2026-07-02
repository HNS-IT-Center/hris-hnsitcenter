import webpush from 'web-push'
import { prisma } from './prisma'

try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
} catch (error) {
  console.warn('Failed to set VAPID details. Ensure VAPID keys are correct.', error)
}

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId }
    })
    
    if (subs.length === 0) return

    const notifications = subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify(payload)
        )
      } catch (err: any) {
        // if status 410 (Gone), the subscription is no longer valid
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        } else {
          console.error('Push error:', err)
        }
      }
    })

    await Promise.all(notifications)
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }
}

export async function sendPushNotificationToRole(roles: ('HRD' | 'BOSS' | 'ADMIN' | 'EMPLOYEE')[], payload: { title: string; body: string; url?: string }) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true }
    })
    
    if (users.length === 0) return

    const notifications = users.map(user => sendPushNotification(user.id, payload))
    await Promise.all(notifications)
  } catch (error) {
    console.error('Failed to send push notification to roles:', error)
  }
}

export { webpush }
