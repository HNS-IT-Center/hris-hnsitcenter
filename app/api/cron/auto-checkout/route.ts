import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    // Basic authorization check
    const authHeader = req.headers.get('authorization')
    const cronsSecret = process.env.CRON_SECRET
    
    if (cronsSecret && authHeader !== `Bearer ${cronsSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const updates = []
    for (const att of forgottenAttendances) {
      // Set status to FORGOT_CHECKOUT and add a penalty
      updates.push(prisma.attendance.update({
        where: { id: att.id },
        data: {
          status: 'FORGOT_CHECKOUT',
          penaltyAmount: { increment: 20000 },
        }
      }))
      
      // Also generate Attention Flag
      updates.push(prisma.attentionFlag.create({
        data: {
          userId: att.userId,
          type: 'SYSTEM_ANOMALY',
          title: 'Lupa Check-out',
          description: `Karyawan tidak melakukan absen pulang pada tanggal ${target.toISOString().split('T')[0]}`,
        }
      }))
    }

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true, processed: forgottenAttendances.length })
  } catch (error: any) {
    console.error('Auto Checkout Cron Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
