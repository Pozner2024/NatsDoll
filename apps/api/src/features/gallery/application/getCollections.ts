import type { GalleryRepository, Collection } from '../types'
import { COLLECTIONS_CONFIG } from '../types'

export function makeGetCollections(repo: GalleryRepository) {
  return async function getCollections(): Promise<Collection[]> {
    const results = await Promise.all(
      COLLECTIONS_CONFIG.map(({ section, id, name }) =>
        repo.getCollectionItems(section).then(items => ({ id, name, items }))
      )
    )
    return results
  }
}
