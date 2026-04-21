import { randomBytes } from 'node:crypto'
import { google } from 'googleapis'
import { AppError } from '../../../shared/errors'
import type { GoogleProfile } from '../application/googleAuth'

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
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()

    if (!data.id || !data.email || !data.name) {
      throw new AppError(400, 'Incomplete Google profile')
    }

    if (!data.verified_email) {
      throw new AppError(400, 'Google account email is not verified')
    }

    return { googleId: data.id, email: data.email, name: data.name, emailVerified: true }
  }
}
