import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint },
    })

    if (existing) {
      await prisma.pushSubscription.delete({
        where: { id: existing.id },
      })
    }

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error: any) {
    console.error('Web Push Unsubscribe Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
