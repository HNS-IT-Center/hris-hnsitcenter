import { NextRequest, NextResponse } from 'next/server'

/**
 * Validate cron job requests using the CRON_SECRET env variable.
 * Vercel automatically sends this as: Authorization: Bearer <CRON_SECRET>
 *
 * @returns NextResponse with 401 if invalid, or null if valid
 */
export function validateCronAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null // null = valid, continue
}
