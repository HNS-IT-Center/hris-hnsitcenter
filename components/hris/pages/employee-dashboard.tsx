"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GlassCard, StatusBadge } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import {
  AlarmClock,
  CalendarOff,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Plane,
  XCircle,
} from "lucide-react"
import type { getEmployeeDashboardData } from "@/app/actions/dashboard"

type DashboardData = Awaited<ReturnType<typeof getEmployeeDashboardData>>

const TAG_STYLES: Record<string, string> = {
  NOTICE: "bg-muted text-muted-foreground",
  EVENT: "bg-secondary/15 text-secondary",
  URGENT: "bg-destructive/15 text-destructive",
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL_LEAVE: "Cuti Tahunan",
  SICK: "Sakit",
  PERSONAL: "Keperluan Pribadi",
  HALF_DAY: "Setengah Hari",
  OVERTIME: "Lembur",
}

export function EmployeeDashboard({ data }: { data: DashboardData }) {
  const router = useRouter()
  const { user, summary, quota, recentLeaves, recentBroadcasts, todayRecord } = data

  const hasCheckedIn = !!todayRecord?.checkInTime
  const hasCheckedOut = !!todayRecord?.checkOutTime
  const isCompleted = hasCheckedIn && hasCheckedOut

  const statusText = !hasCheckedIn
    ? "Belum Absen Masuk"
    : !hasCheckedOut
    ? "Sudah Masuk — Belum Absen Pulang"
    : "Selesai — Terima kasih!"

  const firstName = user?.name?.split(" ")[0] ?? "Karyawan"

  const SUMMARY = [
    { label: "Hadir", value: summary.hadir, icon: CheckCircle2, color: "text-success" },
    { label: "Telat", value: summary.telat, icon: AlarmClock, color: "text-warning" },
    { label: "Alpha", value: summary.alpha, icon: XCircle, color: "text-destructive" },
    { label: "Izin", value: summary.izin, icon: Clock, color: "text-secondary" },
    { label: "Cuti", value: summary.cuti, icon: Plane, color: "text-primary" },
    { label: "Sisa Cuti", value: quota.remaining, icon: CalendarOff, color: "text-accent-foreground" },
  ]

  return (
    <div className="space-y-6">
      {/* Status Absensi */}
      <div className="overflow-hidden rounded-2xl border border-border bg-primary p-5 text-primary-foreground shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-primary-foreground/80">Halo, {firstName}</p>
            <p className="mt-1 text-2xl font-bold text-primary-foreground">{statusText}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 text-primary-foreground/80">
                <Clock className="h-4 w-4" />
                {user?.shift?.name ?? "Shift belum diatur"}
              </span>
              <span className="flex items-center gap-1.5 text-primary-foreground/80">
                <MapPin className="h-4 w-4" />
                {user?.store?.name ?? "Toko belum diatur"}
              </span>
            </div>
          </div>
          <Button
            onClick={() => router.push("/attendance")}
            disabled={isCompleted}
            size="lg"
            className="h-14 gap-2 bg-primary-foreground px-8 text-base font-semibold text-primary transition-all hover:bg-primary-foreground/90 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {!hasCheckedIn ? (
              <><LogIn className="h-5 w-5" /> Absen Masuk</>
            ) : !hasCheckedOut ? (
              <><LogOut className="h-5 w-5" /> Absen Pulang</>
            ) : (
              <><CheckCircle2 className="h-5 w-5" /> Hari Selesai</>
            )}
          </Button>
        </div>
      </div>

      {/* Monthly summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ringkasan Bulan Ini</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SUMMARY.map((s) => {
            const Icon = s.icon
            return (
              <GlassCard key={s.label} className="p-4">
                <Icon className={cn("h-5 w-5", s.color)} />
                <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </GlassCard>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent leave requests */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Pengajuan Terbaru</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/leave")}>
              Lihat semua
            </Button>
          </div>
          <div className="space-y-3">
            {recentLeaves.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengajuan.</p>
            )}
            {recentLeaves.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{LEAVE_TYPE_LABELS[r.type] ?? r.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.startDate).toLocaleDateString("id-ID")} — {new Date(r.endDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <StatusBadge status={r.status.toLowerCase() as any} />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Broadcasts */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-secondary" />
            <h2 className="font-semibold text-foreground">Pengumuman</h2>
          </div>
          <div className="space-y-3">
            {recentBroadcasts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengumuman.</p>
            )}
            {recentBroadcasts.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", TAG_STYLES[a.tag] ?? TAG_STYLES.NOTICE)}>
                    {a.tag.toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
