import { headers } from 'next/headers'

export interface SSOUser {
  id: string
  email: string
  role: string       // 'EMPLOYEE' | 'HRD' | 'BOSS' — injected by middleware
  departmentId: string | null
  positionId: string | null
}

/**
 * Read the current SSO user from injected request headers.
 * Safe to call from any Server Component or Server Action.
 *
 * The middleware (middleware.ts) verifies the sso_token JWT and injects
 * these headers for every authenticated request.
 *
 * @throws Error if called from a non-authenticated route (no headers present)
 */
export async function getServerUser(): Promise<SSOUser> {
  const h = await headers()
  const id = h.get('x-user-id')
  const email = h.get('x-user-email')
  const role = h.get('x-user-role') ?? 'EMPLOYEE'
  const departmentId = h.get('x-user-dept')
  const positionId = h.get('x-user-position')

  if (!id || !email) {
    throw new Error('No authenticated user found in request headers. Is this route protected by middleware?')
  }

  return {
    id,
    email,
    role: role.toUpperCase(),
    departmentId: departmentId || null,
    positionId: positionId || null,
  }
}

/**
 * Check if the current user has one of the given roles.
 * Returns false instead of throwing if no user is found.
 */
export async function hasRole(...roles: string[]): Promise<boolean> {
  try {
    const user = await getServerUser()
    return roles.map((r) => r.toUpperCase()).includes(user.role.toUpperCase())
  } catch {
    return false
  }
}
