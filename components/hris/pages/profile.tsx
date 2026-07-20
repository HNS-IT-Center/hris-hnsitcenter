"use client"

import { GlassCard } from "@/components/hris/shared"
import { Briefcase, Building2, Camera, Clock, IdCard, Mail, MapPin, Phone, Check, Edit2, Loader2, X, Upload, Lock, Eye, EyeOff, FileText, Printer, Wallet } from "lucide-react"
import type { getMyLeaveQuota } from "@/app/actions/leave"
import type { getEmployeePayrollSlips } from "@/app/actions/payroll"
import { useState, useTransition, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateProfilePhoneNumber, updateProfileAvatar } from "@/app/actions/profile"
import { updatePassword } from "@/app/actions/auth-local"
import { compressToWebP, fileToBase64 } from "@/lib/utils/file"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { PayslipPrintView } from "@/components/hris/pages/payslip-print-view"

type LeaveQuota = Awaited<ReturnType<typeof getMyLeaveQuota>>
type PayrollSlip = Awaited<ReturnType<typeof getEmployeePayrollSlips>>[number]

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
  phoneNumber?: string | null
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

export function ProfilePage({ user, leaveQuota, hasPassword = false, payrollSlips = [] }: { user: UserProfile; leaveQuota: LeaveQuota; hasPassword?: boolean; payrollSlips?: PayrollSlip[] }) {
  const joinDate = new Date(user.joinDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(user.phoneNumber ?? "")
  const [currentPhone, setCurrentPhone] = useState(user.phoneNumber ?? "")
  const [isPending, startTransition] = useTransition()
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPendingPassword, startTransitionPassword] = useTransition()

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok")
      return
    }
    startTransitionPassword(async () => {
      const res = await updatePassword(newPassword)
      if (res.success) {
        toast.success("Password berhasil disimpan")
        setIsEditingPassword(false)
        setNewPassword("")
        setConfirmPassword("")
        // Refresh page so hasPassword becomes true if it wasn't
        window.location.reload()
      } else {
        toast.error(res.error)
      }
    })
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    try {
      const compressed = await compressToWebP(file, 0.90)
      const base64 = await fileToBase64(compressed)
      
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, userId: user.id })
      })
      const data = await res.json()
      
      if (res.ok && data.url) {
        const updateRes = await updateProfileAvatar(data.url)
        if (updateRes.success) {
          toast.success("Foto profil berhasil diperbarui")
        } else {
          toast.error(updateRes.error || "Gagal menyimpan foto profil.")
        }
      } else {
        toast.error("Gagal mengunggah foto", { description: data.error })
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunggah foto")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSavePhone() {
    startTransition(async () => {
      const res = await updateProfilePhoneNumber(phoneInput)
      if (res.success && res.formattedNumber) {
        setCurrentPhone(res.formattedNumber)
        setPhoneInput(res.formattedNumber)
        setIsEditingPhone(false)
        toast.success("Nomor telepon berhasil diperbarui")
      } else {
        toast.error(res.error || "Gagal menyimpan nomor telepon")
      }
    })
  }

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
      <div className="rounded-2xl border border-primary/20 bg-primary p-6 shadow-sm text-primary-foreground">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold overflow-hidden relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(user.name)
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 items-center justify-center flex opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Upload className="h-5 w-5 text-white" />}
              </div>
            </div>
            {/* Always-visible camera badge — tells user the photo is editable */}
            <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary-foreground shadow-md">
              {isUploading
                ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                : <Camera className="h-3.5 w-3.5 text-primary" />}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-primary-foreground/80">{user.positionName ?? ROLE_LABELS[user.role] ?? user.role}</p>
            <p className="mt-1 text-sm text-primary-foreground/60">{user.email}</p>
          </div>
        </div>
      </div>

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

          <div className="mt-6 border-t border-border pt-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Kontak Darurat / WhatsApp</h4>
            <div className="flex items-center gap-3 max-w-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Nomor Telepon</p>
                {isEditingPhone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={phoneInput} 
                      onChange={(e) => setPhoneInput(e.target.value)} 
                      placeholder="0812..." 
                      className="h-8 text-sm"
                      disabled={isPending}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success/80 shrink-0" onClick={handleSavePhone} disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => { setIsEditingPhone(false); setPhoneInput(currentPhone) }} disabled={isPending}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{currentPhone || "Belum diatur"}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setIsEditingPhone(true)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Keamanan Akun</h4>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Password Lokal</p>
                {isEditingPassword ? (
                  <form onSubmit={handleSavePassword} className="mt-2 space-y-2 max-w-sm">
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Password Baru" 
                        className="h-8 pr-8 text-sm"
                        disabled={isPendingPassword}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Konfirmasi Password" 
                        className="h-8 pr-8 text-sm"
                        disabled={isPendingPassword}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs" disabled={isPendingPassword}>
                        {isPendingPassword ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Simpan
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingPassword(false)} disabled={isPendingPassword}>
                        Batal
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm font-medium text-foreground">
                      {hasPassword ? "••••••••" : "Belum diatur"}
                    </p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsEditingPassword(true)}>
                      {hasPassword ? "Ubah" : "Buat"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
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

      {/* ── Riwayat Slip Gaji ──────────────────────────────────────────────────── */}
      {payrollSlips.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Riwayat Slip Gaji</h3>
          </div>
          <div className="space-y-2">
            {payrollSlips.map((slip) => (
              <div
                key={slip.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Periode {format(new Date(slip.periodStart), "d MMM", { locale: id })} – {format(new Date(slip.periodEnd), "d MMM yyyy", { locale: id })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {slip.scheduledWorkDays} hari kerja &middot; {format(new Date(slip.periodEnd), "MMMM yyyy", { locale: id })}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-success">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(slip.totalPenerimaan)}
                  </p>
                  <button
                    className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1 ml-auto"
                    onClick={() => setSelectedSlip(slip as any)}
                    title="Lihat & Cetak Slip Gaji"
                  >
                    <FileText className="h-3 w-3" />
                    Lihat & Cetak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Slip Gaji Viewer / Print Dialog ── */}
      <Dialog open={!!selectedSlip} onOpenChange={(open) => { if (!open) setSelectedSlip(null) }}>
        <DialogContent className="max-w-4xl w-full max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Slip Gaji</DialogTitle>
          </DialogHeader>
          {selectedSlip && (
            <div className="p-4 sm:p-6">
              <div className="flex justify-end mb-4 no-print">
                <Button variant="ghost" size="sm" onClick={() => setSelectedSlip(null)} className="text-xs">
                  Tutup
                </Button>
              </div>
              <PayslipPrintView slip={selectedSlip as any} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
