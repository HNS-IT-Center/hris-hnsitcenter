/**
 * HRIS roles.
 *
 * The HNS SSO decides *who* may open this app (its whitelist) but carries no
 * role claims. The HRIS role lives in `User.role` and is managed here by
 * HRD/Admin (Employees page, or `npm run auth:set-role`).
 *
 * This module is dependency-free so it can run on the server and in client
 * components alike.
 */

export const HRIS_ROLES = ['EMPLOYEE', 'HRD', 'BOSS', 'ADMIN'] as const
export type HrisRole = (typeof HRIS_ROLES)[number]

/** Roles that can open the HRD workspace (/hrd/*) and manage other employees. */
export const PRIVILEGED_ROLES: readonly HrisRole[] = ['HRD', 'BOSS', 'ADMIN']

export function isHrisRole(value: unknown): value is HrisRole {
  return typeof value === 'string' && (HRIS_ROLES as readonly string[]).includes(value)
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
