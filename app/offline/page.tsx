"use client"

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-muted/50 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-96 w-96 rounded-full bg-muted/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
          <WifiOff className="h-10 w-10" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Tidak Ada Koneksi</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Anda sedang offline. Halaman ini tidak tersimpan dalam cache.
            <br />
            Fitur <strong>Absensi</strong> tetap tersedia dalam mode offline.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <a
            href="/attendance"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Buka Absensi
          </a>
          <button
            onClick={() => window.location.reload()}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-all hover:bg-muted"
          >
            Coba Lagi
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Data absensi offline akan otomatis dikirim saat koneksi kembali.
        </p>
      </div>
    </main>
  )
}
