"use client"

import { GlassCard } from "@/components/hris/shared"
import { Briefcase, Building2, Camera, Clock, IdCard, Mail, MapPin, Phone, Check, Edit2, Loader2, X, Upload, Lock, Eye, FileText, Wallet } from "lucide-react"
import type { getMyLeaveQuota } from "@/app/actions/leave"
import type { getEmployeePayrollSlips } from "@/app/actions/payroll"
import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ImageCropperDialog } from "@/components/hris/shared/image-cropper"
import { updateProfilePhoneNumber, updateProfileAvatar } from "@/app/actions/profile"
import { compressToWebP, fileToBase64 } from "@/lib/utils/file"
import { format } from "date-fns"
import { id } from "date-fns/locale"

type LeaveQuota = Awaited<ReturnType<typeof getMyLeaveQuota>>
type PayrollSlip = Awaited<ReturnType<typeof getEmployeePayrollSlips>>[number]

type UserProfile = {
  id: string
  name: string
  email: string
  username?: string | null
  avatarUrl?: string | null
  avatarOriginalUrl?: string | null
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

export function ProfilePage({ user, leaveQuota, ssoAccountUrl = null, payrollSlips = [] }: { user: UserProfile; leaveQuota: LeaveQuota; ssoAccountUrl?: string | null; payrollSlips?: PayrollSlip[] }) {
  const router = useRouter()
  const joinDate = new Date(user.joinDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(user.phoneNumber ?? "")
  const [currentPhone, setCurrentPhone] = useState(user.phoneNumber ?? "")
  const [isPending, startTransition] = useTransition()
  
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [uncroppedImageSrc, setUncroppedImageSrc] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const objectUrl = URL.createObjectURL(file)
    setUncroppedImageSrc(objectUrl)
    setCropDialogOpen(true)
    
    e.target.value = ''
  }

  const handleViewAdjust = () => {
    if (user.avatarOriginalUrl) {
      setUncroppedImageSrc(user.avatarOriginalUrl)
      setCropDialogOpen(true)
    } else if (user.avatarUrl) {
      setUncroppedImageSrc(user.avatarUrl)
      setCropDialogOpen(true)
    }
  }

  async function handleCroppedImage(croppedBase64: string) {
    if (!uncroppedImageSrc) return
    setIsUploading(true)
    try {
      // Create a Blob from the object URL to process the original file
      const response = await fetch(uncroppedImageSrc)
      const blob = await response.blob()
      
      const compressedOriginal = await compressToWebP(new File([blob], "original.jpg", { type: blob.type }), 0.90)
      const originalBase64 = await fileToBase64(compressedOriginal)
      
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileBase64: croppedBase64, 
          originalBase64: originalBase64,
          userId: user.id 
        })
      })
      const data = await res.json()
      
      if (res.ok && data.url) {
        const updateRes = await updateProfileAvatar(data.url, data.originalUrl)
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
    { label: "ID Karyawan", value: user.employeeId ?? user.id.slice(0, 8).toUpperCase(), icon: IdCard },
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group cursor-pointer outline-none">
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
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(user.avatarOriginalUrl || user.avatarUrl) && (
                <DropdownMenuItem onClick={handleViewAdjust}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Lihat / Sesuaikan Foto</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Ubah Foto</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
          
          {uncroppedImageSrc && (
            <ImageCropperDialog
              open={cropDialogOpen}
              onOpenChange={(val) => {
                setCropDialogOpen(val)
                if (!val) setUncroppedImageSrc(null)
              }}
              imageSrc={uncroppedImageSrc}
              onComplete={handleCroppedImage}
            />
          )}
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
                <p className="text-xs text-muted-foreground">Password & Keamanan</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-sm text-foreground">
                    Dikelola di SSO HNS IT Center
                  </p>
                  {ssoAccountUrl && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <a href={ssoAccountUrl} target="_blank" rel="noopener noreferrer">Buka SSO</a>
                    </Button>
                  )}
                </div>
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
                    onClick={() => router.push(`/profile/payslip/${slip.slug}`)}
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
    </div>
  )
}
