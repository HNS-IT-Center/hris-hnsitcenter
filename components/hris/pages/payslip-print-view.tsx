"use client"

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Printer, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { PayrollSlip } from "@prisma/client"

/**
 * PayslipPrintView — Full-page standalone payslip viewer.
 *
 * Layout strategy (same as Rekap Absensi):
 * - On screen: grey background, centered white A4 card, control bar on top
 * - On print: @media print hides everything except the A4 card itself,
 *   which fills the page exactly (size: A4 portrait, margin: 15mm)
 * - Fixed max-width 210mm so the layout is IDENTICAL on mobile and desktop
 */
export function PayslipPrintView({ slip }: { slip: PayrollSlip & { user: any } }) {
  const router = useRouter()

  const rows = {
    pendapatan: [
      { label: "Gaji Pokok", value: slip.gajiPokok },
      { label: "Tunjangan Transport", value: slip.transport },
      { label: "Uang Makan", value: slip.uangMakan },
      { label: "Tunjangan Lainnya", value: slip.tunjanganLainnya },
      { label: "Lembur", value: slip.lembur },
    ],
    potongan: [
      { label: "BPJS Ketenagakerjaan", value: slip.bpjs },
      { label: "Pajak PPh21", value: slip.pph21 },
      { label: "Potongan Izin / Tidak Hadir", value: slip.potonganIzin },
      { label: "Keterlambatan / Lupa Absen", value: slip.potonganTerlambat },
      { label: "Potongan Lainnya", value: slip.potonganLainnya },
    ],
    kehadiran: [
      { label: "Hadir", value: slip.kehadiran, right: { label: "Sakit", value: slip.sakit } },
      { label: "Tidak Hadir", value: slip.ketidakhadiran, right: { label: "Izin Setengah Hari", value: slip.izinSetengahHari } },
      { label: "Cuti", value: slip.cuti, right: { label: "Terlambat", value: slip.terlambat } },
      { label: "Izin", value: slip.izin, right: { label: "Lupa Absen", value: slip.lupaAbsen } },
    ],
  }

  return (
    <div className="w-full min-h-screen bg-gray-100 print:bg-white print:min-h-0">

      {/* ── Print CSS ─────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }

          /* Force white background everywhere */
          body, html { background: white !important; }

          /* Hide ALL chrome: sidebar, topbar, nav, control bar */
          .no-print { display: none !important; }
          #app-sidebar, #app-topbar, nav, header, aside,
          [data-sidebar], .topbar { display: none !important; }

          /* Remove dashboard layout padding */
          main, .dashboard-main-content { padding: 0 !important; margin: 0 !important; }

          /* The grey page wrapper becomes transparent */
          .slip-page-bg { background: white !important; padding: 0 !important; }

          /* The A4 card fills the page */
          .slip-a4-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }

          /* Ensure colors print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* ── Screen Control Bar (hidden on print) ─────────────────────────── */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full max-w-[210mm] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <div className="text-center min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              Slip Gaji — {format(new Date(slip.periodEnd), "MMMM yyyy", { locale: id })}
            </p>
            <p className="text-xs text-gray-500">
              {slip.user?.name}
            </p>
          </div>
          <Button onClick={() => window.print()} size="sm" className="gap-1.5 shrink-0">
            <Printer className="h-4 w-4" />
            Cetak / Simpan PDF
          </Button>
        </div>
      </div>

      {/* ── Page Background (grey on screen, white on print) ──────────────── */}
      <div className="slip-page-bg w-full px-4 py-8 print:px-0 print:py-0">

        {/* ── A4 Card — fixed 210mm max-width, always same layout ─────────── */}
        <div
          className="slip-a4-card bg-white mx-auto shadow-lg"
          style={{
            maxWidth: "210mm",
            width: "100%",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: "12px",
            color: "#000",
          }}
        >

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex justify-between items-start px-6 py-5 border-b-2 border-gray-800">
            <div>
              <div className="font-bold text-base leading-tight">PT SENTRAL BERKAT TEKNOLOGI</div>
              <div className="text-sm text-gray-600 mt-0.5">{slip.user?.store?.name ?? "HNS IT CENTER"}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl tracking-[0.2em] text-gray-800 uppercase">SLIP GAJI</div>
            </div>
          </div>

          {/* ── Employee Info ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="space-y-1">
              <InfoRow label="Nama / NIK" value={`${slip.user?.name?.toUpperCase()} - ${slip.user?.employeeId ?? '-'}`} bold />
              <InfoRow label="Divisi / Jabatan" value={slip.user?.positionName ?? slip.user?.department?.name ?? slip.user?.departmentName ?? "—"} />
              <InfoRow label="Tgl Mulai Bekerja" value={slip.user?.joinDate ? format(new Date(slip.user.joinDate), "dd/MM/yyyy") : "—"} />
              <InfoRow label="Gaji Bulan" value={format(new Date(slip.periodEnd), "MMMM yyyy", { locale: id }).toUpperCase()} bold />
            </div>
            <div className="text-right text-[11px] text-gray-500 space-y-1">
              <p>Periode: {format(new Date(slip.periodStart), "d MMM", { locale: id })} – {format(new Date(slip.periodEnd), "d MMM yyyy", { locale: id })}</p>
              <p>Hari Kerja Terjadwal: <span className="font-bold text-gray-800">{slip.scheduledWorkDays} hari</span></p>
            </div>
          </div>

          {/* ── Pendapatan & Potongan ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 border-b border-gray-200">

            {/* Pendapatan */}
            <div className="border-r border-gray-200 px-5 py-4">
              <SectionHeader>Pendapatan</SectionHeader>
              <div className="space-y-1 mt-2">
                {rows.pendapatan.map((r) => (
                  <MoneyRow key={r.label} label={r.label} value={r.value} />
                ))}
              </div>
              <div className="mt-3 pt-2 border-t-2 border-gray-800 flex justify-between font-bold text-[12px]">
                <span>Total Pendapatan</span>
                <span>Rp {slip.totalPendapatan.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Potongan */}
            <div className="px-5 py-4">
              <SectionHeader>Potongan</SectionHeader>
              <div className="space-y-1 mt-2">
                {rows.potongan.map((r) => (
                  <MoneyRow key={r.label} label={r.label} value={r.value} deduction />
                ))}
              </div>
              <div className="mt-3 pt-2 border-t-2 border-gray-800 flex justify-between font-bold text-[12px]">
                <span>Total Potongan</span>
                <span className="text-red-700">{slip.totalPotongan > 0 ? `Rp ${slip.totalPotongan.toLocaleString("id-ID")}` : "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Net Total ────────────────────────────────────────────────── */}
          <div className="px-5 py-4 bg-gray-50 border-b-2 border-gray-800 flex justify-between items-center">
            <span className="font-bold text-[13px] uppercase tracking-wide">Total Penerimaan Bersih</span>
            <span className="font-black text-[15px]">Rp {slip.totalPenerimaan.toLocaleString("id-ID")}</span>
          </div>

          {/* ── Kehadiran ─────────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-gray-200">
            <SectionHeader>Rangkuman Informasi Kehadiran</SectionHeader>
            <div className="grid grid-cols-2 gap-x-10 gap-y-0.5 mt-2">
              {rows.kehadiran.map((r, i) => (
                <div key={i} className="contents">
                  <div className="flex justify-between text-[11px] py-0.5">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-semibold">{r.value === 0 ? "—" : r.value}</span>
                  </div>
                  <div className="flex justify-between text-[11px] py-0.5">
                    <span className="text-gray-500">{r.right.label}</span>
                    <span className="font-semibold">{r.right.value === 0 ? "—" : r.right.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Signatures / Footer ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 px-5 py-6">
            <div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Pembayaran gaji telah dilakukan oleh perusahaan<br />
                secara Transfer ke rekening karyawan.
              </p>
              {slip.notes && (
                <p className="text-[10px] text-gray-600 mt-2 p-2 border border-gray-200 rounded italic">
                  <span className="font-semibold not-italic">Catatan: </span>{slip.notes}
                </p>
              )}
              <div className="mt-10 text-[10px] text-gray-500">
                <p>Diterima oleh,</p>
                <div className="mt-8 border-t border-gray-700 w-36 pt-1 font-semibold text-gray-700">
                  {slip.user?.name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-400">
                Digenerate otomatis oleh Sistem HRIS<br />
                {format(new Date(slip.generatedAt), "dd/MM/yyyy HH:mm")}
              </p>
              <div className="mt-10 text-[10px] text-gray-500 text-right">
                <p>Diketahui oleh,</p>
                <div className="mt-8 border-t border-gray-700 w-36 pt-1 ml-auto" />
              </div>
            </div>
          </div>

        </div>
        {/* bottom breathing room on screen */}
        <div className="no-print h-12" />
      </div>
    </div>
  )
}

// ── Small helper sub-components ───────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-bold text-[11px] uppercase tracking-wider text-gray-700 bg-gray-100 px-2 py-1 rounded-sm">
      {children}
    </div>
  )
}

function InfoRow({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className={bold ? "font-bold" : "font-normal"}>{value ?? "—"}</span>
    </div>
  )
}

function MoneyRow({ label, value, deduction }: { label: string; value: number; deduction?: boolean }) {
  const empty = value === 0
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className={empty ? "text-gray-400" : ""}>{label}</span>
      <span className={empty ? "text-gray-400" : deduction ? "text-red-700 font-semibold" : "font-semibold"}>
        {empty ? "—" : `Rp ${value.toLocaleString("id-ID")}`}
      </span>
    </div>
  )
}
