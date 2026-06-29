"use client"

import { GlassCard } from "@/components/hris/shared"
import { Briefcase, Building2, Clock, IdCard, Mail, MapPin } from "lucide-react"
import type { getMyLeaveQuota } from "@/app/actions/leave"

type LeaveQuota = Awaited<ReturnType<typeof getMyLeaveQuota>>

type UserProfile = {
  id: string
  name: string
  email: string
  username?: string | null
  avatarUrl?: string | null
  role: string
  positionName?: string | null
  departmentName?: string | null
  joinDate: Date | string
  store?: { name: string } | null
  shift?: { name: string } | null
  department?: { name: string } | null
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Karyawan",
  HRD: "HRD",
  BOSS: "Pimpinan",
  ADMIN: "Admin",
}

export function ProfilePage({ user, leaveQuota }: { user: UserProfile; leaveQuota: LeaveQuota }) {
  const joinDate = new Date(user.joinDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const workInfo = [
    { label: "ID Karyawan", value: user.username ?? user.id.slice(0, 8).toUpperCase(), icon: IdCard },
    { label: "Email", value: user.email, icon: Mail },
    { label: "Departemen", value: user.department?.name ?? user.departmentName ?? "—", icon: Briefcase },
    { label: "Toko", value: user.store?.name ?? "Belum diatur", icon: MapPin },
    { label: "Shift", value: user.shift?.name ?? "Belum diatur", icon: Clock },
    { label: "Tanggal Bergabung", value: joinDate, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      <GlassCard className="bg-primary text-primary-foreground">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-20 w-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold">
              {getInitials(user.name)}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-primary-foreground/80">{user.positionName ?? ROLE_LABELS[user.role] ?? user.role}</p>
            <p className="mt-1 text-sm text-primary-foreground/60">{user.email}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Informasi Kerja</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {workInfo.map((info) => {
              const Icon = info.icon
              return (
                <div key={info.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{info.label}</p>
                    <p className="truncate text-sm font-medium text-foreground">{info.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold text-foreground">Kuota Cuti</h3>
          <div className="space-y-3">
            {[
              { label: "Total", value: leaveQuota.total },
              { label: "Terpakai", value: leaveQuota.used },
              { label: "Sisa", value: leaveQuota.remaining },
            ].map((q) => (
              <div key={q.label} className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{q.label}</span>
                <span className="text-lg font-bold text-foreground">{q.value}</span>
              </div>
            ))}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${Math.min(100, (leaveQuota.used / leaveQuota.total) * 100)}%` }}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
