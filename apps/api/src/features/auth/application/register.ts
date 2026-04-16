import { hash } from '@node-rs/argon2'
import { Prisma } from '@prisma/client'
import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'

type RegisterData = { name: string; email: string; password: string }
type RegisterResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}

export function makeRegister(repo: AuthRepository) {
  return async function register(data: RegisterData): Promise<RegisterResult> {
    const existing = await repo.findByEmail(data.email)
    if (existing) throw new AppError(409, 'Email already in use')

    const passwordHash = await hash(data.password)

    let user: { id: string; name: string; email: string; role: string }
    try {
      user = await repo.createUser({ name: data.name, email: data.email, passwordHash })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'Email already in use')
      }
      throw err
    }

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
