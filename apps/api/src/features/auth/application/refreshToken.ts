// **`refreshToken.ts`**: Реализует механизм **ротации токенов**. При каждом обновлении сессии старый токен
// отзывается, а выдается новый.
// Если система обнаруживает попытку использования уже отозванного токена, это считается кражей
import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib'
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
      await repo.deleteAllUserTokens(stored.userId)
      throw new AppError(401, 'Token reuse detected')
    }

    if (stored.expiresAt < new Date()) {
      await repo.deleteToken(stored.id)
      throw new AppError(401, 'Refresh token expired')
    }

    // findById делается намеренно вторым select'ом (не сохраняем role в RefreshToken):
    // даёт актуальную role в новом access-токене, если её сменили после прошлого refresh
    // (например, юзера повысили до ADMIN — обновится без перелогина).
    const user = await repo.findById(stored.userId)
    if (!user) throw new AppError(401, 'User not found')

    const newRawToken = generateRefreshToken()
    const newTokenHash = hashToken(newRawToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    const rotated = await repo.rotateToken(stored.id, { userId: user.id, tokenHash: newTokenHash, expiresAt })
    if (!rotated) {
      await repo.deleteAllUserTokens(stored.userId)
      throw new AppError(401, 'Token reuse detected')
    }

    const accessToken = await signAccessToken({ sub: user.id, role: user.role })

    return { accessToken, refreshToken: newRawToken }
  }
}
