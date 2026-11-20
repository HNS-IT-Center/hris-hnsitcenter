import 'server-only'

import { getServerUser, type SSOUser } from '@/lib/auth'
import { isPrivilegedRole } from '@/lib/auth/roles'

/**
 * Authorization guards for Server Actions.
 *
 * Every function exported from a 'use server' file can be called directly
 * from the browser with any arguments, so each action must check who is
 * calling, and must never trust a userId sent by the client.
 */

export class ForbiddenError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** Any signed-in, active user. */
export function requireUser(): Promise<SSOUser> {
  return getServerUser()
}

/** HRD, BOSS or ADMIN. */
export async function requirePrivileged(): Promise<SSOUser> {
  const user = await getServerUser()
  if (!isPrivilegedRole(user.role)) throw new ForbiddenError()
  return user
}

/** The user themself, or HRD/BOSS/ADMIN acting on someone else's data. */
export async function requireSelfOrPrivileged(userId: string): Promise<SSOUser> {
  const user = await getServerUser()
  if (user.id !== userId && !isPrivilegedRole(user.role)) throw new ForbiddenError()
  return user
}
