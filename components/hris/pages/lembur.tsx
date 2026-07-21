"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GlassCard } from "@/components/hris/shared"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, Check, X, Timer, Search, ChevronLeft, ChevronRight, Ban, Clock } from "lucide-react"
import { approveOvertimeRequest, type getAllOvertimeRequests } from "@/app/actions/overtime"

type AllRequest = Awaited<ReturnType<typeof getAllOvertimeRequests>>[number]
type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED"

const STATUS_CONFIG: Record<OvertimeStatus, any> = {
  PENDING: { label: "Menunggu", color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Clock },
  APPROVED: { label: "Disetujui", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: Check },
  REJECTED: { label: "Ditolak", color: "text-destructive", bg: "bg-destructive/10", icon: Ban },
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function LemburPage({ allRequests }: { allRequests: AllRequest[] }) {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<OvertimeStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 15
  
  const [rejectReason, setRejectReason] = useState("")
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)

  const handleApprove = (id: string, approve: boolean, name: string, reason?: string) => {
    startTransition(async () => {
      const res = await approveOvertimeRequest(id, approve, reason)
      if (res.success) {
        toast.success(approve ? "Lembur disetujui" : "Lembur ditolak", {
          description: `Pengajuan ${name} ${approve ? "disetujui" : "ditolak"}.`,
        })
        setRejectTargetId(null)
        setRejectReason("")
      } else {
        toast.error(res.error)
      }
    })
  }

  const filtered = allRequests.filter(r => {
    if (tab !== "all" && r.status !== tab) return false
    if (search) {
      const s = search.toLowerCase()
      if (!r.user.name.toLowerCase().includes(s) && !r.task?.toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Riwayat & Approval Lembur</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} pengajuan ditemukan</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau tugas..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 bg-background"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s]
          const Icon = cfg?.icon
          const isActive = tab === s
          return (
            <button
              key={s}
              onClick={() => { setTab(s); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {s === "all" ? "Semua" : cfg?.label}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s === "all"
                  ? allRequests.length
                  : allRequests.filter(r => r.status === s).length}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Timer className="mb-4 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">Tidak ada data pengajuan lembur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((r) => {
            const statusCfg = STATUS_CONFIG[r.status as OvertimeStatus] ?? STATUS_CONFIG.PENDING
            const StatusIcon = statusCfg.icon
            const initials = getInitials(r.user.name)

            return (
              <GlassCard
                key={r.id}
                className={cn("overflow-hidden border-l-4 p-0", "border-indigo-500")}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground overflow-hidden">
                      {r.user.avatarUrl ? <img src={r.user.avatarUrl} alt={r.user.name} className="h-full w-full object-cover" /> : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{r.user.name}</p>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {new Date(r.overtimeDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                          {new Date(r.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - 
                          {r.endTime ? new Date(r.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "..."}
                        </span>
                        <span className="rounded bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 font-bold">
                          {r.totalHours?.toFixed(1)} jam
                        </span>
                      </p>
                      {r.task && (
                        <p className="mt-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground">
                          {r.task}
                        </p>
                      )}
                      {r.status === 'REJECTED' && r.rejectReason && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <Ban className="h-3 w-3" /> {r.rejectReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusCfg.color, statusCfg.bg)}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {r.status === 'PENDING' && (
                        <>
                          <Dialog open={rejectTargetId === r.id} onOpenChange={(open) => {
                            if (!open) { setRejectTargetId(null); setRejectReason("") }
                            else setRejectTargetId(r.id)
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 text-xs" disabled={isPending}>
                                <X className="h-3.5 w-3.5" /> Tolak
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Tolak Pengajuan Lembur</DialogTitle>
                                <DialogDescription>Alasan penolakan akan dikirim ke notifikasi {r.user.name}.</DialogDescription>
                              </DialogHeader>
                              <div className="py-2">
                                <Input
                                  placeholder="Contoh: Tidak ada budget lembur saat ini"
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRejectTargetId(null)}>Batal</Button>
                                <Button
                                  variant="destructive"
                                  disabled={!rejectReason || isPending}
                                  onClick={() => handleApprove(r.id, false, r.user.name, rejectReason)}
                                >
                                  {isPending ? "Menyimpan..." : "Tolak Pengajuan"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs"
                            disabled={isPending}
                            onClick={() => handleApprove(r.id, true, r.user.name)}
                          >
                            <Check className="h-3.5 w-3.5" /> Setujui
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <div className="text-sm font-medium text-muted-foreground">
            Halaman {page} dari {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gap-1.5"
          >
            Selanjutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
