// `googleAuth.ts` - обрабатывает вход через Google. Он умеет либо создавать нового пользователя, либо
// «привязывать» Google ID к уже существующему аккаунту с таким же email
import type { AuthRepository } from '../infrastructure/authRepository'
import { issueTokensForUser, type AuthTokensResult } from './issueTokens'

export type GoogleProfile = { googleId: string; email: string; name: string; emailVerified: boolean }
export type GetGoogleProfile = (code: string) => Promise<GoogleProfile>

export function makeGoogleAuth(repo: AuthRepository, getGoogleProfile: GetGoogleProfile) {
  return async function googleAuth(code: string): Promise<AuthTokensResult> {
    const profile = await getGoogleProfile(code)

    let user = await repo.findByGoogleId(profile.googleId)

    if (!user) {
      const existing = await repo.findByEmail(profile.email)
      if (existing) {
        // Unverified локальный аккаунт = email никогда не был подтверждён владельцем,
        // поэтому Google-юзер вытесняет его. Иначе атакующий, заранее зарегавший чужой email
        // с известным паролем, получил бы доступ к аккаунту жертвы после её Google-входа.
        if (!existing.emailVerified) {
          user = await repo.replaceUnverifiedWithGoogleUser(existing.id, {
            name: profile.name,
            email: profile.email,
            googleId: profile.googleId,
          })
        } else {
          user = await repo.linkGoogleId(existing.id, profile.googleId)
        }
      } else {
        user = await repo.createGoogleUser({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        })
      }
    }

    return issueTokensForUser(repo, user)
  }
}
