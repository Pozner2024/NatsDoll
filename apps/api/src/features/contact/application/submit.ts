// Содержит конкретный сценарий использования (use-case) — «Отправить сообщение».
// Она просто берет данные и передает их репозиторию. Она не знает ничего о базе данных или 
// протоколе HTTP.

import type { ContactRepository } from '../infrastructure/contactRepository'

type SubmitData = { name: string; email: string; message: string }

export function makeSubmit(repo: ContactRepository) {
  return async function submit(data: SubmitData): Promise<void> {
    await repo.create(data)
  }
}
