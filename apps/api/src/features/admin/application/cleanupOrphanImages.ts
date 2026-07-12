import type { S3ObjectInfo } from '../../../shared/lib'
import type { CleanupOrphanImages } from '../types'

const IMAGES_PREFIX = 'items/'
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000

type ListFn = (prefix: string) => Promise<S3ObjectInfo[]>
type DeleteFn = (keys: string[]) => Promise<void>
type GetAllProductImageUrls = () => Promise<string[]>

function keyCandidates(url: string): string[] {
  try {
    const path = new URL(url).pathname.replace(/^\/+/, '')
    const slash = path.indexOf('/')
    return slash === -1 ? [path] : [path, path.slice(slash + 1)]
  } catch {
    return []
  }
}

export function makeCleanupOrphanImages(
  list: ListFn,
  remove: DeleteFn,
  getAllProductImageUrls: GetAllProductImageUrls,
): CleanupOrphanImages {
  return async () => {
    const [objects, imageUrls] = await Promise.all([list(IMAGES_PREFIX), getAllProductImageUrls()])
    const referenced = new Set(imageUrls.flatMap(keyCandidates))
    const cutoff = Date.now() - MIN_ORPHAN_AGE_MS
    const orphans = objects.filter(
      (o) => !referenced.has(o.key) && o.lastModified !== null && o.lastModified.getTime() < cutoff,
    )
    await remove(orphans.map((o) => o.key))
    return { deleted: orphans.length }
  }
}
