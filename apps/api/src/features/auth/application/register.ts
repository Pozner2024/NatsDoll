import { hash } from '@node-rs/argon2'
import { Prisma } from '@prisma/client'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'
import { generateRefreshToken, hashToken, EMAIL_VERIFICATION_TTL_MS } from '../../../shared/lib/tokens'
import { AppError } from '../../../shared/errors'
import { FRONTEND_URL } from '../../../shared/lib/config'

type RegisterData = { name: string; email: string; password: string }
type RegisterResult = { message: string }

export function makeRegister(repo: AuthRepository, emailService: EmailService) {
  return async function register(data: RegisterData): Promise<RegisterResult> {
    const existing = await repo.findByEmail(data.email)
    if (existing) throw new AppError(409, 'Email already in use')

    const passwordHash = await hash(data.password)

    let user: { id: string; email: string }
    try {
      user = await repo.createUser({ name: data.name, email: data.email, passwordHash })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'Email already in use')
      }
      throw err
    }

    const rawToken = generateRefreshToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
    await repo.createEmailVerification({ userId: user.id, tokenHash, expiresAt })

    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${rawToken}`
    await emailService.sendVerificationEmail(user.email, verificationUrl)

    return { message: 'Check your email to verify your account' }
  }
}
