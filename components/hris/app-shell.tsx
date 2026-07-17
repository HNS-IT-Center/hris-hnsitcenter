"use client"

import { useMemo, useState } from "react"
import type { Role } from "@/lib/hris-data"
import { Sidebar, type NavId } from "@/components/hris/sidebar"
import { Topbar } from "@/components/hris/topbar"
import { EmployeeDashboard } from "@/components/hris/pages/employee-dashboard"
import { AttendancePage } from "@/components/hris/pages/attendance"
import { LeavePage } from "@/components/hris/pages/leave"
import { PerformancePage } from "@/components/hris/pages/performance"
import { ProfilePage } from "@/components/hris/pages/profile"
import { HrdDashboard } from "@/components/hris/pages/hrd-dashboard"
import { EmployeesPage } from "@/components/hris/pages/employees"
import { ShiftsPage } from "@/components/hris/pages/shifts"
import { StoresPage } from "@/components/hris/pages/stores"
import { CalendarManagerPage } from "@/components/hris/pages/calendar-manager"
import { RecruitmentPage } from "@/components/hris/pages/recruitment"

const SECTION_TITLES: Record<NavId, string> = {
  dashboard: "Dashboard",
  attendance: "Absensi",
  leave: "Izin & Cuti",
  performance: "Performa",
  profile: "Profil",
  "hrd-dashboard": "Dashboard HRD",
  employees: "Karyawan",
  shifts: "Shift",
  stores: "Toko",
  calendar: "Kelola Kalender",
  recruitment: "Rekrutmen",
  broadcast: "Broadcast",
}

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const [role, setRole] = useState<Role>("employee")
  const [active, setActive] = useState<NavId>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)

  const content = useMemo(() => {
    switch (active) {
      case "dashboard":
        return <EmployeeDashboard onNavigate={setActive} />
      case "attendance":
        return <AttendancePage />
      case "leave":
        return <LeavePage role={role} />
      case "performance":
        return <PerformancePage />
      case "profile":
        return <ProfilePage />
      case "hrd-dashboard":
        return <HrdDashboard onNavigate={setActive} />
      case "employees":
        return <EmployeesPage />
      case "shifts":
        return <ShiftsPage />
      case "stores":
        return <StoresPage />
      case "calendar":
        return <CalendarManagerPage />
      case "recruitment":
        return <RecruitmentPage />
      case "broadcast":
        return null // Handled by /hrd/broadcast server page
      default:
        return <EmployeeDashboard onNavigate={setActive} />
    }
  }, [active, role])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        role={role}
        active={active}
        onSelect={(id) => {
          setActive(id)
          setMobileOpen(false)
        }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={onLogout}
      />

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <Topbar
          title={SECTION_TITLES[active]}
          role={role}
          onRoleChange={(r) => {
            setRole(r)
            setActive(r === "hrd" ? "hrd-dashboard" : "dashboard")
          }}
          onMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div key={active} className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            {content}
          </div>
        </main>
      </div>
    </div>
  )
}
