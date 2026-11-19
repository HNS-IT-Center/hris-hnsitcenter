import 'server-only'

import { prisma } from '@/lib/prisma'
import { generateNextEmployeeId } from '@/lib/utils/employee-id'
import type { SsoIdClaims } from '@/lib/auth/oidc'

export type LinkResult =
  | { ok: true; userId: string; isActive: boolean }
  | { ok: false; reason: 'no_email' | 'email_conflict' }

/**
 * Find or create the local user for an SSO login (HNS-SSO-CLIENT.md §3.3):
 * 1. match by `ssoSub`;
 * 2. otherwise match by email among users not linked yet, and link;
 * 3. otherwise auto-provision with the lowest role. The SSO whitelist already
 *    approved this person for the HRIS.
 * Name and email are refreshed from the claims on every login. Primary keys
 * are never changed and accounts are never merged automatically.
 */
export async function linkOrProvisionSsoUser(claims: SsoIdClaims): Promise<LinkResult> {
  const sub = claims.sub
  const email = claims.email?.trim().toLowerCase()
  const name = claims.name?.trim() || claims.preferred_username || email?.split('@')[0] || 'Pengguna'

  const bySub = await prisma.user.findUnique({ where: { ssoSub: sub }, select: { id: true, email: true, isActive: true } })
  if (bySub) {
    // Email may change in the SSO; the relation is `sub`. Skip it if another user already has that email.
    let newEmail: string | undefined
    if (email && email !== bySub.email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (!taken) newEmail = email
    }
    await prisma.user.update({ where: { id: bySub.id }, data: { name, ...(newEmail ? { email: newEmail } : {}) } })
    return { ok: true, userId: bySub.id, isActive: bySub.isActive }
  }

  if (!email) return { ok: false, reason: 'no_email' }

  const byEmail = await prisma.user.findFirst({ where: { email, ssoSub: null }, select: { id: true, isActive: true } })
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data: { ssoSub: sub, name } })
    return { ok: true, userId: byEmail.id, isActive: byEmail.isActive }
  }

  // The email belongs to a user already linked to another SSO account: do not touch it.
  const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (emailTaken) {
    console.error(`[auth] SSO sub ${sub} has email ${email}, which is linked to another SSO account. Link it manually.`)
    return { ok: false, reason: 'email_conflict' }
  }

  const employeeId = await generateNextEmployeeId()
  const created = await prisma.user.create({
    data: {
      ssoSub: sub,
      employeeId,
      email,
      name,
      role: 'EMPLOYEE',
      isActive: true,
      notifEnabled: true,
      twoFAEnabled: false,
      // New employees start with 0 quota; lastQuotaResetDate anchors the anniversary reset.
      leaveQuotaRemaining: 0,
      lastQuotaResetDate: new Date(),
    },
    select: { id: true },
  })
  return { ok: true, userId: created.id, isActive: true }
}

/**
 * Reset the annual leave quota to 12 on the employee's work anniversary.
 * Runs on each dashboard load; it only writes when a reset is due.
 */
export async function resetLeaveQuotaIfDue(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { joinDate: true, lastQuotaResetDate: true },
  })
  if (!user) return

  const now = new Date()
  const joinDate = new Date(user.joinDate)

  // Most recent anniversary date in the past
  const anniversary = new Date(joinDate)
  anniversary.setFullYear(now.getFullYear())
  if (anniversary > now) anniversary.setFullYear(now.getFullYear() - 1)

  const lastReset = user.lastQuotaResetDate ? new Date(user.lastQuotaResetDate) : new Date(0)

  // Only after at least one full year, and once per anniversary.
  if (anniversary > joinDate && lastReset < anniversary) {
    await prisma.user.update({
      where: { id: userId },
      data: { leaveQuotaRemaining: 12, lastQuotaResetDate: anniversary },
    })
  }
}
