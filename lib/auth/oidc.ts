import 'server-only'

import * as oidc from 'openid-client'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

/**
 * HNS SSO (OpenID Connect) client configuration.
 *
 * - Confidential client, client_secret_basic, PKCE S256 (see HNS-SSO-CLIENT.md).
 * - Every URL that goes back to the browser is built from SSO_REDIRECT_URI /
 *   SSO_POST_LOGOUT_REDIRECT_URI, never from request.url or the Host header:
 *   behind the reverse proxy those point at the internal address.
 */

export const SSO_SCOPE = 'openid profile email'
export const SSO_SCOPE_REMEMBER = `${SSO_SCOPE} offline_access`

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} environment variable is not set.`)
  return value
}

export function ssoEnv() {
  return {
    issuer: requireEnv('SSO_ISSUER').replace(/\/+$/, ''),
    clientId: requireEnv('SSO_CLIENT_ID'),
    clientSecret: requireEnv('SSO_CLIENT_SECRET'),
    redirectUri: requireEnv('SSO_REDIRECT_URI'),
    postLogoutRedirectUri: requireEnv('SSO_POST_LOGOUT_REDIRECT_URI'),
  }
}

/** True when the SSO client is configured. Local dev can run without it (see lib/auth.ts). */
export function isSsoConfigured(): boolean {
  return !!(process.env.SSO_ISSUER && process.env.SSO_CLIENT_ID && process.env.SSO_CLIENT_SECRET && process.env.SSO_REDIRECT_URI)
}

/** Public origin of this app, taken from the registered redirect URI. */
export function appOrigin(): string {
  return new URL(ssoEnv().redirectUri).origin
}

/** Absolute URL on this app's public origin. `path` must start with "/". */
export function appUrl(path: string): URL {
  return new URL(path, appOrigin())
}

// Discovery is cached for 5 minutes (same as the SSO's own cache header).
const DISCOVERY_TTL_MS = 5 * 60 * 1000
let cachedConfig: { promise: Promise<oidc.Configuration>; at: number } | null = null

export function getOidcConfig(): Promise<oidc.Configuration> {
  if (cachedConfig && Date.now() - cachedConfig.at < DISCOVERY_TTL_MS) return cachedConfig.promise

  const env = ssoEnv()
  const promise = oidc
    .discovery(
      new URL(env.issuer),
      env.clientId,
      { [oidc.clockTolerance]: 30 },
      oidc.ClientSecretBasic(env.clientSecret),
    )
    .catch((err) => {
      cachedConfig = null
      throw err
    })
  cachedConfig = { promise, at: Date.now() }
  return promise
}

// createRemoteJWKSet refetches by itself when it meets an unknown `kid` (key rotation).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${ssoEnv().issuer}/.well-known/jwks.json`))
  return jwks
}

export interface SsoIdClaims extends JWTPayload {
  sub: string
  sid?: string
  nonce?: string
  azp?: string
  name?: string
  preferred_username?: string
  email?: string
}

/**
 * Verify an id_token signature and claims against the JWKS.
 * openid-client already checks iss/aud/exp/nonce; this adds the RS256
 * signature check the SSO guide requires and checks `azp`.
 */
export async function verifyIdToken(idToken: string, expectedNonce?: string): Promise<SsoIdClaims> {
  const env = ssoEnv()
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: env.issuer,
    audience: env.clientId,
    algorithms: ['RS256'],
    clockTolerance: 30,
  })
  if (payload.azp !== undefined && payload.azp !== env.clientId) throw new Error('id_token azp mismatch')
  if (expectedNonce !== undefined && payload.nonce !== expectedNonce) throw new Error('id_token nonce mismatch')
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('id_token has no sub')
  return payload as SsoIdClaims
}

const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

/** Verify a back-channel logout_token. Throws when it is not acceptable. */
export async function verifyLogoutToken(logoutToken: string): Promise<{ sid?: string; sub?: string }> {
  const env = ssoEnv()
  const { payload } = await jwtVerify(logoutToken, getJwks(), {
    issuer: env.issuer,
    audience: env.clientId,
    typ: 'logout+jwt',
    algorithms: ['RS256'],
    maxTokenAge: '2 minutes',
    clockTolerance: 30,
  })
  const events = payload.events as Record<string, unknown> | undefined
  if (payload.nonce !== undefined) throw new Error('logout_token must not contain nonce')
  if (!events || typeof events !== 'object' || !(BACKCHANNEL_EVENT in events)) throw new Error('logout_token has no back-channel event')

  const sid = typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined
  const sub = typeof payload.sub === 'string' && payload.sub ? payload.sub : undefined
  if (!sid && !sub) throw new Error('logout_token has neither sid nor sub')
  return { sid, sub }
}

/** `invalid_grant` from the token endpoint: the SSO session (or device session) is over. */
export function isInvalidGrant(err: unknown): boolean {
  return err instanceof oidc.ResponseBodyError && err.error === 'invalid_grant'
}

/** Only accept relative paths for return_to, to prevent open redirects. */
export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/auth/sso')) return fallback
  return value
}
