import { google } from 'googleapis'
import { AppError } from '../../../shared/errors'
import type { GoogleProfile } from '../application/googleAuth'

function makeOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI must be set')
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGoogleAuthUrl(): string {
  const client = makeOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'online',
    scope: ['email', 'profile'],
  })
}

export function makeGetGoogleProfile(): (code: string) => Promise<GoogleProfile> {
  return async function getGoogleProfile(code: string): Promise<GoogleProfile> {
    const client = makeOAuth2Client()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()

    if (!data.id || !data.email || !data.name) {
      throw new AppError(400, 'Incomplete Google profile')
    }

    return { googleId: data.id, email: data.email, name: data.name }
  }
}
