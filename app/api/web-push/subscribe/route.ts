import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, subscription } = body

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Check if subscription already exists based on endpoint
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    })

    if (existing) {
      // Always update keys, as the browser might reuse the endpoint but generate new encryption keys
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { 
          userId,
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || ''
        },
      })
      return NextResponse.json({ success: true, message: 'Updated subscription' })
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
      },
    })

    return NextResponse.json({ success: true, message: 'Subscribed successfully' })
  } catch (error: any) {
    console.error('Web Push Subscribe Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
