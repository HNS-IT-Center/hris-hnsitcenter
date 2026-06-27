"use client"

import { GlassCard } from "@/components/hris/shared"
import { MONTHLY_SUMMARY } from "@/lib/hris-data"
import { cn } from "@/lib/utils"
import { AlarmClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plane, XCircle } from "lucide-react"

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

// Placeholder status per day (the real app uses a custom big-calendar implementation).
const STATUS_COLORS: Record<string, string> = {
  hadir: "bg-success",
  telat: "bg-warning",
  alpha: "bg-destructive",
  izin: "bg-secondary",
  cuti: "bg-primary",
}

function mockStatus(day: number): keyof typeof STATUS_COLORS | null {
  if (day > 26) return null
  if (day % 11 === 0) return "alpha"
  if (day % 7 === 0) return "telat"
  if (day % 13 === 0) return "izin"
  if (day % 6 === 0) return "cuti"
  if (day % 6 === 5) return null
  return "hadir"
}

const SUMMARY = [
  { label: "Hadir", value: MONTHLY_SUMMARY.hadir, icon: CheckCircle2, color: "text-success" },
  { label: "Telat", value: MONTHLY_SUMMARY.telat, icon: AlarmClock, color: "text-warning" },
  { label: "Alpha", value: MONTHLY_SUMMARY.alpha, icon: XCircle, color: "text-destructive" },
  { label: "Izin", value: MONTHLY_SUMMARY.izin, icon: Clock, color: "text-secondary" },
  { label: "Cuti", value: MONTHLY_SUMMARY.cuti, icon: Plane, color: "text-primary" },
]

export function PerformancePage() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Juni 2026</h2>
          </div>
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Bulan berikutnya">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar placeholder grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {[0, 1, 2].map((i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const status = mockStatus(day)
            return (
              <div
                key={day}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card/40 text-sm text-foreground"
              >
                <span>{day}</span>
                {status && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[status])} />}
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground text-pretty">
          Placeholder kalender performa — aplikasi asli menggunakan implementasi kustom big-calendar.
        </p>
      </GlassCard>

      {/* Summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rekap Performa</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SUMMARY.map((s) => {
            const Icon = s.icon
            return (
              <GlassCard key={s.label} className="flex items-center gap-3 p-4">
                <Icon className={cn("h-6 w-6 shrink-0", s.color)} />
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
