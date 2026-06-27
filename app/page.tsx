import { redirect } from 'next/navigation'

/**
 * Root page — redirects to /dashboard.
 * Middleware will intercept /dashboard and redirect unauthenticated users to SSO.
 */
export default function RootPage() {
  redirect('/dashboard')
}
