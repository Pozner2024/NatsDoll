import { verify } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import { AppError } from '../../../shared/errors'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'

type LoginData = { email: string; password: string }

export function makeLogin(repo: AuthRepository) {
  return async function login(data: LoginData): Promise<AuthTokensResult> {
    const user = await repo.findByEmail(data.email)
    if (!user) throw new AppError(401, 'Invalid credentials')
    if (!user.passwordHash) throw new AppError(401, 'Use Google login')

    const isValid = await verify(user.passwordHash, data.password)
    if (!isValid) throw new AppError(401, 'Invalid credentials')

    if (!user.emailVerified) throw new AppError(403, 'Please verify your email before signing in')

    return issueTokensForUser(repo, user)
  }
}
