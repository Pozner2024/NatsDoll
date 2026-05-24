import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import slugify from 'slugify'
import pLimit from 'p-limit'
import { Prisma } from '@prisma/client'
import { uploadToS3 } from '../src/shared/lib/s3Client'
import { prisma } from '../src/shared/infrastructure'

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
  'VARIATION 1 TYPE': string
  'VARIATION 1 NAME': string
  'VARIATION 1 VALUES': string
  'VARIATION 2 TYPE': string
  'VARIATION 2 NAME': string
  'VARIATION 2 VALUES': string
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
const RETRY_DELAYS_MS = [2000, 5000]

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

const MESSAGE_VARIATION_NAMES = new Set(['message', 'mesage'])
const SKIP_MESSAGE_VALUE = 'your own text'

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function parseMessageOptions(row: EtsyRow): string[] {
  const v1Name = (row['VARIATION 1 NAME'] ?? '').trim().toLowerCase()
  const v2Name = (row['VARIATION 2 NAME'] ?? '').trim().toLowerCase()
  let raw = ''
  if (MESSAGE_VARIATION_NAMES.has(v1Name)) {
    raw = row['VARIATION 1 VALUES'] ?? ''
  } else if (MESSAGE_VARIATION_NAMES.has(v2Name)) {
    raw = row['VARIATION 2 VALUES'] ?? ''
  } else {
    return []
  }
  return raw
    .split(',')
    .map((v) => decodeHtmlEntities(v.trim()))
    .filter((v) => v.length > 0 && v.toLowerCase() !== SKIP_MESSAGE_VALUE)
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
      if (err instanceof Error && err.message.includes('(no retry)')) {
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

function collectImageUrls(row: EtsyRow): string[] {
  const keys = ['IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4', 'IMAGE5', 'IMAGE6', 'IMAGE7', 'IMAGE8', 'IMAGE9', 'IMAGE10'] as const
  return keys
    .map((k) => row[k])
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
}

export interface ImportContext {
  categoriesBySlug: Map<string, string>
  usedSlugs: Set<string>
  dryRun: boolean
}

export async function importProduct(row: EtsyRow, ctx: ImportContext): Promise<void> {
  const title = row.TITLE?.trim()
  const priceRaw = row.PRICE?.trim()
  if (!title || !priceRaw) {
    console.log(`[SKIP] empty title or price`)
    return
  }

  const categorySlug = detectCategorySlug(title, row.TAGS ?? '')
  const categoryId = ctx.categoriesBySlug.get(categorySlug)
  if (!categoryId) {
    throw new Error(`Category not found in DB: ${categorySlug}`)
  }

  const productSlug = makeUniqueSlug(title, ctx.usedSlugs)
  const imageUrls = collectImageUrls(row)
  const stock = Number.parseInt(row.QUANTITY ?? '0', 10) || 0
  const price = new Prisma.Decimal(priceRaw)
  const messageOptions = parseMessageOptions(row)

  if (ctx.dryRun) {
    console.log(`[DRY] ${productSlug} → ${categorySlug} (price=${priceRaw}, stock=${stock}, images=${imageUrls.length}, msgOpts=${messageOptions.length})`)
    return
  }

  console.log(`[..] ${productSlug} → ${categorySlug} (uploading ${imageUrls.length} images)`)
  const uploadedUrls = await uploadProductImages(imageUrls, categorySlug, productSlug)

  await prisma.product.upsert({
    where: { slug: productSlug },
    update: {
      name: title,
      description: row.DESCRIPTION ?? '',
      price,
      stock,
      images: uploadedUrls,
      messageOptions,
      isPublished: true,
      categoryId,
    },
    create: {
      name: title,
      slug: productSlug,
      description: row.DESCRIPTION ?? '',
      price,
      stock,
      images: uploadedUrls,
      messageOptions,
      isPublished: true,
      categoryId,
    },
  })

  console.log(`[OK] ${productSlug}`)
}

async function loadCategories(): Promise<Map<string, string>> {
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } })
  return new Map(cats.map((c) => [c.slug, c.id]))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const csvPath = args.find((a) => !a.startsWith('--'))

  if (!csvPath) {
    console.error('Usage: tsx scripts/import-etsy.ts <csv-path> [--dry-run]')
    process.exit(1)
  }

  console.log(`Parsing CSV: ${csvPath}`)
  const rows = parseCsv(csvPath)
  console.log(`Found ${rows.length} rows`)

  console.log('Loading categories from DB...')
  const categoriesBySlug = await loadCategories()
  if (categoriesBySlug.size === 0) {
    throw new Error('No categories in DB. Run `prisma db seed` first.')
  }
  console.log(`Loaded ${categoriesBySlug.size} categories`)

  const csvBaseSlugs = new Set(
    rows
      .map((r) => r.TITLE?.trim() ?? '')
      .filter((t) => t.length > 0)
      .map((t) => slugify(t, { lower: true, strict: true })),
  )
  const existingProducts = await prisma.product.findMany({ select: { slug: true } })
  const usedSlugs = new Set(existingProducts.filter((p) => !csvBaseSlugs.has(p.slug)).map((p) => p.slug))
  console.log(`Pre-loaded ${usedSlugs.size} non-CSV product slugs (rows that re-import to their canonical slug stay idempotent; collisions with seed/manual products get a -N suffix)`)

  if (dryRun) {
    console.log('=== DRY RUN — no DB writes, no S3 uploads ===')
  }

  const ctx: ImportContext = {
    categoriesBySlug,
    usedSlugs,
    dryRun,
  }

  const stats = { imported: 0, errors: 0 }
  for (const row of rows) {
    try {
      await importProduct(row, ctx)
      stats.imported++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[ERR] ${row.TITLE}: ${msg}`)
      stats.errors++
    }
  }

  console.log(`\nDone. imported=${stats.imported}, errors=${stats.errors}`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/import-etsy.ts')) {
  main()
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
