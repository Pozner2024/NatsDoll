import type { AuthRepository } from '../infrastructure/authRepository'
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib/tokens'

export type GoogleProfile = { googleId: string; email: string; name: string }
export type GetGoogleProfile = (code: string) => Promise<GoogleProfile>

type GoogleAuthResult = {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}

export function makeGoogleAuth(repo: AuthRepository, getGoogleProfile: GetGoogleProfile) {
  return async function googleAuth(code: string): Promise<GoogleAuthResult> {
    const profile = await getGoogleProfile(code)

    let user = await repo.findByGoogleId(profile.googleId)

    if (!user) {
      const existing = await repo.findByEmail(profile.email)
      if (existing) {
        user = await repo.linkGoogleId(existing.id, profile.googleId)
      } else {
        user = await repo.createGoogleUser({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        })
      }
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
