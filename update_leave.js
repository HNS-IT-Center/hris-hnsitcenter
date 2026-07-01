const fs = require('fs')

const path = 'components/hris/pages/leave.tsx'
let content = fs.readFileSync(path, 'utf8')

// Change PendingRequest to AllRequest
content = content.replace(
  'import { submitLeaveRequest, approveLeaveRequest, type getPendingLeaveRequests, type getMyLeaveRequests } from "@/app/actions/leave"',
  'import { submitLeaveRequest, approveLeaveRequest, type getAllLeaveRequests, type getMyLeaveRequests } from "@/app/actions/leave"'
)

content = content.replace(
  'type PendingRequest = Awaited<ReturnType<typeof getPendingLeaveRequests>>[number]',
  'type AllRequest = Awaited<ReturnType<typeof getAllLeaveRequests>>[number]'
)

// The HrdView component needs a massive overhaul
const hrdViewRegex = /\/\/\s*───\s*HRD VIEW[\s\S]*?\/\/\s*───\s*EMPLOYEE VIEW/
const newHrdView = `// ─── HRD VIEW ─────────────────────────────────────────────────────────────────

function HrdView({ allRequests }: { allRequests: AllRequest[] }) {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<StatusFilter>("all")
  const [rejectReason, setRejectReason] = useState("")
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  
  // Date filters
  const [month, setMonth] = useState<number>(new Date().getMonth())
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const handleApprove = (id: string, approve: boolean, name: string, reason?: string) => {
    startTransition(async () => {
      const res = await approveLeaveRequest(id, approve, reason)
      if (res.success) {
        toast.success(approve ? "Izin disetujui" : "Izin ditolak", {
          description: \`Pengajuan \${name} \${approve ? "disetujui" : "ditolak"}.\`,
        })
        setRejectTargetId(null)
        setRejectReason("")
      } else {
        toast.error(res.error)
      }
    })
  }

  const handleVerify = (id: string, name: string) => {
    startTransition(async () => {
      // @ts-ignore
      const res = await import('@/app/actions/leave').then(m => m.verifySickLeave(id, true))
      if (res.success) {
        toast.success("Surat sakit terverifikasi", {
          description: \`Izin sakit \${name} sekarang berstatus Paid Leave.\`,
        })
      } else {
        toast.error(res.error)
      }
    })
  }

  // Filter requests
  const filtered = allRequests.filter(r => {
    const rDate = new Date(r.startDate)
    if (rDate.getMonth() !== month || rDate.getFullYear() !== year) return false
    if (tab !== "all" && r.status !== tab) return false
    return true
  })

  const isExpired = (endDate: Date) => Date.now() > new Date(endDate).getTime() + 86400000

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Riwayat & Approval Izin</h2>
        <div className="flex items-center gap-2">
          <select 
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({length: 12}).map((_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>
            ))}
          </select>
          <select 
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year-1, year, year+1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusFilter)} className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Disetujui</TabsTrigger>
          <TabsTrigger value="REJECTED">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const expired = isExpired(r.endDate)
            return (
              <GlassCard key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    r.type === 'ANNUAL_LEAVE' ? "bg-blue-500/15 text-blue-500" :
                    r.type === 'SICK' ? "bg-red-500/15 text-red-500" : 
                    "bg-orange-500/15 text-orange-500"
                  )}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.user.name}</p>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        r.type === 'ANNUAL_LEAVE' ? "bg-blue-500/20 text-blue-500" :
                        r.type === 'SICK' ? "bg-red-500/20 text-red-500" : 
                        "bg-orange-500/20 text-orange-500"
                      )}>{LEAVE_TYPE_LABELS[r.type] ?? r.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.startDate).toLocaleDateString("id-ID")} — {new Date(r.endDate).toLocaleDateString("id-ID")} · {Math.ceil(r.totalDays)} hari
                    </p>
                    {r.reason && <p className="mt-2 text-sm text-foreground bg-secondary/20 p-2 rounded-md border border-border/50">{r.reason}</p>}
                    {r.status === 'REJECTED' && r.rejectReason && (
                      <p className="mt-1 text-xs text-destructive">Alasan tolak: {r.rejectReason}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-end w-full gap-2">
                    <StatusBadge status={r.status.toLowerCase() as any} />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end mt-2">
                    {r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid && (
                      <div className="flex gap-2">
                        {(r as any).sickNoteUrl && (
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open((r as any).sickNoteUrl, '_blank')}>
                            <ExternalLink className="h-4 w-4" /> Lihat Surat
                          </Button>
                        )}
                        <Button size="sm" className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90" disabled={isPending || !(r as any).sickNoteUrl || expired} onClick={() => handleVerify(r.id, r.user.name)}>
                          <Check className="h-4 w-4" /> Verifikasi
                        </Button>
                      </div>
                    )}
                    
                    {!(r.type === 'SICK' && r.status === 'APPROVED' && !(r as any).isPaid) && !expired && (
                      <>
                        <Dialog open={rejectTargetId === r.id} onOpenChange={(open) => {
                          if(!open) { setRejectTargetId(null); setRejectReason(""); }
                          else setRejectTargetId(r.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={isPending}>
                              <X className="h-4 w-4" /> Tolak
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Tolak Pengajuan</DialogTitle>
                              <DialogDescription>Berikan alasan penolakan untuk {r.user.name}.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label>Alasan Penolakan</Label>
                              <Input className="mt-2" placeholder="Tidak diizinkan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRejectTargetId(null)}>Batal</Button>
                              <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleApprove(r.id, false, r.user.name, rejectReason)} disabled={isPending}>
                                {isPending ? "Memproses..." : "Konfirmasi Tolak"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {r.status !== 'APPROVED' && (
                          <Button size="sm" className="gap-1.5 bg-success text-primary-foreground hover:bg-success/90" disabled={isPending} onClick={() => handleApprove(r.id, true, r.user.name)}>
                            <Check className="h-4 w-4" /> Setujui
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── EMPLOYEE VIEW`

content = content.replace(hrdViewRegex, newHrdView)

// We also need to change LeavePage signature to accept allRequests instead of pendingRequests
content = content.replace(
  'export function LeavePage({ role, userId, pendingRequests, leaveRequests, leaveQuota }: {',
  'export function LeavePage({ role, userId, allRequests, leaveRequests, leaveQuota }: {'
)
content = content.replace(
  'pendingRequests?: PendingRequest[]',
  'allRequests?: AllRequest[]'
)
content = content.replace(
  'pendingRequests={pendingRequests!}',
  'allRequests={allRequests!}'
)

fs.writeFileSync(path, content)
console.log('leave.tsx updated')
