import type { AdminRepository, GetConversation } from '../types'

export function makeGetConversation(repo: AdminRepository): GetConversation {
  return (userId) => repo.getConversation(userId)
}
