import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/web-push'

/**
 * Cron: Shift Reminders
 * Run every 5 minutes (every-5 cron expression).
 *
 * Sends two types of push notifications:
 *   1. Check-in reminder  — 30 mins before shift start
 *   2. Check-out reminder — at shift end time
 *
 * On Vercel: triggered by vercel.json cron config.
 * On Hostinger (after migration), add to crontab:
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://app.hnsitcenter.id/api/cron/shift-reminders
 */
export async function GET(req: Request) {
  try {
    // Security check
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    // Current WIB time as HH:mm
    const wibFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const wibNowStr = wibFormatter.format(now) // e.g. "07:30"
    const [nowHour, nowMin] = wibNowStr.split(':').map(Number)
    const nowTotalMins = nowHour * 60 + nowMin

    // Today at midnight UTC (represents WIB calendar date)
    const yyyyMmDd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
    const todayUTC = new Date(`${yyyyMmDd}T00:00:00Z`)

    // Fetch all active users with a shift and push subscriptions
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        shift: { isNot: null },
        pushSubscriptions: { some: {} },
      },
      include: {
        shift: true,
        pushSubscriptions: true,
        attendances: {
          where: { date: todayUTC },
          take: 1,
        },
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { lte: todayUTC },
            endDate: { gte: todayUTC },
            type: { in: ['ANNUAL_LEAVE', 'SICK', 'PERSONAL'] },
          },
          take: 1,
        },
      },
    })

    const checkInSent: string[] = []
    const checkOutSent: string[] = []

    for (const user of users) {
      if (!user.shift) continue

      // Skip users on approved full-day leave
      if (user.leaveRequests.length > 0) continue

      const todayAttendance = user.attendances[0] ?? null
      const [startHour, startMin] = user.shift.startTime.split(':').map(Number)
      const [endHour, endMin] = user.shift.endTime.split(':').map(Number)
      const shiftStartMins = startHour * 60 + startMin
      const shiftEndMins = endHour * 60 + endMin

      // Window: cron runs every 5 min, so we check a 5-min window to avoid missing the target
      const WINDOW = 5

      // 1. Check-in reminder: send if now is 30–35 mins before shift start
      //    and user has NOT yet checked in today
      const minsUntilStart = shiftStartMins - nowTotalMins
      if (minsUntilStart >= 30 && minsUntilStart < 30 + WINDOW && !todayAttendance) {
        await sendPushNotification(user.id, {
          title: 'Waktu Absen Masuk Dibuka',
          body: `Check-in untuk shift ${user.shift.startTime} sudah bisa dilakukan sekarang. Segera absen!`,
          url: '/attendance',
        })
        checkInSent.push(user.id)
      }

      // 2. Check-out reminder: send if now is within the 5-min window of shift end
      //    and user has checked in but NOT yet checked out
      const minsUntilEnd = shiftEndMins - nowTotalMins
      if (minsUntilEnd >= 0 && minsUntilEnd < WINDOW && todayAttendance?.checkInTime && !todayAttendance?.checkOutTime) {
        await sendPushNotification(user.id, {
          title: 'Waktu Absen Pulang Dibuka',
          body: `Shift kamu berakhir pukul ${user.shift.endTime}. Jangan lupa absen pulang!`,
          url: '/attendance',
        })
        checkOutSent.push(user.id)
      }
    }

    return NextResponse.json({
      success: true,
      time: wibNowStr,
      checkInRemindersSent: checkInSent.length,
      checkOutRemindersSent: checkOutSent.length,
    })
  } catch (error: any) {
    console.error('Shift Reminders Cron Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
