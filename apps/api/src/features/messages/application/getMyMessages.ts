import type { MessageRepository, MessageView } from '../types'

export function makeGetMyMessages(repo: MessageRepository) {
  return function getMyMessages(userId: string): Promise<MessageView[]> {
    return repo.findByUser(userId)
  }
}
