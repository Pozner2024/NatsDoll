import { verify } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import { AppError } from '../../../shared/errors'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'

type LoginData = { email: string; password: string }

// Фиктивный argon2id-хеш для constant-time verify, когда пользователь не найден
// или зарегистрирован только через Google. Предотвращает user enumeration по таймингу.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$K0mGBc4bA4+zBYK6Jn2LQI2B8wD0tRpV4GQ5yqB3E8A'

export function makeLogin(repo: AuthRepository) {
  return async function login(data: LoginData): Promise<AuthTokensResult> {
    const user = await repo.findByEmail(data.email)
    const hashToVerify = user?.passwordHash ?? DUMMY_HASH
    const isValid = await verify(hashToVerify, data.password)

    if (!user || !user.passwordHash || !isValid) {
      throw new AppError(401, 'Invalid credentials')
    }

    if (!user.emailVerified) throw new AppError(403, 'Please verify your email before signing in')

    return issueTokensForUser(repo, user)
  }
}
