import { NextResponse, type NextRequest } from 'next/server'
import { isSsoConfigured, verifyLogoutToken } from '@/lib/auth/oidc'
import { revokeSessionsFromSso } from '@/lib/auth/session'

const noStore = { 'Cache-Control': 'no-store' }

/**
 * POST /auth/sso/backchannel-logout — called server-to-server by the HNS SSO.
 * Not behind the proxy and has no CSRF/auth check: the signed logout_token is
 * the authentication. Revokes every local session with the same `sid`.
 */
export async function POST(request: NextRequest) {
  if (!isSsoConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 400, headers: noStore })
  }

  let logoutToken: string | null = null
  try {
    const form = await request.formData()
    const value = form.get('logout_token')
    logoutToken = typeof value === 'string' ? value : null
  } catch {
    logoutToken = null
  }
  if (!logoutToken) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: noStore })
  }

  try {
    const target = await verifyLogoutToken(logoutToken)
    await revokeSessionsFromSso(target)
    return new NextResponse(null, { status: 200, headers: noStore })
  } catch (err) {
    console.error('[auth] rejected logout_token:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: noStore })
  }
}
