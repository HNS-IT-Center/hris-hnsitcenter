export type Role = "employee" | "hrd"

export type LeaveStatus = "pending" | "approved" | "rejected"
export type LeaveType = "annual" | "sick" | "personal" | "late" | "halfday"
export type AttendanceStatus = "hadir" | "telat" | "alpha" | "izin" | "cuti"

export const CURRENT_USER = {
  name: "Andi Pratama",
  initials: "AP",
  role: "Frontend Developer",
  department: "Engineering",
  store: "HNS Pusat - Jakarta",
  shift: "Pagi (08:00 - 17:00)",
  email: "andi.pratama@hnsitcenter.com",
  joinDate: "12 Jan 2023",
  employeeId: "HNS-0231",
}

export const LEAVE_QUOTA = { total: 12, used: 5, remaining: 7 }

export const MONTHLY_SUMMARY = {
  hadir: 18,
  telat: 2,
  alpha: 1,
  izin: 1,
  cuti: 2,
  remaining: LEAVE_QUOTA.remaining,
}

export type LeaveRequest = {
  id: string
  type: LeaveType
  typeLabel: string
  dateRange: string
  duration: string
  status: LeaveStatus
  reason: string
  employee?: string
}

export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: "LV-1042", type: "annual", typeLabel: "Cuti Tahunan", dateRange: "28 - 30 Jun 2026", duration: "3 hari", status: "pending", reason: "Liburan keluarga ke Bandung", employee: "Andi Pratama" },
  { id: "LV-1038", type: "sick", typeLabel: "Sakit", dateRange: "20 Jun 2026", duration: "1 hari", status: "approved", reason: "Demam dan flu, lampiran surat dokter", employee: "Andi Pratama" },
  { id: "LV-1031", type: "personal", typeLabel: "Keperluan Pribadi", dateRange: "12 Jun 2026", duration: "1 hari", status: "rejected", reason: "Mengurus dokumen kependudukan", employee: "Andi Pratama" },
  { id: "LV-1025", type: "halfday", typeLabel: "Setengah Hari", dateRange: "05 Jun 2026", duration: "0.5 hari", status: "approved", reason: "Kontrol kesehatan rutin", employee: "Andi Pratama" },
]

export const PENDING_APPROVALS: LeaveRequest[] = [
  { id: "LV-1051", type: "annual", typeLabel: "Cuti Tahunan", dateRange: "01 - 03 Jul 2026", duration: "3 hari", status: "pending", reason: "Acara pernikahan saudara", employee: "Siti Rahma" },
  { id: "LV-1050", type: "sick", typeLabel: "Sakit", dateRange: "27 Jun 2026", duration: "1 hari", status: "pending", reason: "Sakit kepala, ada surat dokter", employee: "Budi Santoso" },
  { id: "LV-1049", type: "personal", typeLabel: "Keperluan Pribadi", dateRange: "29 Jun 2026", duration: "1 hari", status: "pending", reason: "Mengantar orang tua ke rumah sakit", employee: "Dewi Lestari" },
]

export const ANNOUNCEMENTS = [
  { id: "1", title: "Libur Nasional Idul Adha", message: "Kantor akan tutup pada tanggal 6-7 Juli 2026. Selamat merayakan bagi yang menjalankan.", tag: "event", time: "2 jam lalu" },
  { id: "2", title: "Update Kebijakan Absensi", message: "Mulai 1 Juli, toleransi keterlambatan menjadi 10 menit. Mohon diperhatikan.", tag: "urgent", time: "1 hari lalu" },
  { id: "3", title: "Town Hall Q3 2026", message: "Akan diadakan town hall meeting pada 15 Juli pukul 14:00 di aula utama.", tag: "notice", time: "3 hari lalu" },
]

export type Employee = {
  id: string
  name: string
  initials: string
  department: string
  position: string
  store: string
  shift: string
  joinDate: string
  status: "active" | "inactive"
}

export const EMPLOYEES: Employee[] = [
  { id: "HNS-0231", name: "Andi Pratama", initials: "AP", department: "Engineering", position: "Frontend Developer", store: "HNS Pusat", shift: "Pagi", joinDate: "12 Jan 2023", status: "active" },
  { id: "HNS-0198", name: "Siti Rahma", initials: "SR", department: "Sales", position: "Sales Associate", store: "HNS Mall Kelapa Gading", shift: "Siang", joinDate: "03 Mar 2022", status: "active" },
  { id: "HNS-0210", name: "Budi Santoso", initials: "BS", department: "Operations", position: "Store Supervisor", store: "HNS Bandung", shift: "Pagi", joinDate: "18 Jul 2021", status: "active" },
  { id: "HNS-0245", name: "Dewi Lestari", initials: "DL", department: "Finance", position: "Accountant", store: "HNS Pusat", shift: "Pagi", joinDate: "29 Sep 2023", status: "active" },
  { id: "HNS-0150", name: "Rizki Hidayat", initials: "RH", department: "Engineering", position: "Backend Developer", store: "HNS Pusat", shift: "Pagi", joinDate: "11 Feb 2020", status: "active" },
  { id: "HNS-0267", name: "Maya Putri", initials: "MP", department: "Sales", position: "Cashier", store: "HNS Surabaya", shift: "Siang", joinDate: "07 Dec 2023", status: "inactive" },
]

export const HRD_STATS = {
  totalActive: 142,
  present: 118,
  late: 9,
  missing: 6,
  onLeave: 9,
}

export type AttentionFlag = {
  id: string
  title: string
  description: string
  severity: "warning" | "danger"
}

export const ATTENTION_FLAGS: AttentionFlag[] = [
  { id: "1", title: "Anomali Absensi", description: "Rizki Hidayat absen masuk dari lokasi 2.4km dari toko.", severity: "danger" },
  { id: "2", title: "Lupa Absen Pulang", description: "3 karyawan belum melakukan absen pulang kemarin.", severity: "warning" },
  { id: "3", title: "Email Bounce", description: "Email broadcast ke maya.putri@... gagal terkirim.", severity: "warning" },
]

export type Candidate = {
  id: string
  name: string
  email: string
  position: string
  stage: "waiting" | "interview1" | "interview2" | "accepted" | "rejected"
  interviewDate: string
}

export const CANDIDATES: Candidate[] = [
  { id: "C-01", name: "Fajar Nugroho", email: "fajar.n@gmail.com", position: "UI/UX Designer", stage: "waiting", interviewDate: "30 Jun 2026" },
  { id: "C-02", name: "Lina Marlina", email: "lina.m@gmail.com", position: "Sales Associate", stage: "interview1", interviewDate: "29 Jun 2026" },
  { id: "C-03", name: "Hendra Wijaya", email: "hendra.w@gmail.com", position: "Backend Developer", stage: "interview2", interviewDate: "28 Jun 2026" },
  { id: "C-04", name: "Putri Ananda", email: "putri.a@gmail.com", position: "HR Generalist", stage: "accepted", interviewDate: "25 Jun 2026" },
  { id: "C-05", name: "Galih Saputra", email: "galih.s@gmail.com", position: "Cashier", stage: "rejected", interviewDate: "22 Jun 2026" },
]

export const STORES = [
  { id: "ST-01", name: "HNS Pusat", address: "Jl. Sudirman No. 12, Jakarta", radius: 150, hours: "08:00 - 21:00", employees: 48 },
  { id: "ST-02", name: "HNS Mall Kelapa Gading", address: "Mall Kelapa Gading Lt. 2, Jakarta", radius: 100, hours: "10:00 - 22:00", employees: 22 },
  { id: "ST-03", name: "HNS Bandung", address: "Jl. Dago No. 88, Bandung", radius: 200, hours: "09:00 - 21:00", employees: 31 },
  { id: "ST-04", name: "HNS Surabaya", address: "Tunjungan Plaza Lt. 3, Surabaya", radius: 120, hours: "10:00 - 22:00", employees: 26 },
]

export const SHIFTS = [
  { id: "SH-01", name: "Pagi", start: "08:00", end: "17:00", window: 15, employees: 64 },
  { id: "SH-02", name: "Siang", start: "13:00", end: "22:00", window: 15, employees: 52 },
  { id: "SH-03", name: "Malam", start: "21:00", end: "06:00", window: 20, employees: 26 },
]

export const DEPARTMENTS = ["Engineering", "Sales", "Operations", "Finance", "HR"]

export type CalendarEventType = "event" | "rainy" | "holiday" | "notice"
export type AudienceScope = "all" | "department" | "shift" | "store" | "individual"

export const CALENDAR_EVENT_TYPES: { id: CalendarEventType; label: string; color: string; dot: string }[] = [
  { id: "event", label: "Event", color: "bg-secondary/15 text-secondary border-secondary/30", dot: "bg-secondary" },
  { id: "rainy", label: "Hari Hujan", color: "bg-accent/30 text-accent-foreground border-accent/50", dot: "bg-accent" },
  { id: "holiday", label: "Libur", color: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  { id: "notice", label: "Pengumuman", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
]

export type CalendarEvent = {
  id: string
  date: string // ISO yyyy-mm-dd
  title: string
  type: CalendarEventType
  scope: AudienceScope
  scopeValue?: string
  note?: string
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "CE-01", date: "2026-06-29", title: "Hari Hujan - Dispensasi Telat", type: "rainy", scope: "store", scopeValue: "HNS Bandung", note: "Toleransi keterlambatan diperpanjang 30 menit." },
  { id: "CE-02", date: "2026-07-06", title: "Libur Idul Adha", type: "holiday", scope: "all", note: "Seluruh toko tutup." },
  { id: "CE-03", date: "2026-07-15", title: "Town Hall Q3 2026", type: "event", scope: "department", scopeValue: "Engineering", note: "Aula utama pukul 14:00." },
  { id: "CE-04", date: "2026-07-10", title: "Briefing Shift Malam", type: "notice", scope: "shift", scopeValue: "Malam", note: "Evaluasi target bulanan." },
]
