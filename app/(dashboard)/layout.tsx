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

  // Ensure user record exists in our DB (create on first login via SSO)
  let dbUser = await prisma.user.findUnique({
    where: { ssoId: ssoUser.id },
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

  // First-time SSO login — provision the user record
  if (!dbUser) {
    const created = await prisma.user.create({
      data: {
        ssoId: ssoUser.id,
        email: ssoUser.email,
        name: ssoUser.email.split('@')[0], // Temporary name until profile is filled
        role: ssoUser.role === 'HRD' ? 'HRD' : ssoUser.role === 'BOSS' ? 'BOSS' : 'EMPLOYEE',
      },
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
    dbUser = created
  }

  // Inactive users cannot access the app
  if (!dbUser.isActive) {
    redirect('/login?error=unauthorized')
  }

  return (
    <DashboardShell
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
