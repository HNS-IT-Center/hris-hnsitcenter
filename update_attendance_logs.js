const fs = require('fs')

const path = 'components/hris/pages/hrd-attendance-logs.tsx'
let content = fs.readFileSync(path, 'utf8')

// Add imports
if (!content.includes('overrideAttendance')) {
  content = content.replace(
    'import type { getHrdAttendanceLogs } from "@/app/actions/dashboard"',
    'import type { getHrdAttendanceLogs } from "@/app/actions/dashboard"\nimport { overrideAttendance } from "@/app/actions/attendance"'
  )
}

// Add state to HrdAttendanceLogs component
const stateHookTarget = 'const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>()'
if (!content.includes('const [isPending, startTransition] = useTransition()')) {
  // It has `const [, startTransition] = useTransition()`
  content = content.replace(
    'const [, startTransition] = useTransition()',
    'const [isPending, startTransition] = useTransition()'
  )
}
if (!content.includes('const [overrideStatus, setOverrideStatus]')) {
  content = content.replace(
    stateHookTarget,
    `${stateHookTarget}\n  const [overrideStatus, setOverrideStatus] = useState<DisplayStatus>("PRESENT")\n  const [overrideReason, setOverrideReason] = useState("")\n  const [isOverriding, setIsOverriding] = useState(false)`
  )
}

// Add override handler
const handlerInsertionTarget = 'const handleDateChange = (newDate: string) => {'
if (!content.includes('const handleOverride = async () => {')) {
  const overrideHandler = `
  const handleOverride = async () => {
    if (!selectedLog || !selectedLog.attendance) return
    if (!overrideReason.trim()) {
      toast.error("Alasan dispensasi wajib diisi.")
      return
    }
    
    setIsOverriding(true)
    const res = await overrideAttendance(selectedLog.attendance.id, overrideStatus as any, overrideReason)
    setIsOverriding(false)
    
    if (res.success) {
      toast.success("Status absensi berhasil diubah")
      setModalOpen(false)
      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } else {
      toast.error(res.error)
    }
  }

  `
  content = content.replace(handlerInsertionTarget, overrideHandler + handlerInsertionTarget)
}

// Ensure the Dialog handles the new state on open/close
content = content.replace(
  'if (!open) setSelectedLog(null)',
  'if (!open) { setSelectedLog(null); setOverrideReason(""); setOverrideStatus("PRESENT"); }'
)

// Add the Override UI into the Modal
const modalTarget = '{/* Check-Out Details */}'
const overrideUI = `
              {/* Override / Dispensasi Section */}
              {selectedLog.attendance && (
                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm">Ubah Status (Dispensasi)</h4>
                    {selectedLog.attendance.isOverridden && (
                      <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">TER-OVERRIDE</span>
                    )}
                  </div>
                  
                  {selectedLog.attendance.isOverridden && selectedLog.attendance.overrideReason && (
                    <div className="bg-muted p-2 rounded-md text-xs mb-3 border border-border">
                      <span className="font-bold">Alasan Override Sebelumnya: </span> 
                      {selectedLog.attendance.overrideReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Status Baru</label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value as DisplayStatus)}
                      >
                        <option value="PRESENT">Hadir (Tepat Waktu)</option>
                        <option value="LATE">Telat</option>
                        <option value="ALPHA">Alpha</option>
                        <option value="ON_LEAVE">Izin/Cuti</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Alasan (Wajib)</label>
                      <Input 
                        placeholder="Contoh: Sakit mendadak, lupa absen..." 
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    onClick={handleOverride} 
                    disabled={isOverriding || !overrideReason.trim()}
                  >
                    {isOverriding ? "Menyimpan..." : "Simpan Perubahan Status"}
                  </Button>
                </div>
              )}

`

if (!content.includes('Ubah Status (Dispensasi)')) {
  content = content.replace(modalTarget, overrideUI + modalTarget)
}

fs.writeFileSync(path, content)
console.log('hrd-attendance-logs.tsx updated')
