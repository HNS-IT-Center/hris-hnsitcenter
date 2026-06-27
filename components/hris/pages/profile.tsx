"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/hris/shared"
import { CURRENT_USER, LEAVE_QUOTA } from "@/lib/hris-data"
import { Briefcase, Building2, Clock, IdCard, Mail, MapPin, Pencil } from "lucide-react"

const WORK_INFO = [
  { label: "ID Karyawan", value: CURRENT_USER.employeeId, icon: IdCard },
  { label: "Email", value: CURRENT_USER.email, icon: Mail },
  { label: "Departemen", value: CURRENT_USER.department, icon: Briefcase },
  { label: "Toko", value: CURRENT_USER.store, icon: MapPin },
  { label: "Shift", value: CURRENT_USER.shift, icon: Clock },
  { label: "Tanggal Bergabung", value: CURRENT_USER.joinDate, icon: Building2 },
]

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <GlassCard className="bg-primary text-primary-foreground">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold">
            {CURRENT_USER.initials}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">{CURRENT_USER.name}</h2>
            <p className="text-primary-foreground/80">{CURRENT_USER.role}</p>
            <p className="mt-1 text-sm text-primary-foreground/60">{CURRENT_USER.employeeId}</p>
          </div>
          <Button
            variant="secondary"
            className="gap-1.5 sm:ml-auto"
            onClick={() => toast.info("Mode edit profil", { description: "Fitur ubah profil akan segera tersedia." })}
          >
            <Pencil className="h-4 w-4" />
            Edit Profil
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Informasi Kerja</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {WORK_INFO.map((info) => {
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
              { label: "Total", value: LEAVE_QUOTA.total },
              { label: "Terpakai", value: LEAVE_QUOTA.used },
              { label: "Sisa", value: LEAVE_QUOTA.remaining },
            ].map((q) => (
              <div key={q.label} className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{q.label}</span>
                <span className="text-lg font-bold text-foreground">{q.value}</span>
              </div>
            ))}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${(LEAVE_QUOTA.used / LEAVE_QUOTA.total) * 100}%` }}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
