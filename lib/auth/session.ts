import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import * as oidc from 'openid-client'
import { prisma } from '@/lib/prisma'
import { getOidcConfig, isInvalidGrant, verifyIdToken } from '@/lib/auth/oidc'

/**
 * Server-side sessions for the HNS SSO login.
 *
 * The cookie holds a random token. The database row (AuthSession) is keyed by
 * its SHA-256 hash and holds the SSO tokens, so a leaked database does not
 * yield usable cookies and tokens never reach the browser.
 */

export const SESSION_COOKIE = 'hris_session'

/** Upper bound for the cookie of a "keep me signed in" session. The DB row decides the real end. */
const REMEMBER_COOKIE_MAX_AGE = 90 * 24 * 60 * 60
/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_MS = 60 * 1000
/** How long one request may hold the refresh lock. */
const REFRESH_LOCK_MS = 20 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function cookieOptions(rememberDevice: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(rememberDevice ? { maxAge: REMEMBER_COOKIE_MAX_AGE } : {}),
  }
}

type TokenSet = oidc.TokenEndpointResponse & { refresh_token_expires_in?: number }

function expiryFromNow(seconds: number | undefined): Date | null {
  return typeof seconds === 'number' && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null
}

export async function createSession(params: {
  userId: string
  tokens: TokenSet
  ssoSid: string | undefined
  rememberDevice: boolean
  userAgent: string | null
}) {
  const { userId, tokens, ssoSid, rememberDevice, userAgent } = params
  const cookieStore = await cookies()

  // Regenerate: a fresh token per login, and the browser's previous session is ended.
  const previous = cookieStore.get(SESSION_COOKIE)?.value
  if (previous) {
    await prisma.authSession.updateMany({
      where: { id: hashToken(previous), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  const accessTokenExpiresAt = expiryFromNow(tokens.expires_in) ?? new Date(Date.now() + 600 * 1000)
  // Without refresh_token_expires_in, fall back to the SSO session's 12 h absolute limit.
  const expiresAt = expiryFromNow(tokens.refresh_token_expires_in) ?? new Date(Date.now() + 12 * 60 * 60 * 1000)

  const token = randomBytes(32).toString('base64url')
  await prisma.authSession.create({
    data: {
      id: hashToken(token),
      userId,
      ssoSid: ssoSid ?? null,
      idToken: tokens.id_token ?? '',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      accessTokenExpiresAt,
      expiresAt,
      rememberDevice,
      userAgent,
    },
  })

  cookieStore.set(SESSION_COOKIE, token, cookieOptions(rememberDevice))

  // Housekeeping: drop rows that ended more than a week ago.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.authSession
    .deleteMany({ where: { OR: [{ expiresAt: { lt: weekAgo } }, { revokedAt: { lt: weekAgo } }] } })
    .catch(() => {})
}

const sessionInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      departmentId: true,
      departmentName: true,
      ssoPositionId: true,
      positionName: true,
      department: { select: { name: true } },
    },
  },
} as const

async function loadSession(id: string) {
  return prisma.authSession.findUnique({ where: { id }, include: sessionInclude })
}

type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>

/**
 * Refresh the SSO tokens when the access token is about to expire.
 * Refresh tokens rotate and reusing an old one revokes the whole chain, so a
 * DB lock makes sure only one request refreshes a session at a time; the
 * others keep using the current (still valid) tokens.
 *
 * Returns null when the SSO says the session is over (invalid_grant).
 */
async function refreshIfNeeded(session: LoadedSession): Promise<LoadedSession | null> {
  if (!session.refreshToken) return session
  if (session.accessTokenExpiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) return session

  const now = new Date()
  const lock = await prisma.authSession.updateMany({
    where: {
      id: session.id,
      revokedAt: null,
      OR: [{ refreshLockedUntil: null }, { refreshLockedUntil: { lt: now } }],
    },
    data: { refreshLockedUntil: new Date(now.getTime() + REFRESH_LOCK_MS) },
  })
  if (lock.count === 0) return session

  try {
    const config = await getOidcConfig()
    const tokens = (await oidc.refreshTokenGrant(config, session.refreshToken)) as TokenSet
    if (tokens.id_token) await verifyIdToken(tokens.id_token)

    return await prisma.authSession.update({
      where: { id: session.id },
      data: {
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiryFromNow(tokens.expires_in) ?? new Date(Date.now() + 600 * 1000),
        refreshToken: tokens.refresh_token ?? session.refreshToken,
        idToken: tokens.id_token ?? session.idToken,
        expiresAt: expiryFromNow(tokens.refresh_token_expires_in) ?? session.expiresAt,
        refreshLockedUntil: null,
      },
      include: sessionInclude,
    })
  } catch (err) {
    if (isInvalidGrant(err)) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), refreshLockedUntil: null },
      })
      return null
    }
    // SSO unreachable or a transient error: keep the session and try again on a later request.
    console.error('[auth] token refresh failed:', err instanceof Error ? err.message : err)
    await prisma.authSession
      .update({ where: { id: session.id }, data: { refreshLockedUntil: null } })
      .catch(() => {})
    return session
  }
}

/**
 * The current, valid session with its user, or null.
 * Cached per request, so layouts, pages and actions share one lookup.
 */
export const getCurrentSession = cache(async (): Promise<LoadedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await loadSession(hashToken(token))
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null

  return refreshIfNeeded(session)
})

/**
 * End the current browser's session: revoke the row and clear the cookie.
 * Returns the tokens still needed for SSO logout (id_token_hint, revocation).
 */
export async function endCurrentSession(): Promise<{ idToken: string; refreshToken: string | null } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  cookieStore.delete(SESSION_COOKIE)
  if (!token) return null

  const session = await prisma.authSession.findUnique({ where: { id: hashToken(token) } })
  if (!session) return null
  if (!session.revokedAt) {
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
  }
  return { idToken: session.idToken, refreshToken: session.refreshToken }
}

/** Back-channel logout: revoke every local session of an SSO session (or of a user). */
export async function revokeSessionsFromSso({ sid, sub }: { sid?: string; sub?: string }): Promise<number> {
  const where = sid ? { ssoSid: sid } : { user: { ssoSub: sub } }
  const result = await prisma.authSession.updateMany({
    where: { ...where, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count
}
