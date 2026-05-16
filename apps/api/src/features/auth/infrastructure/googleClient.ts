// Интерфейс к Google OAuth2. Не знает о Prisma или email-ах. Возвращает только чистый
// профиль. Обертка над @googleapis/client-auth2.

import { randomBytes } from 'node:crypto'
import { google } from 'googleapis'
import { AppError } from '../../../shared/errors'
import type { GoogleProfile } from '../application/googleAuth'

const GOOGLE_API_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError(504, `${label} timed out`)), GOOGLE_API_TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI must be set')
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGoogleAuthUrl(): { url: string; state: string } {
  const client = getOAuth2Client()
  const state = randomBytes(16).toString('hex')
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: ['email', 'profile'],
    state,
  })
  return { url, state }
}

export function makeGetGoogleProfile(): (code: string) => Promise<GoogleProfile> {
  return async function getGoogleProfile(code: string): Promise<GoogleProfile> {
    const client = getOAuth2Client()
    const { tokens } = await withTimeout(client.getToken(code), 'Google token exchange')
    client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await withTimeout(oauth2.userinfo.get(), 'Google userinfo')

    if (!data.id || !data.email || !data.name) {
      throw new AppError(400, 'Incomplete Google profile')
    }

    if (!data.verified_email) {
      throw new AppError(400, 'Google account email is not verified')
    }

    return { googleId: data.id, email: data.email, name: data.name, emailVerified: true }
  }
}
