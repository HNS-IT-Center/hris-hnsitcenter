import { NextResponse, type NextRequest } from 'next/server'
import * as oidc from 'openid-client'
import { SSO_SCOPE, SSO_SCOPE_REMEMBER, appUrl, getOidcConfig, isSsoConfigured, safeReturnTo, ssoEnv } from '@/lib/auth/oidc'
import { saveLoginFlow } from '@/lib/auth/flow'

/**
 * GET /auth/sso/login — start the HNS SSO login.
 * Also the "Initiate Login URL" registered in the SSO portal.
 *
 * Query: return_to (relative path), remember=1 (offline_access, "tetap masuk
 * di perangkat ini"), login_hint.
 */
export async function GET(request: NextRequest) {
  if (!isSsoConfigured()) {
    return NextResponse.redirect(new URL('/login?error=sso_not_configured', request.nextUrl))
  }

  const params = request.nextUrl.searchParams
  const returnTo = safeReturnTo(params.get('return_to'))
  const rememberDevice = params.get('remember') === '1'
  const loginHint = params.get('login_hint')

  try {
    const config = await getOidcConfig()
    const codeVerifier = oidc.randomPKCECodeVerifier()
    const state = oidc.randomState()
    const nonce = oidc.randomNonce()

    await saveLoginFlow({ state, nonce, codeVerifier, returnTo, rememberDevice })

    const authorizeUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: ssoEnv().redirectUri,
      scope: rememberDevice ? SSO_SCOPE_REMEMBER : SSO_SCOPE,
      code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      state,
      nonce,
      ...(loginHint ? { login_hint: loginHint.slice(0, 255) } : {}),
    })
    return NextResponse.redirect(authorizeUrl)
  } catch (err) {
    console.error('[auth] cannot start SSO login:', err instanceof Error ? err.message : err)
    return NextResponse.redirect(appUrl('/login?error=sso_unreachable'))
  }
}
