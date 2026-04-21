// Composable-функция для управления бизнес-логикой формы подписки на рассылку.
//  Ответственность:
//  - Управление реактивным состоянием формы (email, статусы загрузки, ошибки).
//  - Валидация входных данных на стороне клиента с помощью Zod-схемы.
//  - Координация процесса отправки запроса через API-сервис (newsletterApi).
//  - Обработка результатов: очистка поля при успехе или вывод сообщения при ошибке.
//    Состояния (State):
//  - idle: ожидание ввода пользователя.
//  - loading: запрос обрабатывается сервером.
//  - success: подписка успешно оформлена.
//  - error: ошибка валидации или отказ сервера.

import { ref } from 'vue'
import { z } from 'zod'
import { subscribeToNewsletter } from './newsletterApi'

type State = 'idle' | 'loading' | 'success' | 'error'

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Please enter your email' })
  .email({ message: 'Invalid email format' })

export function useNewsletterSubscribe() {
  const email = ref('')
  const state = ref<State>('idle')
  const errorMessage = ref('')

  async function handleSubmit() {
    const parsed = emailSchema.safeParse(email.value)
    if (!parsed.success) {
      errorMessage.value = parsed.error.issues[0]?.message ?? 'Invalid email format'
      state.value = 'error'
      return
    }

    state.value = 'loading'
    errorMessage.value = ''
    try {
      await subscribeToNewsletter(parsed.data)
      state.value = 'success'
      email.value = ''
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Subscription failed'
      state.value = 'error'
    }
  }

  return { email, state, errorMessage, handleSubmit }
}
// Композибл-функция (composable) — это специальная функция, которая использует Vue Composition API для инкапсуляции и
// повторного использования логики состояния. В архитектуре проекта NatsDoll использование композиблов    
// является обязательным правилом для выноса бизнес-логики из компонентов (`.vue` файлов) для обеспечения чистоты кода и  
// возможности переиспользования.