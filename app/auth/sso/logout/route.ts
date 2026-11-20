import { NextResponse, type NextRequest } from 'next/server'
import * as oidc from 'openid-client'
import { appOrigin, appUrl, getOidcConfig, isSsoConfigured, ssoEnv } from '@/lib/auth/oidc'
import { endCurrentSession } from '@/lib/auth/session'

/**
 * Same-origin check (the app's CSRF protection for this POST). Browsers send
 * Origin on form POSTs; Sec-Fetch-Site covers the rare case where it is missing.
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (origin) return isSsoConfigured() ? origin === appOrigin() : origin === request.nextUrl.origin
  return request.headers.get('sec-fetch-site') === 'same-origin'
}

/**
 * POST /auth/sso/logout — end the local session first, revoke the refresh
 * token, then send the browser to the SSO end-session endpoint.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 })
  }

  // The cookie is cleared even if the database is unavailable.
  const ended = await endCurrentSession().catch((err) => {
    console.error('[auth] could not revoke local session:', err instanceof Error ? err.message : err)
    return null
  })

  if (!isSsoConfigured()) {
    return NextResponse.redirect(new URL('/login', request.nextUrl), 303)
  }
  if (!ended) {
    return NextResponse.redirect(appUrl('/login'), 303)
  }

  try {
    const config = await getOidcConfig()
    if (ended.refreshToken) {
      // Best effort: the SSO ends the chain itself on logout, but a remembered
      // device session only ends through revocation.
      await oidc.tokenRevocation(config, ended.refreshToken, { token_type_hint: 'refresh_token' }).catch((err) => {
        console.error('[auth] refresh token revocation failed:', err instanceof Error ? err.message : err)
      })
    }
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      id_token_hint: ended.idToken,
      post_logout_redirect_uri: ssoEnv().postLogoutRedirectUri,
    })
    return NextResponse.redirect(endSessionUrl, 303)
  } catch (err) {
    console.error('[auth] SSO logout redirect failed:', err instanceof Error ? err.message : err)
    return NextResponse.redirect(appUrl('/login'), 303)
  }
}
