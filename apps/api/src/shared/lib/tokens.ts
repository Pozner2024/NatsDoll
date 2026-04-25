// **Access Token**: Короткоживущий JWT (15 минут), хранится в памяти фронтенда.
// **Refresh Token**: Хранится в **httpOnly Cookie**, живет 30 дней и используется для получения нового Access Token 
// без участия пользователя.
// **Безопасность**: Используется библиотека `jose` для подписи JWT и `node:crypto` для создания HMAC-хешей

import { SignJWT, jwtVerify } from 'jose'
import { createHmac, randomUUID } from 'node:crypto'
import { AppError } from '../errors'

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
export const COOKIE_NAME = 'refresh_token'
export const MAX_ACTIVE_SESSIONS_PER_USER = 5

export type AccessTokenPayload = {
  sub: string
  role: string
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET ?? process.env.JWT_SECRET
  if (!secret) throw new Error('HMAC_SECRET or JWT_SECRET must be set')
  return secret
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecret())
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const sub = payload.sub
    const role = payload.role as string | undefined
    if (typeof sub !== 'string' || typeof role !== 'string') {
      throw new AppError(401, 'Invalid token payload')
    }
    return { sub, role }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(401, 'Invalid or expired token')
  }
}

export function generateRefreshToken(): string {
  return randomUUID()
}

export function hashToken(token: string): string {
  return createHmac('sha256', getHmacSecret()).update(token).digest('hex')
}
