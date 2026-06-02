import type { AdminRepository, ListConversations } from '../types'

export function makeListConversations(repo: AdminRepository): ListConversations {
  return () => repo.listConversations()
}
