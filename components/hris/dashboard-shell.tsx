"use client"

import { useState } from "react"
import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/hris/sidebar"
import { Topbar } from "@/components/hris/topbar"
import type { NavId } from "@/components/hris/sidebar"

export interface DashboardUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string  // 'EMPLOYEE' | 'HRD' | 'BOSS'
  department?: { id: string; name: string }
  store?: { id: string; name: string }
  shift?: { id: string; name: string; startTime: string; endTime: string }
}

interface DashboardShellProps {
  user: DashboardUser
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Prevent body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [mobileOpen])

  // Derive role for sidebar — based on URL path!
  const isHrdAuthorized = user.role === "HRD" || user.role === "BOSS"
  const isHrdRoute = pathname?.startsWith('/hrd')
  const sidebarRole = (isHrdAuthorized && isHrdRoute) ? "hrd" : "employee"

  const activeNavId: NavId = "dashboard" // default fallback

  const handleLogout = (): void => {
    window.location.href = '/api/auth/logout'
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar
        role={sidebarRole}
        active={activeNavId}
        onSelect={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        user={user}
      />

      <div className="flex min-h-[100dvh] flex-col lg:pl-[260px]">
        <Topbar
          title="HRIS"
          role={sidebarRole}
          onMenu={() => setMobileOpen(true)}
          user={user}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

