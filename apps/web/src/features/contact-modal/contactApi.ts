//  API-сервис для фичи контактной формы (Contact Modal).
//   Содержит функции для выполнения сетевых запросов к эндпоинту `/contact`.
//   Архитектурные особенности:
//  - В отличие от AuthStore, этот модуль не использует Pinia и не хранит состояние,
//    так как отправка сообщения — это разовая операция.
//  - Использует shared-утилиту apiFetch для стандартизации запросов.
//  - Ошибки обрабатываются и пробрасываются в UI-слой для отображения пользователю.

import { apiFetch, apiErrorMessage } from '@/shared'
export async function sendContactMessage(data: {
  name: string
  email: string
  message: string
}): Promise<void> {
  const res = await apiFetch('/contact', {
    method: 'POST',
    json: data,
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to send message'))
}
