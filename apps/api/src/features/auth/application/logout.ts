// `log out.ts`**: Просто и надежно находит токен в базе по его хешу и удаляет его, мгновенно завершая сессию
import type { AuthRepository } from '../infrastructure/authRepository'
import { hashToken } from '../../../shared/lib/tokens'

export function makeLogout(repo: AuthRepository) {
  return async function logout(rawToken: string): Promise<void> {
    if (!rawToken) return
    const tokenHash = hashToken(rawToken)
    const stored = await repo.findTokenByHash(tokenHash)
    if (!stored) return
    await repo.deleteToken(stored.id)
  }
}
