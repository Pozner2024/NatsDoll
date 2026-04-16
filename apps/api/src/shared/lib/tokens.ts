import { SignJWT, jwtVerify } from 'jose'
import { createHmac, randomUUID } from 'node:crypto'
import { AppError } from '../errors'

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60
export const COOKIE_NAME = 'refresh_token'

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
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
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
    return { sub: payload.sub as string, role: payload.role as string }
  } catch {
    throw new AppError(401, 'Invalid or expired token')
  }
}

export function generateRefreshToken(): string {
  return randomUUID()
}

export function hashToken(token: string): string {
  return createHmac('sha256', getHmacSecret()).update(token).digest('hex')
}
