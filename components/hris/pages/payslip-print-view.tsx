"use client"

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PayrollSlip } from "@prisma/client"

export function PayslipPrintView({ slip }: { slip: PayrollSlip & { user: any } }) {
  const rows = {
    pendapatan: [
      { label: "Gaji Pokok", value: slip.gajiPokok },
      { label: "Tunjangan Transport", value: slip.transport },
      { label: "Uang Makan", value: slip.uangMakan },
      { label: "Lembur", value: slip.lembur },
    ],
    potongan: [
      { label: "BPJS", value: slip.bpjs },
      { label: "PPh21", value: slip.pph21 },
      { label: "Izin (Telat / Pulang Cepat)", value: slip.potonganIzin },
      { label: "Keterlambatan / Lupa Absen", value: slip.potonganTerlambat },
      { label: "Lainnya", value: slip.potonganLainnya },
    ],
    kehadiran: [
      { label: "Hadir", value: slip.kehadiran, right: { label: "Sakit", value: slip.sakit } },
      { label: "Tidak Hadir", value: slip.ketidakhadiran, right: { label: "Izin Setengah Hari", value: slip.izinSetengahHari } },
      { label: "Cuti", value: slip.cuti, right: { label: "Terlambat", value: slip.terlambat } },
      { label: "Izin", value: slip.izin, right: { label: "Lupa Absen", value: slip.lupaAbsen } },
    ]
  }

  const printDocument = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col items-center print:bg-white print:p-0">
      
      <div className="w-full max-w-[210mm] flex justify-end mb-4 print:hidden">
        <Button onClick={printDocument} className="gap-2">
          <Printer className="h-4 w-4" /> Cetak PDF (A4)
        </Button>
      </div>

      <div 
        id="payslip-content"
        className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-lg print:shadow-none overflow-hidden mx-auto"
        style={{ 
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
          fontSize: "12px",
          // CSS variables for pure CMYK black in print, fallback to RGB for screen
          color: "var(--print-text, #000)" 
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            :root {
              --print-text: device-cmyk(0, 0, 0, 1);
            }
          }
        `}} />

        {/* ── Header ── */}
        <div className="flex justify-between items-start p-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div className="font-bold text-lg leading-snug">PT SENTRAL BERKAT TEKNOLOGI</div>
            <div className="font-semibold text-sm mt-1 text-gray-700">{slip.user?.store?.name ?? "HNS IT CENTER"}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-2xl tracking-widest text-gray-800 uppercase">SLIP GAJI</div>
          </div>
        </div>

        {/* ── Employee Info ── */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4 text-[12px] border-b border-gray-200 bg-gray-50/50 print:bg-transparent">
          <div className="space-y-1.5">
            <div className="flex gap-2"><span className="w-36 text-gray-600">Nama / NIK</span><span className="font-bold">{slip.user?.name?.toUpperCase()}</span></div>
            <div className="flex gap-2"><span className="w-36 text-gray-600">Divisi / Jabatan</span><span className="font-semibold">{slip.user?.positionName ?? slip.user?.department?.name ?? "—"}</span></div>
            <div className="flex gap-2"><span className="w-36 text-gray-600">Tanggal mulai bekerja</span><span>{slip.user?.joinDate ? format(new Date(slip.user.joinDate), "dd/MM/yyyy") : "—"}</span></div>
            <div className="flex gap-2"><span className="w-36 text-gray-600">Gaji Bulan</span><span className="font-bold">{format(new Date(slip.periodEnd), "MMMM yyyy", { locale: id }).toUpperCase()}</span></div>
          </div>
          <div className="text-right space-y-1.5 text-gray-600">
            <div>Periode: {format(new Date(slip.periodStart), "d MMM", { locale: id })} – {format(new Date(slip.periodEnd), "d MMM yyyy", { locale: id })}</div>
            <div>Hari Kerja Terjadwal: <span className="font-bold text-black">{slip.scheduledWorkDays} hari</span></div>
          </div>
        </div>

        {/* ── Pendapatan & Potongan ── */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-200">
          {/* Pendapatan */}
          <div className="border-r border-gray-200 p-6">
            <div className="font-bold text-[12px] mb-3 text-gray-800 uppercase tracking-wider bg-gray-100 print:bg-gray-100 py-1.5 px-2 rounded-sm">Pendapatan</div>
            <div className="space-y-1.5 px-2">
              {rows.pendapatan.map((r) => (
                <div key={r.label} className="flex justify-between py-0.5 text-[12px]">
                  <span className={r.value === 0 ? "text-gray-400" : ""}>{r.label}</span>
                  <span className={r.value === 0 ? "text-gray-400" : "font-semibold"}>
                    {r.value > 0 ? <>Rp {r.value.toLocaleString("id-ID")}</> : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t-2 border-gray-800 flex justify-between font-bold text-[13px] px-2">
              <span>Total Pendapatan</span>
              <span>Rp {slip.totalPendapatan.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Potongan */}
          <div className="p-6">
            <div className="font-bold text-[12px] mb-3 text-gray-800 uppercase tracking-wider bg-gray-100 print:bg-gray-100 py-1.5 px-2 rounded-sm">Potongan</div>
            <div className="space-y-1.5 px-2">
              {rows.potongan.map((r) => (
                <div key={r.label} className="flex justify-between py-0.5 text-[12px]">
                  <span className={r.value === 0 ? "text-gray-400" : ""}>{r.label}</span>
                  <span className={r.value === 0 ? "text-gray-400" : "text-red-700 font-semibold"}>
                    {r.value > 0 ? r.value.toLocaleString("id-ID") : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t-2 border-gray-800 flex justify-between font-bold text-[13px] px-2">
              <span>Total Potongan</span>
              <span className="text-red-700">{slip.totalPotongan > 0 ? slip.totalPotongan.toLocaleString("id-ID") : "—"}</span>
            </div>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="p-6 border-b-2 border-gray-800 bg-gray-50/30 print:bg-transparent">
          <div className="flex justify-between items-center px-2">
            <span className="font-bold text-sm tracking-wide uppercase">Total Penerimaan Bersih</span>
            <span className="font-extrabold text-lg">Rp {slip.totalPenerimaan.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* ── Kehadiran Summary ── */}
        <div className="p-6 border-b border-gray-200">
          <div className="font-bold text-[12px] mb-3 text-gray-800 uppercase tracking-wider">Rangkuman Informasi Kehadiran</div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 px-2">
            {rows.kehadiran.map((r, i) => (
              <div key={i} className="contents">
                <div key={r.label} className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-semibold">{r.value === 0 ? "—" : r.value}</span>
                </div>
                <div key={r.right.label} className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{r.right.label}</span>
                  <span className="font-semibold">{r.right.value === 0 || r.right.value === "0" ? "—" : r.right.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="grid grid-cols-2 gap-6 p-6 mt-4 items-end">
          <div className="px-2">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Pembayaran gaji telah dilakukan oleh perusahaan<br />
              secara Transfer ke rekening karyawan.
            </p>
            {slip.notes && (
              <p className="text-[11px] text-gray-700 mt-2 p-2 bg-yellow-50/50 border border-yellow-100 rounded print:border-none print:bg-transparent italic">
                <span className="font-semibold">Catatan:</span> {slip.notes}
              </p>
            )}
            <div className="mt-12 text-[11px] text-gray-500">
              <div className="mb-8">Diterima oleh</div>
              <div className="border-t border-gray-800 w-40 pt-1 font-semibold text-gray-800">
                {slip.user?.name}
              </div>
            </div>
          </div>
          <div className="text-right px-2">
            <p className="text-[10px] text-gray-400">
              Digenerate secara otomatis oleh sistem<br/>pada {format(new Date(slip.generatedAt), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
