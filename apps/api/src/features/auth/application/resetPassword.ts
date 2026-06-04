import { hash } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import { hashToken } from '../../../shared/lib'
import { AppError } from '../../../shared/errors'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'

const INVALID_MESSAGE = 'Invalid or expired reset link'

export function makeResetPassword(repo: AuthRepository) {
  return async function resetPassword(rawToken: string, newPassword: string): Promise<AuthTokensResult> {
    const tokenHash = hashToken(rawToken)
    const reset = await repo.findPasswordReset(tokenHash)

    if (!reset) throw new AppError(400, INVALID_MESSAGE)

    if (reset.expiresAt < new Date()) {
      await repo.deletePasswordReset(reset.id)
      throw new AppError(400, INVALID_MESSAGE)
    }

    const user = await repo.findById(reset.userId)
    if (!user) {
      await repo.deletePasswordReset(reset.id)
      throw new AppError(400, INVALID_MESSAGE)
    }

    const passwordHash = await hash(newPassword)
    await repo.finalizePasswordReset(user.id, reset.id, passwordHash)

    return issueTokensForUser(repo, user)
  }
}
