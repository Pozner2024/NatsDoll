import { verify, hash } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import { AppError } from '../../../shared/errors'

type UpdateProfileData = {
  name?: string
  password?: string
  currentPassword?: string
}

type UpdateProfileResult = { id: string; name: string; email: string; role: string }

export function makeUpdateProfile(repo: Pick<AuthRepository, 'findById' | 'updateUser' | 'updateUserAndInvalidateSessions'>) {
  return async function updateProfile(userId: string, data: UpdateProfileData): Promise<UpdateProfileResult> {
    if (!data.name && !data.password) {
      throw new AppError(400, 'At least one field must be provided')
    }

    const user = await repo.findById(userId)
    if (!user) throw new AppError(404, 'User not found')

    const updates: { name?: string; passwordHash?: string } = {}

    if (data.name) {
      updates.name = data.name
    }

    if (data.password) {
      if (!data.currentPassword) {
        throw new AppError(400, 'Current password is required to change password')
      }
      if (!user.passwordHash) {
        throw new AppError(400, 'Password change is not available for Google accounts')
      }
      let isValid = false
      try {
        isValid = await verify(user.passwordHash, data.currentPassword)
      } catch {
        isValid = false
      }
      if (!isValid) throw new AppError(401, 'Current password is incorrect')
      updates.passwordHash = await hash(data.password)
    }

    // Смена пароля и удаление всех сессий — атомарно, чтобы при сбое не остались
    // живые refresh-токены при уже изменённом пароле.
    const updated = updates.passwordHash
      ? await repo.updateUserAndInvalidateSessions(userId, updates)
      : await repo.updateUser(userId, updates)

    return { id: updated.id, name: updated.name, email: updated.email, role: updated.role }
  }
}
