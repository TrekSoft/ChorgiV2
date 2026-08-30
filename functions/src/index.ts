import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as nodemailer from 'nodemailer'

initializeApp()

const APP_URL = process.env.APP_URL || 'https://chorgi-aa4b9.web.app'

export const sendPasswordReset = onCall(
  { secrets: ['SMTP_PASS'] },
  async (request) => {
    const { email } = request.data as { email: string }
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'Email is required')
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    try {
      const link = await getAuth().generatePasswordResetLink(email, {
        url: `${APP_URL}/auth/reset-action`,
        handleCodeInApp: true,
      })

      const url = new URL(link)
      const oobCode = url.searchParams.get('oobCode')
      if (!oobCode) {
        throw new HttpsError('internal', 'Failed to generate reset code')
      }

      const resetUrl = `${APP_URL}/auth/reset-action?oobCode=${oobCode}`

      await transporter.sendMail({
        from: 'noreply@chorgi.com',
        to: email,
        subject: 'Reset your Chorgi password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #92400e; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #444; line-height: 1.6;">Hello,</p>
          <p style="color: #444; line-height: 1.6;">
            We received a request to reset your Chorgi password. Click the button below to choose a new one:
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #f59e0b; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">
              Reset password
            </a>
          </p>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            If you didn't ask to reset your password, you can safely ignore this email.
          </p>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Thanks,<br>The Chorgi team
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('sendPasswordReset failed', e)
    throw new HttpsError('internal', 'Failed to send reset email')
  }
})
