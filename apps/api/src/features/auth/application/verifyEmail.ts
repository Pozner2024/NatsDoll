import type { AuthRepository } from '../infrastructure/authRepository'
import { hashToken } from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'

export function makeVerifyEmail(repo: AuthRepository) {
  return async function verifyEmail(rawToken: string): Promise<AuthTokensResult> {
    const tokenHash = hashToken(rawToken)
    const verification = await repo.findEmailVerification(tokenHash)

    if (!verification) throw new AppError(400, 'Invalid or expired verification link')

    if (verification.expiresAt < new Date()) {
      await repo.deleteEmailVerification(verification.id)
      throw new AppError(400, 'Invalid or expired verification link')
    }

    const user = await repo.findById(verification.userId)
    if (!user) throw new AppError(400, 'Invalid or expired verification link')

    await repo.finalizeEmailVerification(user.id, verification.id)

    return issueTokensForUser(repo, user)
  }
}
