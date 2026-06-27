/**
 * /login — SSO Entry Point
 *
 * This page is the entry point for users who are not authenticated.
 * It immediately redirects them to the SSO Identity Provider login page.
 *
 * The SSO server will authenticate them and set the cross-domain `sso_token`
 * cookie, then redirect back to the `redirectUrl` provided.
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

const SSO_LOGIN_URL = 'https://sso.hnsitcenter.id/api/auth/google'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hris.hnsitcenter.id'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectUrl?: string }>
}) {
  // If the user already has the SSO token, bypass login entirely!
  const cookieStore = await cookies()
  if (cookieStore.has('sso_token')) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const error = params.error
  const returnTo = params.redirectUrl ?? `${APP_URL}/dashboard`

  // Direct to Google OAuth on the SSO server to avoid the intermediate SSO login page
  const ssoUrl = `${SSO_LOGIN_URL}?redirectUrl=${encodeURIComponent(returnTo)}`

  const errorMessages: Record<string, string> = {
    session_expired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    invalid_token: 'Token tidak valid. Silakan masuk kembali.',
    unauthorized: 'Anda tidak memiliki akses ke halaman tersebut.',
  }

  const errorMessage = error ? (errorMessages[error] ?? 'Terjadi kesalahan. Silakan masuk kembali.') : null

  return <LoginForm ssoUrl={ssoUrl} errorMessage={errorMessage} />
}
