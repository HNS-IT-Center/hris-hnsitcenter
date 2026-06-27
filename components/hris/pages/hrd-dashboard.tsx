"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import type { NavId } from "@/components/hris/sidebar"
import { ATTENTION_FLAGS, HRD_STATS, PENDING_APPROVALS } from "@/lib/hris-data"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Clock,
  RefreshCw,
  UserMinus,
  Users,
} from "lucide-react"

const STATS = [
  { label: "Karyawan Aktif", value: HRD_STATS.totalActive, icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { label: "Hadir", value: HRD_STATS.present, icon: CalendarCheck, color: "text-success", bg: "bg-success/10" },
  { label: "Telat", value: HRD_STATS.late, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  { label: "Tidak Hadir", value: HRD_STATS.missing, icon: UserMinus, color: "text-destructive", bg: "bg-destructive/10" },
]

const QUICK = [
  { label: "Izin", value: PENDING_APPROVALS.length, icon: ClipboardList },
  { label: "Lembur", value: 2, icon: Clock },
  { label: "Tukar Shift", value: 1, icon: RefreshCw },
]

export function HrdDashboard({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.bg)}>
                <Icon className={cn("h-5 w-5", s.color)} />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attention flags */}
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-semibold text-foreground">Perlu Diperhatikan</h2>
          </div>
          <div className="space-y-3">
            {ATTENTION_FLAGS.map((flag) => (
              <div
                key={flag.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3",
                  flag.severity === "danger" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5",
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={cn("mt-0.5 h-5 w-5 shrink-0", flag.severity === "danger" ? "text-destructive" : "text-warning")}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{flag.title}</p>
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => toast.success("Flag diselesaikan", { description: flag.title })}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Pending approvals quick links */}
        <GlassCard>
          <h2 className="mb-4 font-semibold text-foreground">Approval Tertunda</h2>
          <div className="space-y-3">
            {QUICK.map((q) => {
              const Icon = q.icon
              return (
                <button
                  key={q.label}
                  onClick={() => onNavigate("leave")}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{q.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                      {q.value}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
