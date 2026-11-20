import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth'

/**
 * Register this browser's push subscription for the signed-in user.
 * The user comes from the session, never from the request body.
 */
export async function POST(req: Request) {
  let userId: string
  try {
    userId = (await getServerUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { subscription } = await req.json()
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 512 || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // A browser endpoint belongs to whoever signed in on it last; keys may rotate.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth, userAgent: req.headers.get('user-agent') },
      create: { userId, endpoint, p256dh, auth, userAgent: req.headers.get('user-agent') },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Web Push Subscribe Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
