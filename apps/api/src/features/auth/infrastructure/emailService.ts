// Почтовый курьер приложения. Интегрируется с внешним API Resend для доставки писем верификации.
// Отвечает за корректное формирование HTML-сообщений и безопасную передачу ссылок для активации аккаунтов.

import { Resend } from 'resend'

export type EmailService = {
  sendVerificationEmail(to: string, verificationUrl: string): Promise<void>
}

export function makeEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')
  const resend = new Resend(apiKey)

  return {
    async sendVerificationEmail(to, verificationUrl) {
      await resend.emails.send({
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
  }
}
