import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Please enter your email' })
  .email({ message: 'Please enter a real email address and check for typos' })

/**
 * Проверяет введенный email на соответствие формату.
 * 
 * @param value - Строка с email-адресом, которую ввел пользователь.
 * @returns Пустую строку `''`, если email валидный. 
 *          Иначе возвращает локализованный текст ошибки (например, "Please enter your email").
 */
export function validateEmail(value: string): string {
  const parsed = emailSchema.safeParse(value)
  return parsed.success ? '' : parsed.error.issues[0]?.message ?? 'Please enter a real email address and check for typos'
}
