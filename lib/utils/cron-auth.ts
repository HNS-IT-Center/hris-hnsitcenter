import { NextResponse } from 'next/server'

/**
 * Validate cron job requests using the CRON_SECRET env variable.
 * The scheduler must send: Authorization: Bearer <CRON_SECRET>
 *
 * Fails closed: when CRON_SECRET is not set, every request is rejected
 * (otherwise "Bearer undefined" or a missing header would pass).
 *
 * @returns NextResponse with 401 if invalid, or null if valid
 */
export function validateCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null // null = valid, continue
}
