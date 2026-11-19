import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Short-lived state for one login attempt (state, nonce, PKCE verifier),
 * kept in an HttpOnly cookie scoped to /auth/sso for at most 10 minutes and
 * deleted by the callback.
 */

const FLOW_COOKIE = 'hris_sso_flow'
const FLOW_MAX_AGE = 600

export interface LoginFlow {
  state: string
  nonce: string
  codeVerifier: string
  returnTo: string
  rememberDevice: boolean
}

export async function saveLoginFlow(flow: LoginFlow) {
  const cookieStore = await cookies()
  cookieStore.set(FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth/sso',
    maxAge: FLOW_MAX_AGE,
  })
}

/** Read and delete the flow cookie. Single use. */
export async function takeLoginFlow(): Promise<LoginFlow | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(FLOW_COOKIE)?.value
  cookieStore.delete({ name: FLOW_COOKIE, path: '/auth/sso' })
  if (!raw) return null
  try {
    const flow = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<LoginFlow>
    if (typeof flow.state !== 'string' || typeof flow.nonce !== 'string' || typeof flow.codeVerifier !== 'string') return null
    return {
      state: flow.state,
      nonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      returnTo: typeof flow.returnTo === 'string' ? flow.returnTo : '/dashboard',
      rememberDevice: flow.rememberDevice === true,
    }
  } catch {
    return null
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
