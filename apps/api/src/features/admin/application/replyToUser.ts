import type { AdminRepository, ReplyToUser, ReplyInput } from '../types'

export function makeReplyToUser(repo: AdminRepository): ReplyToUser {
  return (input: ReplyInput) => repo.replyToUser(input)
}
