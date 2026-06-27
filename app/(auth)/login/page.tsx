/**
 * /login — SSO Entry Point
 *
 * This page is the entry point for users who are not authenticated.
 * It immediately redirects them to the SSO Identity Provider login page.
 *
 * The SSO server will authenticate them and set the cross-domain `sso_token`
 * cookie, then redirect back to the `redirectUrl` provided.
 */
import { Building2 } from 'lucide-react'

const SSO_LOGIN_URL = 'https://sso.hnsitcenter.id/login'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hris.hnsitcenter.id'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectUrl?: string }>
}) {
  const params = await searchParams
  const error = params.error
  const returnTo = params.redirectUrl ?? `${APP_URL}/dashboard`

  const ssoUrl = `${SSO_LOGIN_URL}?redirectUrl=${encodeURIComponent(returnTo)}`

  const errorMessages: Record<string, string> = {
    session_expired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    invalid_token: 'Token tidak valid. Silakan masuk kembali.',
    unauthorized: 'Anda tidak memiliki akses ke halaman tersebut.',
  }

  const errorMessage = error ? (errorMessages[error] ?? 'Terjadi kesalahan. Silakan masuk kembali.') : null

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-primary/10">
          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
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

          {/* SSO Login Button */}
          <a
            href={ssoUrl}
            className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
            id="sso-login-btn"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 8v4l3 3" strokeLinecap="round" />
            </svg>
            Masuk dengan SSO HNS IT Center
          </a>

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
