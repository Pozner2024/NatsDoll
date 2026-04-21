//  Сервис для взаимодействия с API новостной рассылки.
//  Содержит метод для отправки POST-запроса на подписку.
//  Использует общую утилиту apiFetch для работы с сетью.

import { apiFetch, apiErrorMessage } from '@/shared'

export async function subscribeToNewsletter(email: string): Promise<void> {
  const res = await apiFetch('/newsletter/subscribe', {
    method: 'POST',
    json: { email },
  })
  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, 'Subscription failed'))
  }
}
