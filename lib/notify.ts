import 'server-only'

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import type { HrisRole } from '@/lib/auth/roles'

/**
 * Notification hub. Every feature notifies through notify():
 * - an in-app notification (AppNotification) is always stored;
 * - a Web Push is sent to the user's subscribed browsers when notifEnabled;
 * - an email is sent when the payload asks for it (important events only).
 *
 * notify() never throws: a failed notification must not fail the action
 * that triggered it.
 */

export const NOTIFICATION_CATEGORIES = [
  'ATTENDANCE',
  'LEAVE',
  'OVERTIME',
  'PAYROLL',
  'KPI',
  'RECRUITMENT',
  'WARNING_LETTER',
  'ANNOUNCEMENT',
  'CALENDAR',
  'SHIFT',
  'ACCOUNT',
  'SYSTEM',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export interface NotifyRecipients {
  userIds?: string[]
  roles?: readonly HrisRole[]
  /** Never notify these users (e.g. the HRD who performed the action). */
  excludeUserIds?: string[]
}

export interface NotifyPayload {
  category: NotificationCategory
  title: string
  body: string
  /** In-app path, e.g. "/leave". */
  url?: string
  /** Also send an email. `true` uses the default template. */
  email?: boolean | { subject?: string; html?: string }
}

let vapidReady: boolean | null = null
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env
  try {
    if (pub && priv && subject) {
      webpush.setVapidDetails(subject, pub, priv)
      vapidReady = true
    } else {
      vapidReady = false
    }
  } catch (err) {
    console.warn('[notify] invalid VAPID configuration:', err instanceof Error ? err.message : err)
    vapidReady = false
  }
  return vapidReady
}

function appBaseUrl(): string {
  const fromRedirect = process.env.SSO_REDIRECT_URI ? new URL(process.env.SSO_REDIRECT_URI).origin : null
  return (fromRedirect || process.env.NEXT_PUBLIC_APP_URL || 'https://absensi.hnsitcenter.id').replace(/\/+$/, '')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function defaultEmailHtml(name: string, title: string, body: string, url?: string): string {
  const link = url ? `${appBaseUrl()}${url.startsWith('/') ? url : `/${url}`}` : appBaseUrl()
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e5e5">
<tr><td style="padding:24px">
<p style="margin:0 0 4px;font-size:12px;color:#737373">HRIS HNS IT Center</p>
<h1 style="margin:0 0 16px;font-size:18px">${escapeHtml(title)}</h1>
<p style="margin:0 0 8px;font-size:14px">Halo ${escapeHtml(name)},</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5;white-space:pre-line">${escapeHtml(body)}</p>
<a href="${escapeHtml(link)}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Buka HRIS</a>
</td></tr></table>
<p style="font-size:11px;color:#a3a3a3;margin-top:12px">Email ini dikirim otomatis oleh HRIS HNS IT Center.</p>
</td></tr></table></body></html>`
}

async function resolveRecipients(to: NotifyRecipients) {
  const userIds = Array.from(new Set(to.userIds ?? []))
  const roles = to.roles ? [...to.roles] : []
  if (userIds.length === 0 && roles.length === 0) return []

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        ...(userIds.length ? [{ id: { in: userIds } }] : []),
        ...(roles.length ? [{ role: { in: roles } }] : []),
      ],
    },
    select: { id: true, name: true, email: true, notifEnabled: true },
  })
  const exclude = new Set(to.excludeUserIds ?? [])
  return users.filter((u) => !exclude.has(u.id))
}

async function sendPush(userIds: string[], payload: NotifyPayload) {
  if (userIds.length === 0 || !ensureVapid()) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } })
  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/dashboard', tag: payload.category })

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message)
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error('[notify] push failed:', err instanceof Error ? err.message : err)
        }
      }
    }),
  )
}

export async function notify(to: NotifyRecipients, payload: NotifyPayload): Promise<void> {
  try {
    const recipients = await resolveRecipients(to)
    if (recipients.length === 0) return

    await prisma.appNotification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        category: payload.category,
        title: payload.title,
        message: payload.body,
        url: payload.url ?? null,
      })),
    })

    const reachable = recipients.filter((u) => u.notifEnabled)
    const tasks: Promise<unknown>[] = [sendPush(reachable.map((u) => u.id), payload)]

    if (payload.email && process.env.RESEND_API_KEY) {
      const custom = typeof payload.email === 'object' ? payload.email : {}
      // One email per person so recipients never see each other's address.
      for (const u of reachable) {
        tasks.push(
          sendEmail({
            to: u.email,
            subject: custom.subject ?? `[HRIS] ${payload.title}`,
            html: custom.html ?? defaultEmailHtml(u.name, payload.title, payload.body, payload.url),
          }),
        )
      }
    }

    await Promise.allSettled(tasks)
  } catch (err) {
    console.error('[notify] failed:', err instanceof Error ? err.message : err)
  }
}

/** HRD-workspace roles, the usual audience for new requests and alerts. */
export const HRD_AUDIENCE: readonly HrisRole[] = ['HRD', 'BOSS', 'ADMIN']

/** Format a UTC-midnight date (WIB calendar day) as e.g. "4 Nov 2026". */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}
