import { z } from 'zod'
import { apiFetch } from '@/shared'
import type { Category } from './types'

const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
})

const CategoryListSchema = z.array(CategorySchema)

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch('/categories')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return CategoryListSchema.parse(data)
}
