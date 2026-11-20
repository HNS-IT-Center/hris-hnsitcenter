import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Must match SESSION_COOKIE in lib/auth/session.ts (not imported: that module is server-only and touches the DB). */
const SESSION_COOKIE = 'hris_session'

/**
 * Auth Proxy (Next.js 16+) — optimistic check only.
 *
 * Login goes through the HNS SSO (OpenID Connect, auth.hnsitcenter.id) and
 * ends in a server-side session (lib/auth/session.ts) whose random token is in
 * the `hris_session` cookie. This proxy only sends visitors without that
 * cookie to /login. The real check (session valid, not revoked by back-channel
 * logout, tokens refreshed, user active, role) happens on the server in
 * getServerUser() (lib/auth.ts) and in app/(dashboard)/hrd/layout.tsx.
 *
 * Local dev without SSO_CLIENT_ID: no redirect, getServerUser() acts as the
 * seeded dev HRD user.
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next()

  const ssoConfigured = !!process.env.SSO_CLIENT_ID
  if (!ssoConfigured && process.env.NODE_ENV === 'development') return NextResponse.next()

  const { pathname, search } = request.nextUrl
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Public origin comes from the registered redirect URI, not the Host header (reverse proxy).
  const base = process.env.SSO_REDIRECT_URI || request.nextUrl.origin
  const loginUrl = new URL('/login', base)
  loginUrl.searchParams.set('return_to', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

/**
 * Route Matcher
 *
 * Protected routes: the dashboard pages and the app's API routes.
 *
 * Public routes (NOT matched):
 * - / (redirects to /dashboard), /login, /offline
 * - /auth/sso/* (login, callback, logout, back-channel logout)
 * - /api/cron/* (secured by CRON_SECRET header)
 * - Static assets (_next, public files, icons, manifest)
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/attendance/:path*',
    '/leave/:path*',
    '/performance/:path*',
    '/profile/:path*',
    '/hrd/:path*',
    '/api/protected/:path*',
    '/api/attendance/:path*',
    '/api/leave/:path*',
    '/api/overtime/:path*',
    '/api/employee/:path*',
    '/api/department/:path*',
    '/api/shift/:path*',
    '/api/store/:path*',
    '/api/recruitment/:path*',
    '/api/notification/:path*',
    '/api/broadcast/:path*',
    '/api/performance/:path*',
    '/api/hrd/:path*',
    '/api/upload/:path*',
    '/api/web-push/:path*',
  ],
}
