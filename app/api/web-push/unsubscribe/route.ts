import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth'

/** Remove one of the signed-in user's own push subscriptions. */
export async function POST(req: Request) {
  let userId: string
  try {
    userId = (await getServerUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint } = await req.json()
    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Web Push Unsubscribe Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
