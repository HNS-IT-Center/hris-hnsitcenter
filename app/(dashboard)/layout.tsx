/**
 * (dashboard) layout — Protected app shell
 *
 * This layout wraps all authenticated pages. It reads the authenticated user
 * from the SSO-injected headers (set by middleware.ts) and passes the data
 * down to the sidebar and topbar as props.
 *
 * The actual sidebar/topbar rendering happens in the DashboardShell client
 * component to keep interactivity (mobile menu toggle, theme switch, etc.)
 * while keeping auth logic server-side.
 */

import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/hris/dashboard-shell'
import { redirect } from 'next/navigation'
import type React from 'react'

import { syncUserFromSSO } from '@/lib/auth/sync'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user identity from SSO-injected headers
  let ssoUser
  try {
    ssoUser = await getServerUser()
  } catch {
    redirect('/login')
  }

  // Ensure user record exists and is synced in our DB on every dashboard load
  // This seamlessly provisions new accounts or updates roles/departments if they changed in SSO!
  await syncUserFromSSO(ssoUser)

  const dbUser = await prisma.user.findUnique({
    where: { email: ssoUser.email },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      department: { select: { id: true, name: true } },
      store: { select: { id: true, name: true } },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
  })

  // Inactive users cannot access the app
  if (!dbUser || !dbUser.isActive) {
    redirect('/login?error=unauthorized')
  }

  let pendingApprovalsCount = 0
  if (['HRD', 'BOSS', 'ADMIN', 'SUPER_ADMIN'].includes(dbUser.role)) {
    const [leaves, overtimes] = await Promise.all([
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.overtimeRequest.count({ where: { status: 'PENDING' } })
    ])
    pendingApprovalsCount = leaves + overtimes
  }

  return (
    <DashboardShell
      pendingApprovalsCount={pendingApprovalsCount}
      user={{
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatarUrl: dbUser.avatarUrl ?? undefined,
        role: dbUser.role,
        department: dbUser.department ?? undefined,
        store: dbUser.store ?? undefined,
        shift: dbUser.shift ?? undefined,
      }}
    >
      {children}
    </DashboardShell>
  )
}
