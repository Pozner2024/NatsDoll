import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import slugify from 'slugify'
import pLimit from 'p-limit'
import { uploadToS3 } from '../src/shared/lib/s3Client'

export interface EtsyRow {
  TITLE: string
  DESCRIPTION: string
  PRICE: string
  QUANTITY: string
  TAGS: string
  IMAGE1: string
  IMAGE2: string
  IMAGE3: string
  IMAGE4: string
  IMAGE5: string
  IMAGE6: string
  IMAGE7: string
  IMAGE8: string
  IMAGE9: string
  IMAGE10: string
}

type CategoryRule = readonly [slug: string, keywords: readonly string[]]

const CATEGORY_RULES: readonly CategoryRule[] = [
  ['cake-toppers',         ['cake topper', 'cake-topper']],
  ['dollhouse-miniature',  ['dollhouse', 'miniature', '1:12', '1/12']],
  ['party-favors-bulk',    ['bulk', 'party favor', 'pack of']],
  ['halloween-gifts',      ['halloween', 'pumpkin', 'spooky']],
  ['christmas-gifts',      ['christmas', 'xmas', 'santa']],
  ['valentines-day-gifts', ['valentine', 'romantic']],
  ['graduation-gifts',     ['graduation', 'class of', 'graduate']],
  ['birthday-gifts',       ['birthday']],
  ['motivational-gifts',   ['motivational', 'inspirational']],
] as const

const FALLBACK_CATEGORY = 'art-dolls'

const FETCH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FETCH_HEADERS = {
  'User-Agent': FETCH_USER_AGENT,
  Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
}

const IMAGE_CONCURRENCY = 5
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [2000, 5000, 10000]

export function detectCategorySlug(title: string, tags: string): string {
  const haystack = `${title} ${tags}`.toLowerCase()
  for (const [slug, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return slug
    }
  }
  return FALLBACK_CATEGORY
}

export function makeUniqueSlug(title: string, taken: Set<string>): string {
  const base = slugify(title, { lower: true, strict: true })
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let n = 2
  while (taken.has(`${base}-${n}`)) {
    n++
  }
  const slug = `${base}-${n}`
  taken.add(slug)
  return slug
}

export function parseCsv(path: string): EtsyRow[] {
  const raw = readFileSync(path, 'utf-8')
  const rows: EtsyRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  return rows
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function downloadImage(url: string): Promise<Buffer> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS })
      if (res.status === 404) {
        throw new Error(`HTTP 404 (no retry)`)
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      if (err instanceof Error && err.message.includes('404')) {
        throw err
      }
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('downloadImage failed')
}

export async function uploadProductImages(
  urls: string[],
  categorySlug: string,
  productSlug: string,
): Promise<string[]> {
  const limit = pLimit(IMAGE_CONCURRENCY)
  const uploaded: Array<{ index: number; url: string }> = []

  await Promise.all(
    urls.map((etsyUrl, i) =>
      limit(async () => {
        try {
          const buffer = await downloadImage(etsyUrl)
          const key = `natsdoll/${categorySlug}/${productSlug}/${i + 1}.jpg`
          const publicUrl = await uploadToS3(key, buffer, 'image/jpeg')
          uploaded.push({ index: i, url: publicUrl })
        } catch (err) {
          console.warn(`  [WARN] image ${i + 1} (${etsyUrl}) failed: ${err instanceof Error ? err.message : err}`)
        }
      }),
    ),
  )

  return uploaded.sort((a, b) => a.index - b.index).map((u) => u.url)
}
