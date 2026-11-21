import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCronAuth } from '@/lib/utils/cron-auth'
import { HRD_AUDIENCE, formatDay, notify } from '@/lib/notify'
import { getAttendancePolicyRows, pickAttendanceRules } from '@/lib/policy'

export async function GET(req: Request) {
  try {
    const unauthorized = validateCronAuth(req)
    if (unauthorized) return unauthorized

    // Get today's date in UTC that represents WIB today
    const now = new Date()
    const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

    // Find attendances that have checkInTime but NO checkOutTime for today
    const forgottenAttendances = await prisma.attendance.findMany({
      where: {
        date: target,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      include: {
        user: true,
      }
    })

    if (forgottenAttendances.length === 0) {
      return NextResponse.json({ success: true, message: 'No forgotten checkouts found' })
    }

    // Penalty from the attendance policy in effect that day, per store
    const policyRows = await getAttendancePolicyRows()
    const dayKey = target.toISOString().slice(0, 10)

    const updates = []
    for (const att of forgottenAttendances) {
      // Set status to FORGOT_CHECKOUT and add a penalty
      const { forgotPenalty } = pickAttendanceRules(policyRows, att.storeId, dayKey)
      updates.push(prisma.attendance.update({
        where: { id: att.id },
        data: {
          status: 'FORGOT_CHECKOUT',
          penaltyAmount: { increment: forgotPenalty },
        }
      }))
      
      // Also generate Attention Flag
      updates.push(prisma.attentionFlag.create({
        data: {
          userId: att.userId,
          type: 'forgot_checkout',
          relatedId: att.id,
          description: `Lupa check-out: karyawan tidak melakukan absen pulang pada tanggal ${target.toISOString().split('T')[0]}`,
        }
      }))
    }

    await prisma.$transaction(updates)

    const day = formatDay(target)
    await notify(
      { userIds: forgottenAttendances.map((a) => a.userId) },
      {
        category: 'ATTENDANCE',
        title: 'Anda Lupa Absen Pulang',
        body: `Tidak ada absen pulang pada ${day}. Status ditandai Lupa Check-out. Hubungi HRD bila ini keliru.`,
        url: '/performance',
      }
    )
    await notify(
      { roles: HRD_AUDIENCE },
      {
        category: 'ATTENDANCE',
        title: 'Karyawan Lupa Absen Pulang',
        body: `${forgottenAttendances.length} karyawan tidak absen pulang pada ${day}: ${forgottenAttendances.map((a) => a.user.name).slice(0, 5).join(', ')}${forgottenAttendances.length > 5 ? ', dan lainnya' : ''}.`,
        url: '/hrd/anomalies',
      }
    )

    return NextResponse.json({ success: true, processed: forgottenAttendances.length })
  } catch (error: any) {
    console.error('Auto Checkout Cron Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
