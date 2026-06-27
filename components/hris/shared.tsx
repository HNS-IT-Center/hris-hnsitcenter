import type React from "react"
import { cn } from "@/lib/utils"
import type { LeaveStatus } from "@/lib/hris-data"

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass rounded-2xl border border-border p-5 shadow-sm", className)}>{children}</div>
}

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
}

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Disetujui",
  rejected: "Ditolak",
}

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground text-balance">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{desc}</p>}
      </div>
      {action}
    </div>
  )
}
