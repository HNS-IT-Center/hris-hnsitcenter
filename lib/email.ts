import { Resend } from 'resend'

// Created on first use: `new Resend()` throws without an API key, and this
// module is imported by every notifying action.
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing. Email not sent.')
    return { success: false, error: 'API key missing' }
  }

  try {
    const data = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ? `HNS IT Center <${process.env.RESEND_FROM_EMAIL}>` : 'HNS IT Center <no-reply@hnsitcenter.id>',
      to,
      subject,
      html
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}
