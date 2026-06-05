// Содержит конкретный сценарий использования (use-case) — «Отправить сообщение».
// Она просто берет данные и передает их репозиторию. Она не знает ничего о базе данных или 
// протоколе HTTP.

import type { ContactRepository } from '../infrastructure/contactRepository'
import type { EmailService } from '../../auth/infrastructure/emailService'

type SubmitData = { name: string; email: string; message: string }

export function makeSubmit(repo: ContactRepository, emailService: EmailService) {
  return async function submit(data: SubmitData): Promise<void> {
    await repo.create(data)

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      try {
        await emailService.sendContactNotification(adminEmail, data.name, data.email, data.message)
      } catch (err) {
        console.error('Failed to send contact notification:', err)
      }
    }
  }
}
