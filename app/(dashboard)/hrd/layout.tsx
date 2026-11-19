import { redirect } from 'next/navigation'
import type React from 'react'
import { getServerUser } from '@/lib/auth'
import { isPrivilegedRole } from '@/lib/auth/roles'

/**
 * HRD workspace guard. Only HRD, BOSS and ADMIN (User.role) may open /hrd/*.
 * Server Actions still check the role themselves; this only gates the pages.
 */
export default async function HrdLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!isPrivilegedRole(user.role)) redirect('/dashboard')
  return <>{children}</>
}
