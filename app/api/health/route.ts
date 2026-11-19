import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Health check for Docker/Dokploy and uptime monitors. Public (not in the proxy matcher).
 *
 * GET /api/health        -> answers from the process alone (Docker HEALTHCHECK:
 *                           restarting the app would not bring a database back).
 * GET /api/health?db=1   -> also runs SELECT 1. Never returns error text.
 */
export async function GET(req: Request) {
  const checkDb = new URL(req.url).searchParams.get('db') === '1'
  if (!checkDb) return NextResponse.json({ ok: true })

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: true })
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 })
  }
}
