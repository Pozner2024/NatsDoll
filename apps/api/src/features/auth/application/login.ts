// login.ts реализует защиту от **Timing Attacks** (атак по времени).
// Если пользователь не найден, система всё равно запускает проверку пароля с использованием `DUMMY_HASH`, чтобы
// злоумышленник по скорости ответа сервера не мог понять, существует такой email в базе или нет.

import { verify } from '@node-rs/argon2'

import type { AuthRepository } from '../infrastructure/authRepository'
import { AppError } from '../../../shared/errors'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'
import { DUMMY_HASH } from '../../../shared/lib'

type LoginData = { email: string; password: string }

// Единый 401 на все три ветки: нет user, неверный пароль, email не верифицирован.
// Не выдаёт, существует ли email в системе (user enumeration). Verify-flow напоминание —
// в самом сообщении ошибки и в письме верификации, отправленном при register().
const INVALID_LOGIN_MESSAGE =
  "We couldn't sign you in. Check your email and password — and if you just registered, follow the verification link in your inbox."

export function makeLogin(repo: AuthRepository) {
  return async function login(data: LoginData): Promise<AuthTokensResult> {
    const user = await repo.findByEmail(data.email)
    const hashToVerify = user?.passwordHash ?? DUMMY_HASH
    const isValid = await verify(hashToVerify, data.password)

    if (!user || !user.passwordHash || !isValid || !user.emailVerified) {
      throw new AppError(401, INVALID_LOGIN_MESSAGE)
    }

    return issueTokensForUser(repo, user)
  }
}
