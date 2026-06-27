"use client"

import { useRouter } from "next/navigation"
import { HrdDashboard } from "@/components/hris/pages/hrd-dashboard"
import type { NavId } from "@/components/hris/sidebar"

const NAV_PATHS: Partial<Record<NavId, string>> = {
  leave: "/hrd/leave",
  employees: "/hrd/employees",
  shifts: "/hrd/shifts",
  stores: "/hrd/stores",
  recruitment: "/hrd/recruitment",
  broadcast: "/hrd/broadcast",
}

export default function HrdDashboardPage() {
  const router = useRouter()

  const handleNavigate = (id: NavId) => {
    const path = NAV_PATHS[id]
    if (path) router.push(path)
  }

  return <HrdDashboard onNavigate={handleNavigate} />
}
