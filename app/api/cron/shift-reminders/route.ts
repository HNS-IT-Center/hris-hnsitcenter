import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCronAuth } from '@/lib/utils/cron-auth'
import { notify } from '@/lib/notify'
import { getScheduleForRange } from '@/lib/schedule'
import { dateKeyToStoredDay, wibDateKey } from '@/lib/utils/date'

/**
 * Cron: Shift Reminders
 * Run every 5 minutes (every-5 cron expression).
 *
 * Sends two types of push notifications:
 *   1. Check-in reminder  — 30 mins before shift start
 *   2. Check-out reminder — at shift end time
 *
 * Scheduled on the VPS (Dokploy), every 5 minutes:
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://absensi.hnsitcenter.id/api/cron/shift-reminders
 */
export async function GET(req: Request) {
  try {
    // Security check
    const unauthorized = validateCronAuth(req)
    if (unauthorized) return unauthorized

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

    // Today as a WIB day; attendance dates are stored as midnight UTC.
    const todayKey = wibDateKey(now)
    const todayUTC = dateKeyToStoredDay(todayKey)

    // Active users with push subscriptions. Their shift of the day comes from
    // the schedule resolver, so rotation, roster overrides, holidays and
    // approved leave are all taken into account.
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        pushSubscriptions: { some: {} },
      },
      select: {
        id: true,
        attendances: {
          where: { date: todayUTC },
          take: 1,
        },
      },
    })
    const schedules = await getScheduleForRange(users.map((u) => u.id), todayKey, todayKey)

    const checkInSent: string[] = []
    const checkOutSent: string[] = []

    for (const user of users) {
      const schedule = schedules.get(user.id)?.get(todayKey)
      // No reminder on holidays, days off and full-day leave, or without a shift.
      if (!schedule || schedule.status !== 'WORK' || !schedule.startTime || !schedule.endTime) continue

      const todayAttendance = user.attendances[0] ?? null
      const [startHour, startMin] = schedule.startTime.split(':').map(Number)
      const [endHour, endMin] = schedule.endTime.split(':').map(Number)
      const shiftStartMins = startHour * 60 + startMin
      const shiftEndMins = endHour * 60 + endMin

      // Window: cron runs every 5 min, so we check a 5-min window to avoid missing the target
      const WINDOW = 5

      // 1. Check-in reminder: send if now is 30–35 mins before shift start
      //    and user has NOT yet checked in today
      const minsUntilStart = shiftStartMins - nowTotalMins
      if (minsUntilStart >= 30 && minsUntilStart < 30 + WINDOW && !todayAttendance) {
        await notify({ userIds: [user.id] }, {
          category: 'SHIFT',
          title: 'Waktu Absen Masuk Dibuka',
          body: `Check-in untuk shift ${schedule.startTime} sudah bisa dilakukan sekarang. Segera absen!`,
          url: '/attendance',
        })
        checkInSent.push(user.id)
      }

      // 2. Check-out reminder: send if now is within the 5-min window of shift end
      //    and user has checked in but NOT yet checked out
      const minsUntilEnd = shiftEndMins - nowTotalMins
      if (minsUntilEnd >= 0 && minsUntilEnd < WINDOW && todayAttendance?.checkInTime && !todayAttendance?.checkOutTime) {
        await notify({ userIds: [user.id] }, {
          category: 'SHIFT',
          title: 'Waktu Absen Pulang Dibuka',
          body: `Shift kamu berakhir pukul ${schedule.endTime}. Jangan lupa absen pulang!`,
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
