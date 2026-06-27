"use client"

import { useState } from "react"
import type React from "react"
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

const PAGE_TITLES: Partial<Record<string, string>> = {
  "/dashboard": "Dashboard",
  "/attendance": "Absensi",
  "/leave": "Izin & Cuti",
  "/performance": "Performa",
  "/profile": "Profil",
  "/hrd/dashboard": "Dashboard HRD",
  "/hrd/employees": "Karyawan",
  "/hrd/shifts": "Shift",
  "/hrd/stores": "Toko",
  "/hrd/leave": "Approval Izin",
  "/hrd/overtime": "Approval Lembur",
  "/hrd/shift-swap": "Tukar Shift",
  "/hrd/calendar": "Kelola Kalender",
  "/hrd/recruitment": "Rekrutmen",
  "/hrd/broadcast": "Broadcast",
  "/hrd/settings": "Pengaturan",
}

/**
 * DashboardShell — Client component wrapping authenticated pages.
 *
 * Receives the hydrated user from the server layout,
 * manages sidebar mobile open state, and renders the
 * existing Sidebar + Topbar components.
 */
export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Derive role for sidebar — BOSS gets HRD nav view
  const sidebarRole = user.role === "HRD" || user.role === "BOSS" ? "hrd" : "employee"

  // Get the active nav ID from the current path
  // Since children handle their own routing, we don't manage active page state here.
  // The sidebar will navigate via <Link> in Next.js route pages.
  const activeNavId: NavId = "dashboard" // default fallback

  const handleLogout = (): void => {
    // Clear the sso_token cookie locally (this effectively signs out of all subdomains)
    document.cookie = 'sso_token=; Max-Age=0; path=/; domain=.hnsitcenter.id;'
    // Redirect directly back to our own login page instead of the SSO's 404 logout route
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        role={sidebarRole}
        active={activeNavId}
        onSelect={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        user={user}
      />

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
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
