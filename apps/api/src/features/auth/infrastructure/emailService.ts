// Почтовый курьер приложения. Интегрируется с внешним API Resend для доставки писем верификации.
// Отвечает за корректное формирование HTML-сообщений и безопасную передачу ссылок для активации аккаунтов.

import { Resend } from 'resend'
import type { CreateEmailOptions } from 'resend'

const EMAIL_TIMEOUT_MS = 8000

export type EmailService = {
  sendVerificationEmail(to: string, verificationUrl: string): Promise<void>
  sendAccountExistsEmail(to: string, resetUrl: string): Promise<void>
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>
  sendMessageNotification(adminEmail: string, fromName: string, fromEmail: string, text: string, orderNumber?: number): Promise<void>
  sendTrackingNotification(to: string, name: string, orderNumber: number, trackingNumber: string): Promise<void>
  sendContactNotification(adminEmail: string, fromName: string, fromEmail: string, message: string): Promise<void>
}

export function makeEmailService(): EmailService {
  let resend: Resend | null = null

  function getResend(): Resend {
    if (!resend) {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('RESEND_API_KEY is not set')
      resend = new Resend(apiKey)
    }
    return resend
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  async function send(payload: CreateEmailOptions): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Email send timed out')), EMAIL_TIMEOUT_MS)
    })
    try {
      await Promise.race([getResend().emails.send(payload), timeout])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  return {
    async sendVerificationEmail(to, verificationUrl) {
      // SECURITY: все ${} в html ниже должны быть только server-controlled значениями
      // (env-переменные, токены из crypto). При добавлении user-input полей —
      // обязательно прогонять через HTML-escape, иначе XSS в почтовом клиенте.
      await send({
        from: 'noreply@natsdoll.com',
        to,
        subject: 'Confirm your email — NatsDoll',
        html: `
          <p>Thanks for signing up!</p>
          <p>Please confirm your email address by clicking the link below:</p>
          <p><a href="${verificationUrl}">Confirm email</a></p>
          <p>The link expires in 24 hours.</p>
        `,
      })
    },
    async sendAccountExistsEmail(to, resetUrl) {
      // SECURITY: только server-controlled значения в html (resetUrl — токен из crypto).
      await send({
        from: 'noreply@natsdoll.com',
        to,
        subject: 'You already have an account — NatsDoll',
        html: `
          <p>An account already exists for this email.</p>
          <p>Just sign in as usual. If you forgot your password, reset it here:</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>If you originally signed up with Google, use the "Continue with Google" button instead.</p>
        `,
      })
    },
    async sendPasswordResetEmail(to, resetUrl) {
      // SECURITY: только server-controlled значения в html (resetUrl — токен из crypto).
      await send({
        from: 'noreply@natsdoll.com',
        to,
        subject: 'Reset your password — NatsDoll',
        html: `
          <p>We received a request to reset your password.</p>
          <p>Click the link below to choose a new one:</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>The link expires in 1 hour. If you didn't request this, ignore this email.</p>
        `,
      })
    },
    async sendMessageNotification(adminEmail, fromName, fromEmail, text, orderNumber) {
      const subject = orderNumber
        ? `New message re: Order #${orderNumber} — NatsDoll`
        : `New message from ${escapeHtml(fromName)} — NatsDoll`
      await send({
        from: 'noreply@natsdoll.com',
        to: adminEmail,
        subject,
        html: `
          <p><strong>${escapeHtml(fromName)}</strong> (${escapeHtml(fromEmail)}) sent a message:</p>
          ${orderNumber ? `<p>Re: Order #${orderNumber}</p>` : ''}
          <p>${escapeHtml(text)}</p>
        `,
      })
    },
    async sendContactNotification(adminEmail, fromName, fromEmail, message) {
      await send({
        from: 'noreply@natsdoll.com',
        to: adminEmail,
        subject: `New contact form submission from ${escapeHtml(fromName)} — NatsDoll`,
        html: `
          <p><strong>${escapeHtml(fromName)}</strong> (${escapeHtml(fromEmail)}) submitted the contact form:</p>
          <p>${escapeHtml(message)}</p>
        `,
      })
    },
    async sendTrackingNotification(to, name, orderNumber, trackingNumber) {
      await send({
        from: 'noreply@natsdoll.com',
        to,
        subject: `Your order #${orderNumber} has been shipped — NatsDoll`,
        html: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Your order <strong>#${orderNumber}</strong> has been shipped!</p>
          <p>Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>
          <p>You can track your order using this number with your shipping carrier.</p>
          <p>You can also view your order details in your <a href="${process.env.FRONTEND_URL ?? 'https://natsdoll.com'}/account/purchases">account cabinet</a>.</p>
        `,
      })
    },
  }
}
