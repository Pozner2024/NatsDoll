import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Dolls', slug: 'dolls' },
  { name: 'Animals', slug: 'animals' },
  { name: 'Miniatures', slug: 'miniatures' },
  { name: 'Jewelry', slug: 'jewelry' },
  { name: 'Custom Orders', slug: 'custom-orders' },
]

async function main() {
  console.log('Seeding categories...')

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }

  console.log(`Seeded ${categories.length} categories.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
