import { headers } from 'next/headers'

export interface SSOUser {
  id: string
  email: string
  name: string
  globalRole: string
  role: string
  departmentId: string | null
  departmentName: string | null
  positionId: string | null
  positionName: string | null
}

/**
 * Read the current SSO user from injected request headers.
 * Safe to call from any Server Component or Server Action.
 *
 * The middleware (proxy.ts) verifies the sso_token JWT and injects
 * these headers for every authenticated request.
 *
 * @throws Error if called from a non-authenticated route (no headers present)
 */
export async function getServerUser(): Promise<SSOUser> {
  const h = await headers()
  const id = h.get('x-user-id')
  const email = h.get('x-user-email')
  const name = h.get('x-user-name') ?? email?.split('@')[0] ?? ''
  const globalRole = h.get('x-user-role') ?? 'EMPLOYEE'
  const departmentId = h.get('x-user-dept-id')
  const departmentName = h.get('x-user-dept-name')
  const positionId = h.get('x-user-position-id')
  const positionName = h.get('x-user-position-name')

  if (!id || !email) {
    throw new Error('No authenticated user found in request headers. Is this route protected by middleware?')
  }

  return {
    id,
    email,
    name,
    globalRole,
    role: globalRole, // Fallback for old code expecting `role`
    departmentId: departmentId || null,
    departmentName: departmentName || null,
    positionId: positionId || null,
    positionName: positionName || null,
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
