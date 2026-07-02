import { hash } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'
import {
  generateRefreshToken,
  hashToken,
  PASSWORD_RESET_TTL_MS,
  FRONTEND_URL,
  DUMMY_HASH,
} from '../../../shared/lib'

type RequestResult = { message: string }

const GENERIC_MESSAGE = 'If an account exists, a reset link has been sent'

export function makeRequestPasswordReset(repo: AuthRepository, emailService: EmailService) {
  return async function requestPasswordReset(email: string): Promise<RequestResult> {
    const user = await repo.findByEmail(email)

    if (!user) {
      await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
      return { message: GENERIC_MESSAGE }
    }

    if (!user.passwordHash) {
      // Google-аккаунт (passwordless, но с googleId) — у него есть вход, пароль не задаём.
      if (user.googleId) {
        await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
        // Отправка вне критического пути ответа: сетевой вызов Resend не должен
        // выдавать таймингом, существует ли аккаунт (user enumeration).
        void emailService.sendAccountExistsEmail(user.email, FRONTEND_URL).catch((err) => {
          console.error('[requestPasswordReset] failed to send account-exists email:', err)
        })
        return { message: GENERIC_MESSAGE }
      }
      // Иначе это гость без пароля и без Google — разрешаем задать первый пароль (продолжаем ниже).
    }

    await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
    const rawToken = generateRefreshToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)
    await repo.createPasswordReset({ userId: user.id, tokenHash, expiresAt })
    void emailService.sendPasswordResetEmail(user.email, `${FRONTEND_URL}/reset-password?token=${rawToken}`).catch((err) => {
      console.error('[requestPasswordReset] failed to send reset email:', err)
    })
    return { message: GENERIC_MESSAGE }
  }
}
