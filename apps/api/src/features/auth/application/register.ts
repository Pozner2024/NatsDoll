// register.ts`**: Проверяет, не занят ли email. Если всё в порядке, хеширует пароль через Argon2, создает
// пользователя и инициирует отправку письма через `emailService`.

import { hash } from '@node-rs/argon2'
import { Prisma } from '@prisma/client'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'
import { generateRefreshToken, hashToken, EMAIL_VERIFICATION_TTL_MS, FRONTEND_URL } from '../../../shared/lib'
import { AppError } from '../../../shared/errors'

type RegisterData = { name: string; email: string; password: string }
type RegisterResult = { message: string }

export function makeRegister(repo: AuthRepository, emailService: EmailService) {
  return async function register(data: RegisterData): Promise<RegisterResult> {
    const existing = await repo.findByEmail(data.email)
    if (existing) throw new AppError(409, 'Email already in use')

    const passwordHash = await hash(data.password)
    const rawToken = generateRefreshToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

    let user: { id: string; email: string }
    try {
      user = await repo.createUserWithVerification({
        name: data.name,
        email: data.email,
        passwordHash,
        verification: { tokenHash, expiresAt },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'Email already in use')
      }
      throw err
    }

    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${rawToken}`
    try {
      await emailService.sendVerificationEmail(user.email, verificationUrl)
    } catch (err) {
      console.error('Failed to send verification email', { userId: user.id, err })
      await repo.deleteUser(user.id)
      throw new AppError(500, 'Failed to send verification email. Please try again later.')
    }

    return { message: 'Check your email to verify your account' }
  }
}
