import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Please enter your email' })
  .email({ message: 'Invalid email format' })

export function validateEmail(value: string): string {
  const parsed = emailSchema.safeParse(value)
  return parsed.success ? '' : parsed.error.issues[0]?.message ?? 'Invalid email format'
}
