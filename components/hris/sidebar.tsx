"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/hris-data"
import type { DashboardUser } from "@/components/hris/dashboard-shell"
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Target,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react"

export type NavId =
  | "dashboard"
  | "attendance"
  | "leave"
  | "performance"
  | "profile"
  | "hrd-dashboard"
  | "hrd-attendance"
  | "employees"
  | "shifts"
  | "stores"
  | "calendar"
  | "recruitment"
  | "broadcast"

type NavItem = { id: NavId; label: string; icon: React.ElementType; href: string; badge?: number }

const EMPLOYEE_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "attendance", label: "Absensi", icon: CalendarCheck, href: "/attendance" },
  { id: "leave", label: "Izin & Cuti", icon: ClipboardList, href: "/leave" },
  { id: "performance", label: "Performa", icon: CalendarDays, href: "/performance" },
  { id: "profile", label: "Profil", icon: User, href: "/profile" },
]

const HRD_NAV: NavItem[] = [
  { id: "hrd-dashboard", label: "Dashboard HRD", icon: LayoutDashboard, href: "/hrd/dashboard" },
  { id: "hrd-attendance", label: "Log Absensi", icon: CalendarCheck, href: "/hrd/attendance" },
  { id: "employees", label: "Karyawan", icon: Users, href: "/hrd/employees" },
  { id: "shifts", label: "Shift", icon: CalendarDays, href: "/hrd/shifts" },
  { id: "stores", label: "Toko", icon: MapPin, href: "/hrd/stores" },
  { id: "leave", label: "Approval Izin", icon: ClipboardList, href: "/hrd/leave" },
  { id: "calendar", label: "Kelola Kalender", icon: CalendarRange, href: "/hrd/calendar" },
  { id: "recruitment", label: "Rekrutmen", icon: Target, href: "/hrd/recruitment" },
  { id: "broadcast", label: "Broadcast", icon: Megaphone, href: "/hrd/broadcast" },
]

interface SidebarProps {
  role: Role
  active: NavId
  onSelect: (id: NavId) => void
  mobileOpen: boolean
  onMobileClose: () => void
  onLogout: () => void
  user?: DashboardUser
  swipeOffset?: number
  isSwiping?: boolean
}

export function Sidebar({ role, active, onSelect, mobileOpen, onMobileClose, onLogout, user, swipeOffset = 0, isSwiping = false }: SidebarProps) {
  const pathname = usePathname()
  const items = role === "hrd" ? HRD_NAV : EMPLOYEE_NAV

  const displayName = user?.name ?? 'Pengguna'
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const displayRole = user?.role === 'HRD' ? 'HRD' : user?.role === 'BOSS' ? 'Boss' : 'Karyawan'

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden" onClick={onMobileClose} aria-hidden />
      )}

      <aside
        className={cn(
          "glass fixed left-0 top-0 z-50 flex h-[100dvh] w-[260px] flex-col border-r border-sidebar-border lg:translate-x-0 lg:!transform-none",
          // When swiping, we remove transition duration for immediate tracking
          isSwiping ? "transition-none" : "transition-transform duration-300",
          !mobileOpen && !isSwiping ? "-translate-x-full" : ""
        )}
        style={{
          transform: isSwiping && !mobileOpen && swipeOffset > 0 
            ? `translateX(${swipeOffset - 260}px)` 
            : isSwiping && mobileOpen && swipeOffset < 0
            ? `translateX(${swipeOffset}px)`
            : mobileOpen ? 'translateX(0)' : undefined
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-sidebar-foreground">HNS IT Center</p>
              <p className="text-[11px] text-muted-foreground">HRIS Portal</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {role === "hrd" ? "Manajemen HRD" : "Menu"}
          </p>
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-transform", !isActive && "group-hover:scale-110")} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-sidebar-border p-3">
          <Link href="/profile" onClick={() => onSelect("profile")} className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {displayInitials}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
              <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <UserCog className="h-3 w-3" />
                {displayRole}
              </p>
            </div>
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
