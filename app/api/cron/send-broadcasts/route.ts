import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deliverBroadcast } from '@/app/actions/broadcast'

/**
 * Cron: Send Scheduled Broadcasts
 * Runs every 5 minutes (every-5 cron expression).
 *
 * Finds all Broadcasts where:
 *   - scheduledAt <= now (the scheduled time has passed)
 *   - isSent = false (not yet delivered)
 * and delivers them.
 *
 * On Hostinger (after migration), add to crontab:
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://app.hnsitcenter.id/api/cron/send-broadcasts
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all due, unsent broadcasts
    const dueBroadcasts = await prisma.broadcast.findMany({
      where: {
        isSent: false,
        scheduledAt: { lte: now },
      },
      select: {
        id: true,
        filterDepts: true,
        filterStores: true,
        filterShifts: true,
        filterUsers: true,
      }
    })

    if (dueBroadcasts.length === 0) {
      return NextResponse.json({ success: true, message: 'No broadcasts due', sent: 0 })
    }

    let sent = 0
    for (const b of dueBroadcasts) {
      const hasFilters =
        b.filterDepts.length > 0 ||
        b.filterStores.length > 0 ||
        b.filterShifts.length > 0 ||
        b.filterUsers.length > 0
      await deliverBroadcast(b.id, !hasFilters)
      sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch (error: any) {
    console.error('Send Broadcasts Cron Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
