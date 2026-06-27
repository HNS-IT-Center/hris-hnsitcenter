"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard, StatusBadge } from "@/components/hris/shared"
import type { NavId } from "@/components/hris/sidebar"
import { ANNOUNCEMENTS, CURRENT_USER, LEAVE_REQUESTS, MONTHLY_SUMMARY } from "@/lib/hris-data"
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

type Status = "before" | "in" | "done"

const SUMMARY = [
  { label: "Hadir", value: MONTHLY_SUMMARY.hadir, icon: CheckCircle2, color: "text-success" },
  { label: "Telat", value: MONTHLY_SUMMARY.telat, icon: AlarmClock, color: "text-warning" },
  { label: "Alpha", value: MONTHLY_SUMMARY.alpha, icon: XCircle, color: "text-destructive" },
  { label: "Izin", value: MONTHLY_SUMMARY.izin, icon: Clock, color: "text-secondary" },
  { label: "Cuti", value: MONTHLY_SUMMARY.cuti, icon: Plane, color: "text-primary" },
  { label: "Sisa Cuti", value: MONTHLY_SUMMARY.remaining, icon: CalendarOff, color: "text-accent-foreground" },
]

const TAG_STYLES: Record<string, string> = {
  notice: "bg-muted text-muted-foreground",
  event: "bg-secondary/15 text-secondary",
  urgent: "bg-destructive/15 text-destructive",
}

export function EmployeeDashboard({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const [status, setStatus] = useState<Status>("before")

  const handleCheck = () => {
    if (status === "before") {
      setStatus("in")
      toast.success("Absen masuk berhasil", { description: "Pukul 08:02 - HNS Pusat Jakarta" })
    } else if (status === "in") {
      setStatus("done")
      toast.success("Absen pulang berhasil", { description: "Pukul 17:05 - Selamat beristirahat!" })
    }
  }

  const statusText = status === "before" ? "Belum Absen Masuk" : status === "in" ? "Sudah Masuk" : "Selesai"

  return (
    <div className="space-y-6">
      {/* Status Absensi */}
      <GlassCard className="overflow-hidden bg-primary text-primary-foreground">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm" style={{ color: "rgb(91, 101, 115)" }}>Halo, {CURRENT_USER.name.split(" ")[0]}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: "rgb(237, 237, 237)" }}>{statusText}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5" style={{ color: "rgb(91, 101, 115)" }}>
                <Clock className="h-4 w-4" />
                {CURRENT_USER.shift}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "rgb(91, 101, 115)" }}>
                <MapPin className="h-4 w-4" />
                {CURRENT_USER.store}
              </span>
            </div>
          </div>
          <Button
            onClick={handleCheck}
            disabled={status === "done"}
            size="lg"
            className="h-14 gap-2 bg-primary-foreground px-8 text-base font-semibold text-primary hover:bg-primary-foreground/90 disabled:opacity-60"
          >
            {status === "before" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
            {status === "before" ? "Absen Masuk" : status === "in" ? "Absen Pulang" : "Hari Selesai"}
          </Button>
        </div>
      </GlassCard>

      {/* Monthly summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ringkasan Bulan Ini</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SUMMARY.map((s) => {
            const Icon = s.icon
            return (
              <GlassCard key={s.label} className="p-4">
                <Icon className={cn("h-5 w-5", s.label === "Sisa Cuti" ? "text-white" : s.color)} style={s.label === "Sisa Cuti" ? { color: "rgb(237, 237, 237)" } : undefined} />
                <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </GlassCard>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent leave */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Pengajuan Terbaru</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("leave")}>
              Lihat semua
            </Button>
          </div>
          <div className="space-y-3">
            {LEAVE_REQUESTS.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.typeLabel}</p>
                  <p className="text-xs text-muted-foreground">{r.dateRange}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Announcements */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-secondary" />
            <h2 className="font-semibold text-foreground">Pengumuman</h2>
          </div>
          <div className="space-y-3">
            {ANNOUNCEMENTS.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", TAG_STYLES[a.tag])}>
                    {a.tag}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.time}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
