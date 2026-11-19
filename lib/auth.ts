import 'server-only'

import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { HRIS_ROLES, type HrisRole } from '@/lib/auth/roles'
import { isSsoConfigured } from '@/lib/auth/oidc'
import { getCurrentSession } from '@/lib/auth/session'

export interface SSOUser {
  /** Primary key of the local User row. */
  id: string
  email: string
  name: string
  /** HRIS role, stored in User.role and managed by HRD/Admin in this app. */
  role: HrisRole
  departmentId: string | null
  departmentName: string | null
  positionId: string | null
  positionName: string | null
}

/** Codes match the error messages on /login. */
export type AuthErrorCode = 'session_expired' | 'account_disabled'

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code === 'account_disabled' ? 'Account is disabled' : 'No authenticated user')
    this.name = 'AuthError'
  }
}

const DEV_USER_EMAIL = 'dev@hnsitcenter.id'

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  departmentId: string | null
  departmentName: string | null
  ssoPositionId: string | null
  positionName: string | null
  department: { name: string } | null
}

function toSsoUser(user: UserRow): SSOUser {
  const role = (HRIS_ROLES as readonly string[]).includes(user.role) ? (user.role as HrisRole) : 'EMPLOYEE'
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? user.departmentName,
    positionId: user.ssoPositionId,
    positionName: user.positionName,
  }
}

/**
 * Local dev without an SSO client configured: act as the seeded HRD dev user,
 * so the app keeps working on localhost. Never active in production.
 */
async function getDevUser(): Promise<UserRow> {
  const select = {
    id: true, email: true, name: true, role: true, isActive: true,
    departmentId: true, departmentName: true, ssoPositionId: true, positionName: true,
    department: { select: { name: true } },
  } as const
  const existing = await prisma.user.findUnique({ where: { email: DEV_USER_EMAIL }, select })
  if (existing) return existing
  return prisma.user.create({
    data: { email: DEV_USER_EMAIL, name: 'Dev HRD', role: 'HRD', isActive: true },
    select,
  })
}

/**
 * The signed-in user, read from the server-side session (lib/auth/session.ts).
 * Safe to call from any Server Component, Server Action or Route Handler.
 *
 * @throws AuthError when there is no valid session or the account is disabled.
 */
export const getServerUser = cache(async (): Promise<SSOUser> => {
  const session = await getCurrentSession()

  let user: UserRow | null = session?.user ?? null
  if (!user && process.env.NODE_ENV === 'development' && !isSsoConfigured()) {
    user = await getDevUser()
  }

  if (!user) throw new AuthError('session_expired')
  if (!user.isActive) throw new AuthError('account_disabled')
  return toSsoUser(user)
})

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
