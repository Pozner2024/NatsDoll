import type { AdminRepository, MarkAllMessagesRead } from '../types'

export function makeMarkAllMessagesRead(repo: AdminRepository): MarkAllMessagesRead {
  return () => repo.markAllMessagesRead()
}
