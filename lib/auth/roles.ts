/**
 * HRIS role resolution — single source of truth.
 *
 * The SSO is the only place where a user's HRIS role is decided:
 * - SSO `globalRole` SUPER_ADMIN            -> ADMIN (full access, can never be locked out)
 * - SSO `appRoles["<HRIS domain>"]`          -> that role (see APP_ROLE_ALIASES)
 * - no entry for this app                   -> null (not whitelisted for HRIS)
 *
 * This module is dependency-free so it can run in the proxy, on the server
 * and in client components alike.
 */

export const HRIS_ROLES = ['EMPLOYEE', 'HRD', 'BOSS', 'ADMIN'] as const
export type HrisRole = (typeof HRIS_ROLES)[number]

/** Roles that can open the HRD workspace (/hrd/*) and manage other employees. */
export const PRIVILEGED_ROLES: readonly HrisRole[] = ['HRD', 'BOSS', 'ADMIN']

/** The AppClient domain this HRIS is registered under in the SSO admin. */
export const HRIS_APP_DOMAIN = process.env.NEXT_PUBLIC_HRIS_APP_DOMAIN || 'absensi.hnsitcenter.id'

/** SSO role presets are generic across apps; map them onto HRIS roles. */
const APP_ROLE_ALIASES: Record<string, HrisRole> = {
  USER: 'EMPLOYEE',
  EMPLOYEE: 'EMPLOYEE',
  KARYAWAN: 'EMPLOYEE',
  HRD: 'HRD',
  BOSS: 'BOSS',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'ADMIN',
}

function readAppRoles(appRoles: unknown): Record<string, unknown> {
  if (typeof appRoles === 'string') {
    try {
      return readAppRoles(JSON.parse(appRoles))
    } catch {
      return {}
    }
  }
  return appRoles && typeof appRoles === 'object' ? (appRoles as Record<string, unknown>) : {}
}

export function resolveHrisRole(payload: Record<string, unknown>): HrisRole | null {
  if (String(payload.globalRole ?? '').toUpperCase() === 'SUPER_ADMIN') return 'ADMIN'

  const appRole = readAppRoles(payload.appRoles)[HRIS_APP_DOMAIN]
  if (typeof appRole !== 'string') return null

  return APP_ROLE_ALIASES[appRole.trim().toUpperCase()] ?? null
}

export function isPrivilegedRole(role: string | null | undefined): boolean {
  return !!role && (PRIVILEGED_ROLES as readonly string[]).includes(role.toUpperCase())
}

export const ROLE_LABELS: Record<HrisRole, string> = {
  EMPLOYEE: 'Karyawan',
  HRD: 'HRD',
  BOSS: 'Pimpinan',
  ADMIN: 'Admin',
}
