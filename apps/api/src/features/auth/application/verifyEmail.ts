import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'

type VerifyResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}

export function makeVerifyEmail(repo: AuthRepository) {
  return async function verifyEmail(rawToken: string): Promise<VerifyResult> {
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

    const rawRefreshToken = generateRefreshToken()
    const refreshTokenHash = hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    await repo.saveRefreshToken({ userId: user.id, tokenHash: refreshTokenHash, expiresAt })

    const accessToken = await signAccessToken({ sub: user.id, role: user.role })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  }
}
