"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Fingerprint, Loader2, Lock, Mail } from "lucide-react"

import { loginLocal } from "@/app/actions/auth-local"
import { Checkbox } from "@/components/ui/checkbox"
export function LoginForm({ ssoUrl, errorMessage }: { ssoUrl: string, errorMessage: string | null }) {
  const [loading, setLoading] = useState(false)

  const handleSsoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    toast.loading("Mengarahkan ke akun Google...", { id: "login" })
    window.location.href = ssoUrl
  }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    startTransition(async () => {
      const res = await loginLocal(email, password, rememberMe)
      if (res.success) {
        toast.success("Login berhasil", { id: "login-local" })
        window.location.href = "/dashboard"
      } else {
        toast.error(res.error, { id: "login-local" })
        setLoading(false)
      }
    })
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

          {/* Error message from middleware redirect */}
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
            Masuk dengan SSO (Google)
          </Button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">atau</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nama@hnsitcenter.com" className="pl-9 bg-input" disabled={loading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="pl-9 bg-input" disabled={loading} />
              </div>
            </div>
            <div className="flex items-center space-x-2 pb-1">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} disabled={loading} />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Ingat Saya (7 hari)
              </label>
            </div>
            <Button type="submit" variant="secondary" disabled={loading || isPending} className="h-11 w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Masuk
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
            Autentikasi dikelola secara terpusat melalui{' '}
            <span className="font-medium text-foreground">sso.hnsitcenter.id</span>.
            <br />
            Hubungi HRD jika Anda tidak dapat mengakses akun.
          </p>
        </div>
      </div>
    </main>
  )
}
