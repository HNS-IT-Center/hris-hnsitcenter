"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Fingerprint, Loader2, LogOut } from "lucide-react"

export function LoginForm({
  returnTo,
  errorMessage,
  ssoLogoutUrl,
}: {
  returnTo: string
  errorMessage: string | null
  ssoLogoutUrl: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

  const handleSsoClick = () => {
    setLoading(true)
    const params = new URLSearchParams({ return_to: returnTo })
    if (rememberDevice) params.set("remember", "1")
    window.location.href = `/auth/sso/login?${params.toString()}`
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient brand backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-primary/10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground text-balance">
              HRIS HNS IT Center
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Masuk untuk mengelola absensi, izin, dan performa tim Anda.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <Button
            onClick={handleSsoClick}
            disabled={loading}
            className="mt-7 h-11 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            {loading ? "Mengarahkan ke SSO..." : errorMessage ? "Coba lagi dengan SSO HNS" : "Masuk dengan SSO HNS"}
          </Button>

          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberDevice}
              onCheckedChange={(c) => setRememberDevice(c === true)}
              disabled={loading}
              className="bg-white data-[state=checked]:bg-primary"
            />
            <label htmlFor="remember" className="text-sm font-medium leading-none">
              Tetap masuk di perangkat ini
            </label>
          </div>
          <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
            Centang hanya di HP atau perangkat pribadi Anda.
          </p>

          {ssoLogoutUrl && (
            <Button asChild variant="ghost" className="mt-4 h-10 w-full gap-2 text-muted-foreground">
              <a href={ssoLogoutUrl}>
                <LogOut className="h-4 w-4" />
                Keluar dari SSO (ganti akun)
              </a>
            </Button>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
            Akun dan password dikelola terpusat di{" "}
            <span className="font-medium text-foreground">SSO HNS IT Center</span>.
            <br />
            Hubungi admin HNS IT Center jika Anda tidak dapat masuk.
          </p>
        </div>
      </div>
    </main>
  )
}
