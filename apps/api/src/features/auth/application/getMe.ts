import type { AuthRepository } from '../infrastructure/authRepository'

type MeResult = { id: string; name: string; email: string; role: string }

export function makeGetMe(repo: AuthRepository) {
  return async function getMe(userId: string): Promise<MeResult | null> {
    const user = await repo.findById(userId)
    if (!user) return null
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  }
}
