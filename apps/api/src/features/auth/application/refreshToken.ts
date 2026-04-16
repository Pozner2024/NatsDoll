import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'

type RefreshResult = {
  accessToken: string
  refreshToken: string
}

export function makeRefreshToken(repo: AuthRepository) {
  return async function refreshToken(rawToken: string): Promise<RefreshResult> {
    const tokenHash = hashToken(rawToken)
    const stored = await repo.findTokenByHash(tokenHash)

    if (!stored) throw new AppError(401, 'Invalid refresh token')

    if (stored.revokedAt !== null) {
      await repo.revokeAllUserTokens(stored.userId)
      throw new AppError(401, 'Token reuse detected')
    }

    if (stored.expiresAt < new Date()) {
      await repo.deleteToken(stored.id)
      throw new AppError(401, 'Refresh token expired')
    }

    const user = await repo.findById(stored.userId)
    if (!user) throw new AppError(401, 'User not found')

    await repo.revokeToken(stored.id)

    const newRawToken = generateRefreshToken()
    const newTokenHash = hashToken(newRawToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    await repo.saveRefreshToken({ userId: user.id, tokenHash: newTokenHash, expiresAt })

    const accessToken = await signAccessToken({ sub: user.id, role: user.role })

    return { accessToken, refreshToken: newRawToken }
  }
}
