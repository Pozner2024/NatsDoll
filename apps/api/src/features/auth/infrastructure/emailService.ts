// Почтовый курьер приложения. Интегрируется с внешним API Resend для доставки писем верификации.
// Отвечает за корректное формирование HTML-сообщений и безопасную передачу ссылок для активации аккаунтов.

import { Resend } from 'resend'

export type EmailService = {
  sendVerificationEmail(to: string, verificationUrl: string): Promise<void>
  sendMessageNotification(adminEmail: string, fromName: string, fromEmail: string, text: string, orderNumber?: number): Promise<void>
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

  return {
    async sendVerificationEmail(to, verificationUrl) {
      // SECURITY: все ${} в html ниже должны быть только server-controlled значениями
      // (env-переменные, токены из crypto). При добавлении user-input полей —
      // обязательно прогонять через HTML-escape, иначе XSS в почтовом клиенте.
      await getResend().emails.send({
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
    async sendMessageNotification(adminEmail, fromName, fromEmail, text, orderNumber) {
      const subject = orderNumber
        ? `New message re: Order #${orderNumber} — NatsDoll`
        : `New message from ${escapeHtml(fromName)} — NatsDoll`
      await getResend().emails.send({
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
  }
}
