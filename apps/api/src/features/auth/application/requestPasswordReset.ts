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
      await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
      try {
        await emailService.sendAccountExistsEmail(user.email, `${FRONTEND_URL}/reset-password`)
      } catch (err) {
        console.error('[requestPasswordReset] failed to send account-exists email:', err)
      }
      return { message: GENERIC_MESSAGE }
    }

    await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
    const rawToken = generateRefreshToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)
    await repo.createPasswordReset({ userId: user.id, tokenHash, expiresAt })
    try {
      await emailService.sendPasswordResetEmail(user.email, `${FRONTEND_URL}/reset-password?token=${rawToken}`)
    } catch (err) {
      console.error('[requestPasswordReset] failed to send reset email:', err)
    }
    return { message: GENERIC_MESSAGE }
  }
}
