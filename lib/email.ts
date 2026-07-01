import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    const data = await resend.emails.send({
      from: 'HNS IT Center <no-reply@hnsitcenter.id>',
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
