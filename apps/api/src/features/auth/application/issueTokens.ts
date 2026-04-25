// issueTokens.ts - финальный этап авторизации - генерация короткоживущего Access Token и
// долгоживущего Refresh Token - который сразу хешируется перед сохранением в базу для безопасности

import type { User } from '@prisma/client'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  MAX_ACTIVE_SESSIONS_PER_USER,
} from '../../../shared/lib'
import type { AuthRepository } from '../infrastructure/authRepository'

export type AuthTokensResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}

export async function issueTokensForUser(repo: AuthRepository, user: User): Promise<AuthTokensResult> {
  const rawRefreshToken = generateRefreshToken()
  const tokenHash = hashToken(rawRefreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  await repo.saveRefreshToken({ userId: user.id, tokenHash, expiresAt })
  await repo.pruneUserSessions(user.id, MAX_ACTIVE_SESSIONS_PER_USER)

  const accessToken = await signAccessToken({ sub: user.id, role: user.role })

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}
