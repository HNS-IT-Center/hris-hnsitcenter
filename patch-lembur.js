const fs = require('fs');
let content = fs.readFileSync('components/hris/pages/leave.tsx', 'utf-8');

if (!content.includes('submitOvertimeRequest')) {
  content = content.replace(
    `import { submitLeaveRequest`,
    `import { submitOvertimeRequest } from "@/app/actions/overtime"\nimport { submitLeaveRequest`
  );
}

content = content.replace(
  `function EmployeeView({ userId, leaveRequests, leaveQuota, weeklyOffDays, holidays }: {`,
  `function RequestLemburForm({ onDone }: { onDone: () => void }) {\n  const [isPending, startTransition] = useTransition()\n  const [date, setDate] = useState<Date>()\n  const [startTime, setStartTime] = useState<Date>()\n  const [endTime, setEndTime] = useState<Date>()\n  const [task, setTask] = useState("")\n\n  const onSubmit = (e: React.FormEvent) => {\n    e.preventDefault()\n    if (!date || !startTime || !endTime || !task) return toast.error("Mohon lengkapi semua field")\n\n    const sTime = new Date(date)\n    sTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)\n    \n    const eTime = new Date(date)\n    eTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)\n\n    if (eTime <= sTime) {\n      return toast.error("Waktu selesai harus lebih dari waktu mulai")\n    }\n\n    startTransition(async () => {\n      const res = await submitOvertimeRequest({\n        overtimeDate: date,\n        startTime: sTime,\n        endTime: eTime,\n        task\n      })\n      if (res.success) {\n        toast.success("Lembur berhasil diajukan")\n        onDone()\n      } else {\n        toast.error(res.error)\n      }\n    })\n  }\n\n  return (\n    <form onSubmit={onSubmit} className="space-y-4">\n      <div className="space-y-2">\n        <Label>Tanggal Lembur (Bisa pilih tanggal sebelumnya)</Label>\n        <Popover>\n          <PopoverTrigger asChild>\n            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>\n              <CalendarIcon className="mr-2 h-4 w-4" />\n              {date ? format(date, "PPP", { locale: localeID }) : <span>Pilih Tanggal</span>}\n            </Button>\n          </PopoverTrigger>\n          <PopoverContent className="w-auto p-0" align="start">\n            <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />\n          </PopoverContent>\n        </Popover>\n      </div>\n      <div className="grid grid-cols-2 gap-4">\n        <div className="space-y-2">\n          <Label>Jam Mulai</Label>\n          <TimePicker date={startTime} setDate={setStartTime} />\n        </div>\n        <div className="space-y-2">\n          <Label>Jam Selesai</Label>\n          <TimePicker date={endTime} setDate={setEndTime} />\n        </div>\n      </div>\n      <div className="space-y-2">\n        <Label>Tugas / Pekerjaan</Label>\n        <Textarea placeholder="Jelaskan apa yang dikerjakan saat lembur..." value={task} onChange={e => setTask(e.target.value)} required />\n      </div>\n      <DialogFooter className="mt-4">\n        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>Batal</Button>\n        <Button type="submit" disabled={isPending}>{isPending ? "Mengajukan..." : "Ajukan Lembur"}</Button>\n      </DialogFooter>\n    </form>\n  )\n}\n\nfunction EmployeeView({ userId, leaveRequests, leaveQuota, weeklyOffDays, holidays }: {`
);

content = content.replace(
  `const [open, setOpen] = useState(false)`,
  `const [open, setOpen] = useState(false)\n  const [openLembur, setOpenLembur] = useState(false)`
);

content = content.replace(
  `        <Dialog open={open} onOpenChange={setOpen}>\n          <DialogTrigger asChild>\n            <Button className="gap-1.5 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">\n              <Plus className="h-4 w-4" /> Ajukan Izin\n            </Button>\n          </DialogTrigger>`,
  `        <div className="flex gap-2 w-full sm:w-auto">\n        <Dialog open={open} onOpenChange={setOpen}>\n          <DialogTrigger asChild>\n            <Button className="gap-1.5 flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90">\n              <Plus className="h-4 w-4" /> Izin\n            </Button>\n          </DialogTrigger>`
);

content = content.replace(
  `            <RequestForm userId={userId} weeklyOffDays={weeklyOffDays} holidays={holidays} onDone={() => setOpen(false)} />\n          </DialogContent>\n        </Dialog>\n      </div>`,
  `            <RequestForm userId={userId} weeklyOffDays={weeklyOffDays} holidays={holidays} onDone={() => setOpen(false)} />\n          </DialogContent>\n        </Dialog>\n        <Dialog open={openLembur} onOpenChange={setOpenLembur}>\n          <DialogTrigger asChild>\n            <Button variant="outline" className="gap-1.5 flex-1 sm:flex-none text-primary border-primary/20 hover:bg-primary/10">\n              <Timer className="h-4 w-4" /> Lembur\n            </Button>\n          </DialogTrigger>\n          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">\n            <DialogHeader>\n              <DialogTitle>Ajukan Lembur</DialogTitle>\n              <DialogDescription>Lengkapi formulir untuk mencatat jam lembur Anda.</DialogDescription>\n            </DialogHeader>\n            <RequestLemburForm onDone={() => setOpenLembur(false)} />\n          </DialogContent>\n        </Dialog>\n        </div>\n      </div>`
);

fs.writeFileSync('components/hris/pages/leave.tsx', content);
console.log("Lembur UI patched");
