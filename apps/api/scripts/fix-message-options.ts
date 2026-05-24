import slugify from 'slugify'
import { prisma } from '../src/shared/infrastructure'
import { parseCsv, parseMessageOptions, makeUniqueSlug } from './import-etsy'

async function main(): Promise<void> {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: tsx scripts/fix-message-options.ts <csv-path>')
    process.exit(1)
  }

  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('=== DRY RUN ===')

  const rows = parseCsv(csvPath)

  // Воспроизводим ту же логику usedSlugs, что и при импорте:
  // CSV-слаги считаются "свободными" (их продукты уже в БД со своим canonical slug)
  const csvBaseSlugs = new Set(
    rows
      .map((r) => r.TITLE?.trim() ?? '')
      .filter((t) => t.length > 0)
      .map((t) => slugify(t, { lower: true, strict: true })),
  )
  const existingProducts = await prisma.product.findMany({ select: { slug: true } })
  const usedSlugs = new Set(existingProducts.filter((p) => !csvBaseSlugs.has(p.slug)).map((p) => p.slug))
  const rowSlugs = rows.map((row) => makeUniqueSlug(row.TITLE?.trim() ?? '', new Set(usedSlugs)))

  const stats = { updated: 0, skipped: 0 }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const slug = rowSlugs[i]
    const messageOptions = parseMessageOptions(row)

    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, messageOptions: true } })
    if (!product) {
      console.log(`[MISS] ${slug}`)
      continue
    }

    const same = JSON.stringify(product.messageOptions) === JSON.stringify(messageOptions)
    if (same) { stats.skipped++; continue }

    if (dryRun) {
      console.log(`[DRY] ${slug}`)
      console.log(`  было:  ${JSON.stringify(product.messageOptions)}`)
      console.log(`  стало: ${JSON.stringify(messageOptions)}`)
    } else {
      await prisma.product.update({ where: { id: product.id }, data: { messageOptions } })
      console.log(`[OK] ${slug}  ${JSON.stringify(messageOptions)}`)
    }
    stats.updated++
  }

  console.log(`\nDone. updated=${stats.updated}, skipped=${stats.skipped}`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
