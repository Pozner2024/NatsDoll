import { verify } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'

type LoginData = { email: string; password: string }
type LoginResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}

export function makeLogin(repo: AuthRepository) {
  return async function login(data: LoginData): Promise<LoginResult> {
    const user = await repo.findByEmail(data.email)
    if (!user) throw new AppError(401, 'Invalid credentials')
    if (!user.passwordHash) throw new AppError(401, 'Use Google login')

    const isValid = await verify(user.passwordHash, data.password)
    if (!isValid) throw new AppError(401, 'Invalid credentials')

    const rawRefreshToken = generateRefreshToken()
    const tokenHash = hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    await repo.saveRefreshToken({ userId: user.id, tokenHash, expiresAt })

    const accessToken = await signAccessToken({ sub: user.id, role: user.role })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  }
}
