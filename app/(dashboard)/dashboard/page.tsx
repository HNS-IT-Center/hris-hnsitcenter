"use client"

import { useRouter } from "next/navigation"
import { EmployeeDashboard } from "@/components/hris/pages/employee-dashboard"
import type { NavId } from "@/components/hris/sidebar"

const NAV_PATHS: Partial<Record<NavId, string>> = {
  leave: "/leave",
  attendance: "/attendance",
  performance: "/performance",
  profile: "/profile",
}

export default function DashboardPage() {
  const router = useRouter()

  const handleNavigate = (id: NavId) => {
    const path = NAV_PATHS[id]
    if (path) router.push(path)
  }

  return <EmployeeDashboard onNavigate={handleNavigate} />
}
