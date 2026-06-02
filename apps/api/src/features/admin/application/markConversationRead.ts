import type { AdminRepository, MarkConversationRead } from '../types'

export function makeMarkConversationRead(repo: AdminRepository): MarkConversationRead {
  return (userId) => repo.markConversationRead(userId)
}
