/**
 * /login — HNS SSO entry point.
 *
 * Staff sign in only through the HNS SSO (auth.hnsitcenter.id). The button
 * goes to /auth/sso/login, which starts the OpenID Connect flow. SSO and
 * callback errors come back here as ?error=<code>.
 */
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/auth/session'
import { isSsoConfigured, safeReturnTo, ssoEnv } from '@/lib/auth/oidc'
import { LoginForm } from './login-form'

const errorMessages: Record<string, string> = {
  session_expired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  account_disabled: 'Akun Anda telah dinonaktifkan di HRIS. Silakan hubungi HRD.',
  access_denied: 'Anda belum diberi akses ke HRIS. Minta akses ke admin HNS IT Center.',
  invalid_scope: 'Fitur "Tetap masuk di perangkat ini" belum diaktifkan untuk HRIS. Masuk tanpa mencentangnya, atau hubungi admin HNS IT Center.',
  login_required: 'Silakan masuk kembali.',
  flow_expired: 'Proses masuk sudah kedaluwarsa. Silakan coba lagi.',
  invalid_state: 'Permintaan masuk tidak valid. Silakan coba lagi.',
  callback_failed: 'Gagal menyelesaikan proses masuk. Silakan coba lagi.',
  no_email: 'Akun SSO Anda tidak memiliki email. Hubungi admin HNS IT Center.',
  email_conflict: 'Email akun SSO Anda sudah tertaut ke akun HRIS lain. Hubungi HRD.',
  sso_unreachable: 'Server SSO tidak dapat dihubungi. Coba lagi beberapa saat.',
  sso_not_configured: 'Login SSO belum dikonfigurasi di server ini.',
  sso_error: 'Terjadi kesalahan di SSO. Silakan coba lagi.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>
}) {
  const params = await searchParams
  const error = params.error
  const returnTo = safeReturnTo(params.return_to)

  if (!error) {
    const session = await getCurrentSession()
    if (session?.user.isActive) redirect(returnTo)
  }

  const errorMessage = error ? (errorMessages[error] ?? 'Terjadi kesalahan. Silakan masuk kembali.') : null

  // "Keluar dari SSO" lets someone signed in to the SSO with the wrong account switch accounts.
  let ssoLogoutUrl: string | null = null
  if (error && isSsoConfigured()) {
    const env = ssoEnv()
    const url = new URL(`${env.issuer}/oauth/logout`)
    url.searchParams.set('client_id', env.clientId)
    url.searchParams.set('post_logout_redirect_uri', env.postLogoutRedirectUri)
    ssoLogoutUrl = url.toString()
  }

  return <LoginForm returnTo={returnTo} errorMessage={errorMessage} ssoLogoutUrl={ssoLogoutUrl} />
}
