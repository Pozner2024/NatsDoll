import { zValidator as honoZValidator } from '@hono/zod-validator'
import type { Context } from 'hono'

// Обёртка над @hono/zod-validator: при провале валидации возвращает ошибку
// в едином формате { error } (как AppError → app.onError), иначе zValidator
// по умолчанию отдаёт свой формат с массивом Zod-issues, который фронтовый
// apiErrorMessage не понимает. Возвращаем ответ прямо из хука, а не бросаем
// исключение, чтобы не зависеть от наличия onError у конкретного роутера.
function defaultHook(
  result: { success: boolean; error?: { issues?: { message?: string }[] } },
  c: Context,
) {
  if (!result.success) {
    const message = result.error?.issues?.[0]?.message ?? 'Invalid request'
    return c.json({ error: message }, 400)
  }
}

export const zValidator: typeof honoZValidator = ((target: never, schema: never, hook?: never, options?: never) =>
  honoZValidator(target, schema, (hook ?? defaultHook) as never, options)) as typeof honoZValidator
