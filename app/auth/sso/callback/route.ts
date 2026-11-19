import { NextResponse, type NextRequest } from 'next/server'
import * as oidc from 'openid-client'
import { appUrl, getOidcConfig, isSsoConfigured, safeReturnTo, ssoEnv, verifyIdToken } from '@/lib/auth/oidc'
import { safeEqual, takeLoginFlow } from '@/lib/auth/flow'
import { createSession } from '@/lib/auth/session'
import { linkOrProvisionSsoUser } from '@/lib/auth/sync'

/** SSO error codes we show a specific message for on /login. */
const KNOWN_SSO_ERRORS = new Set(['access_denied', 'invalid_scope', 'login_required'])

function toLogin(error: string, extra?: Record<string, string>) {
  const url = appUrl('/login')
  url.searchParams.set('error', error)
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v)
  return NextResponse.redirect(url)
}

/**
 * GET /auth/sso/callback — finish the HNS SSO login.
 * Checks state (timing-safe) and iss, exchanges the code with the PKCE
 * verifier, verifies the id_token (JWKS, iss, aud, azp, exp, nonce), links or
 * provisions the local user and starts a fresh local session.
 */
export async function GET(request: NextRequest) {
  if (!isSsoConfigured()) return toLogin('sso_not_configured')

  const flow = await takeLoginFlow()
  const params = request.nextUrl.searchParams

  const ssoError = params.get('error')
  if (ssoError) {
    return toLogin(KNOWN_SSO_ERRORS.has(ssoError) ? ssoError : 'sso_error')
  }

  if (!flow) return toLogin('flow_expired')

  const state = params.get('state') ?? ''
  if (!safeEqual(state, flow.state)) return toLogin('invalid_state')

  // Build the callback URL from the registered redirect URI, never from request.url
  // (behind the reverse proxy that is the internal address).
  const env = ssoEnv()
  const callbackUrl = new URL(env.redirectUri)
  callbackUrl.search = request.nextUrl.search

  let tokens: Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>
  let claims: Awaited<ReturnType<typeof verifyIdToken>>
  try {
    const config = await getOidcConfig()
    tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    })
    if (!tokens.id_token) throw new Error('No id_token in token response')
    claims = await verifyIdToken(tokens.id_token, flow.nonce)
  } catch (err) {
    console.error('[auth] SSO callback failed:', err instanceof Error ? err.message : err)
    return toLogin('callback_failed')
  }

  const link = await linkOrProvisionSsoUser(claims)
  if (!link.ok) return toLogin(link.reason)
  if (!link.isActive) return toLogin('account_disabled')

  await createSession({
    userId: link.userId,
    tokens,
    ssoSid: claims.sid,
    rememberDevice: flow.rememberDevice,
    userAgent: request.headers.get('user-agent'),
  })

  return NextResponse.redirect(appUrl(safeReturnTo(flow.returnTo)))
}
