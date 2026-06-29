import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'


/** Decode the JWT_SECRET env variable once for Edge Runtime compatibility */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.')
  }
  return new TextEncoder().encode(secret)
}

/**
 * SSO JWT Proxy (Next.js 16+)
 *
 * Architecture:
 * 1. The SSO Identity Provider (sso.hnsitcenter.id) sets a cross-domain
 *    cookie named `sso_token` on the `.hnsitcenter.id` domain.
 * 2. This proxy verifies the token on every protected request.
 * 3. Valid tokens → inject user payload into request headers for
 *    downstream Server Components and API Routes.
 * 4. Missing / invalid / expired tokens → clear cookie & redirect to SSO.
 *
 * JWT Payload shape: { id, email, globalRole, positionId, departmentId }
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('sso_token')?.value

  // ── No token → handle redirect ────────────────────────────────────────────
  if (!token) {
    // In local development, cookies for .hnsitcenter.id won't be sent to localhost.
    // We provide a mock user to allow local development to continue.
    if (process.env.NODE_ENV === 'development') {
      const devHeaders = new Headers(request.headers)
      devHeaders.set('x-user-id', 'dev-user-id')
      devHeaders.set('x-user-email', 'dev@hnsitcenter.id')
      devHeaders.set('x-user-role', 'HRD')
      devHeaders.set('x-user-position-id', 'dev-pos-id')
      devHeaders.set('x-user-position-name', 'HR Manager')
      devHeaders.set('x-user-dept-id', 'dev-dept-id')
      devHeaders.set('x-user-dept-name', 'HR Department')
      return NextResponse.next({ request: { headers: devHeaders } })
    }

    const redirectUrl = request.nextUrl.href
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectUrl', redirectUrl)
    return NextResponse.redirect(loginUrl)
  }

  // ── Verify token ──────────────────────────────────────────────────────────
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    })

    // Extract user fields from JWT payload
    const userId = (payload.id as string) ?? ''
    const userEmail = (payload.email as string) ?? ''
    const userName = (payload.name as string) ?? ''
    const userRole = (payload.globalRole as string) ?? 'EMPLOYEE'
    const userPositionId = (payload.positionId as string) ?? ''
    const userPositionName = (payload.positionName as string) ?? ''
    const userDeptId = (payload.departmentId as string) ?? ''
    const userDeptName = (payload.departmentName as string) ?? ''

    // Clone and inject headers so Server Components can read user identity
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', userId)
    requestHeaders.set('x-user-email', userEmail)
    requestHeaders.set('x-user-name', userName)
    requestHeaders.set('x-user-role', userRole)
    requestHeaders.set('x-user-position-id', userPositionId)
    requestHeaders.set('x-user-position-name', userPositionName)
    requestHeaders.set('x-user-dept-id', userDeptId)
    requestHeaders.set('x-user-dept-name', userDeptName)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch (err) {
    // Token is expired, tampered, or invalid signature
    const isExpired =
      err instanceof Error && err.message.toLowerCase().includes('expired')

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', isExpired ? 'session_expired' : 'invalid_token')

    const response = NextResponse.redirect(loginUrl)
    // Clear the invalid cookie to prevent redirect loops
    response.cookies.delete('sso_token')
    return response
  }
}

/**
 * Route Matcher
 *
 * Protected routes:
 * - /dashboard and all sub-paths
 * - /attendance, /leave, /performance, /profile
 * - /hrd and all sub-paths (HRD-specific pages)
 * - /api/protected/* (protected API routes)
 * - /api/attendance, /api/leave, /api/employee, etc.
 *
 * Public routes (NOT matched, no auth required):
 * - / (root — redirects to /dashboard)
 * - /login (SSO redirect page)
 * - /offline (PWA offline fallback)
 * - /api/webhooks/* (Resend webhook, Cron — use their own auth)
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
  ],
}
