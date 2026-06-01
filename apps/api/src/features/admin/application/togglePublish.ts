import type { AdminRepository, TogglePublish } from '../types'

export function makeTogglePublish(repo: AdminRepository): TogglePublish {
  return (id: string) => repo.togglePublish(id)
}
