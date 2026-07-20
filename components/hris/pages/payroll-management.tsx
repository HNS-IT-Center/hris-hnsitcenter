"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import NProgress from "nprogress"
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  Printer,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Clock,
} from "lucide-react"
import { GlassCard } from "@/components/hris/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { upsertPayrollConfig, generatePayrollSlip, getPayrollSlip, generateAllPayrollSlips, publishAllPayrollSlips } from "@/app/actions/payroll"
import type { getAllEmployeesPayrollSummary } from "@/app/actions/payroll"
import type { PayrollSlip } from "@prisma/client"

type Employee = Awaited<ReturnType<typeof getAllEmployeesPayrollSummary>>[number]

type Props = {
  employees: Employee[]
  periodStart: string
  periodEnd: string
  currentYear: number
  currentMonth: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

// PayslipPrintViewModal has been removed and replaced by the dedicated full-page view route /profile/payslip/[slipId]

// ─── Config Editor ────────────────────────────────────────────────────────────

function ConfigEditor({ employee, onClose, onSaved }: { employee: Employee; onClose: () => void; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition()

  const cfg = employee.payrollConfig
  const [base, setBase] = useState(cfg?.baseSalary26Days ?? 0)
  const [uangMakan, setUangMakan] = useState(cfg?.uangMakan ?? 0)
  const [transport, setTransport] = useState(cfg?.transport ?? 0)
  const [bpjs, setBpjs] = useState(cfg?.bpjs ?? 0)
  const [pph21, setPph21] = useState(cfg?.pph21 ?? 0)

  // Shift hours for hourly rate preview
  let shiftHours = 8
  if (employee.shift) {
    const [sh, sm] = employee.shift.startTime.split(":").map(Number)
    const [eh, em] = employee.shift.endTime.split(":").map(Number)
    const startMins = sh * 60 + sm
    let endMins = eh * 60 + em
    if (endMins <= startMins) endMins += 24 * 60
    shiftHours = (endMins - startMins) / 60
  }
  const dailyRate = Math.round(base / 26)
  const hourlyRate = shiftHours > 0 ? Math.round(dailyRate / shiftHours) : 0

  const handleSave = () => {
    startTransition(async () => {
      const res = await upsertPayrollConfig(employee.id, { baseSalary26Days: base, uangMakan, transport, bpjs, pph21 })
      if (res.success) {
        toast.success("Konfigurasi gaji disimpan & slip periode ini digenerate otomatis")
        onSaved()
        onClose()
      } else {
        toast.error(res.error)
      }
    })
  }

  const numberField = (label: string, value: number, onChange: (v: number) => void, hint?: string) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
        <Input
          type="number"
          value={value === 0 ? "" : value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="pl-9 h-9"
          placeholder="0"
          min={0}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        {employee.avatarUrl ? (
          <img src={employee.avatarUrl} alt={employee.name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
            {getInitials(employee.name)}
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.department?.name} · {employee.shift?.name}</p>
        </div>
      </div>

      {/* Current slip status info */}
      {employee.currentSlip && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {employee.currentSlip.isPublished
              ? "Slip periode ini sudah dipublish. Menyimpan perubahan akan mereset status publish — HRD perlu publish ulang."
              : "Slip periode ini sudah digenerate (belum dipublish). Perubahan akan otomatis diperbarui."}
          </span>
        </div>
      )}

      {/* 3-way synced salary fields */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="space-y-1 col-span-3 sm:col-span-1">
          <label className="text-xs font-medium">Gaji Total (26 Hari)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
            <Input
              type="number"
              value={base === 0 ? "" : base}
              onChange={(e) => setBase(parseInt(e.target.value) || 0)}
              className="pl-9 h-9 font-semibold"
              placeholder="0"
              min={0}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Per Hari (÷26)</label>
          <div className="h-9 flex items-center px-3 rounded-md border border-dashed bg-muted text-sm font-medium">
            {formatRp(dailyRate)}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Per Jam ({shiftHours}j)</label>
          <div className="h-9 flex items-center px-3 rounded-md border border-dashed bg-muted text-sm font-medium">
            {formatRp(hourlyRate)}
          </div>
        </div>
      </div>

      {/* Allowances */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tunjangan (Pendapatan)</p>
        <div className="grid grid-cols-2 gap-3">
          {numberField("Uang Makan", uangMakan, setUangMakan)}
          {numberField("Transport", transport, setTransport)}
        </div>
      </div>

      {/* Deductions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Potongan Tetap</p>
        <div className="grid grid-cols-2 gap-3">
          {numberField("BPJSTK", bpjs, setBpjs)}
          {numberField("Pajak PPh21", pph21, setPph21)}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Preview Gaji Pokok</p>
        <p>Gaji Pokok = Total Gaji − Uang Makan − Transport</p>
        <p className="font-semibold text-foreground mt-1">{formatRp(base - uangMakan - transport)}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={isPending}>
          {isPending ? "Menyimpan & Generate..." : "Simpan Konfigurasi"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PayrollManagement({ employees, periodStart, periodEnd, currentYear, currentMonth }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [configTarget, setConfigTarget] = useState<Employee | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [search, setSearch] = useState("")

  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department?.name ?? "").toLowerCase().includes(search.toLowerCase())
    ), [employees, search])

  const navigateMonth = (delta: number) => {
    let newMonth = currentMonth + delta
    let newYear = currentYear
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    NProgress.start()
    startTransition(() => {
      router.push(`/hrd/payroll?year=${newYear}&month=${newMonth}`)
    })
  }

  // Manual regenerate for a single employee (e.g. after attendance was corrected)
  const handleRegenerate = async (employee: Employee) => {
    setRegeneratingId(employee.id)
    const res = await generatePayrollSlip(employee.id, currentYear, currentMonth)
    setRegeneratingId(null)
    if (res.success) {
      toast.success(`Slip gaji ${employee.name} diperbarui`)
      router.refresh()
    } else {
      toast.error((res as any).error)
    }
  }

  const handlePublishAll = async () => {
    startTransition(async () => {
      const res = await publishAllPayrollSlips(currentYear, currentMonth)
      setShowPublishDialog(false)
      if (res.success) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const handleViewSlip = (employee: Employee) => {
    if (employee.currentSlip) {
      router.push(`/profile/payslip/${employee.currentSlip.id}`)
    } else {
      toast.error("Slip gaji belum digenerate untuk periode ini.")
    }
  }

  const periodLabel = `${format(new Date(periodStart), "d MMM", { locale: id })} – ${format(new Date(periodEnd), "d MMM yyyy", { locale: id })}`
  const isPublishable = new Date().setHours(0, 0, 0, 0) >= new Date(periodEnd).setHours(0, 0, 0, 0)

  // Summary stats
  const totalConfigured = employees.filter(e => e.payrollConfig).length
  const totalWithSlip = employees.filter(e => e.currentSlip).length
  const totalPublished = employees.filter(e => e.currentSlip?.isPublished).length
  const totalNeedRepublish = employees.filter(e => e.currentSlip && !e.currentSlip.isPublished && e.payrollConfig).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manajemen Payroll</h1>
          <p className="text-sm text-muted-foreground">Atur gaji karyawan & publish slip gaji.</p>
        </div>
        {/* Period Navigator & Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={isPending || totalWithSlip === 0 || !isPublishable}
            className="gap-1.5"
            variant="default"
            title={!isPublishable ? "Periode belum berakhir. Slip tidak dapat dipublish sebelum tanggal selesai periode." : "Publish semua slip gaji untuk periode ini"}
          >
            <Send className="h-4 w-4" />
            Publish Semua
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-input" onClick={() => navigateMonth(-1)} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1.5 rounded-md bg-input border text-sm font-medium min-w-[160px] text-center">
              {periodLabel}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-input" onClick={() => navigateMonth(1)} disabled={isPending}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Total Karyawan</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{totalConfigured}</p>
          <p className="text-xs text-muted-foreground">Terkonfigurasi</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalWithSlip}</p>
          <p className="text-xs text-muted-foreground">Slip Dibuat</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className={`text-2xl font-bold ${totalNeedRepublish > 0 ? "text-warning" : "text-success"}`}>
            {totalPublished}
          </p>
          <p className="text-xs text-muted-foreground">
            {totalNeedRepublish > 0 ? `${totalNeedRepublish} perlu publish ulang` : "Dipublish"}
          </p>
        </GlassCard>
      </div>

      {/* Republish warning banner */}
      {totalNeedRepublish > 0 && (
        <GlassCard className="p-3 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{totalNeedRepublish} karyawan</strong> memiliki slip yang belum/perlu dipublish ulang setelah perubahan gaji.
              Klik <strong>Publish Semua</strong> agar karyawan dapat melihat slip terbaru.
            </span>
          </div>
        </GlassCard>
      )}

      {/* Search */}
      <GlassCard className="p-3">
        <Input
          placeholder="Cari karyawan atau departemen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 bg-input"
        />
      </GlassCard>

      {/* Employee List */}
      <div className="space-y-2">
        {filteredEmployees.map((emp) => {
          const cfg = emp.payrollConfig
          const dailyRate = cfg ? Math.round(cfg.baseSalary26Days / 26) : 0
          const slip = emp.currentSlip
          const isRegenerating = regeneratingId === emp.id

          return (
            <GlassCard key={emp.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {emp.avatarUrl ? (
                    <img src={emp.avatarUrl} alt={emp.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {getInitials(emp.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{emp.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {emp.department && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{emp.department.name}</span>}
                      {emp.shift && <span>{emp.shift.name}</span>}
                    </div>
                  </div>
                </div>

                {/* Salary Info + Slip Status */}
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {cfg ? (
                    <>
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-muted-foreground">Gaji/26hr</p>
                        <p className="font-semibold text-foreground text-xs">{formatRp(cfg.baseSalary26Days)}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-muted-foreground">Per Hari</p>
                        <p className="font-semibold text-foreground text-xs">{formatRp(dailyRate)}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">Belum dikonfigurasi</span>
                  )}

                  {/* Slip status badge */}
                  {slip ? (
                    slip.isPublished ? (
                      <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        Draft
                      </span>
                    )
                  ) : cfg ? (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Belum digenerate</span>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs bg-input"
                    onClick={() => setConfigTarget(emp)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Atur Gaji
                  </Button>
                  {/* Regenerate button — only shown if a slip already exists (manual recalc after attendance fix) */}
                  {slip && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => handleRegenerate(emp)}
                      disabled={isRegenerating}
                      title="Kalkulasi ulang slip berdasarkan absensi terkini"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => handleViewSlip(emp)}
                    disabled={!slip}
                    title={slip ? "Lihat Slip Gaji" : "Slip belum tersedia"}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={!!configTarget} onOpenChange={(open) => { if (!open) setConfigTarget(null) }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Konfigurasi Gaji Karyawan</DialogTitle>
          </DialogHeader>
          {configTarget && (
            <ConfigEditor
              employee={configTarget}
              onClose={() => setConfigTarget(null)}
              onSaved={() => router.refresh()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payslip Preview Dialog has been removed */}

      {/* Publish All Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={(open) => { if (!isPending) setShowPublishDialog(open) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isPending ? "Mem-publish..." : "Publish Semua Slip Gaji"}</DialogTitle>
          </DialogHeader>
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Send className="h-10 w-10 text-primary animate-bounce" />
              <p className="text-center text-sm text-muted-foreground">
                Sistem sedang mem-publish slip gaji. Karyawan akan segera dapat melihatnya.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-foreground">
                Publish <strong>{totalWithSlip}</strong> slip gaji periode <strong>{periodLabel}</strong>?
                Karyawan akan dapat melihat slip di halaman profil mereka.
              </p>
              {totalNeedRepublish > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{totalNeedRepublish} slip belum dipublish karena ada perubahan gaji. Publish sekarang untuk memperbarui yang dilihat karyawan.</span>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Batal</Button>
                <Button onClick={handlePublishAll}>Ya, Publish</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
