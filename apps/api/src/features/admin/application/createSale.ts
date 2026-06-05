import { AppError } from '../../../shared/errors'
import type { AdminRepository, CreateSale } from '../types'

function hasOverlap(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): boolean {
  return aStart <= bEnd && aEnd >= bStart
}

export function makeCreateSale(repo: AdminRepository): CreateSale {
  return async (input) => {
    const existing = await repo.listSales()
    const newStart = new Date(input.startsAt)
    const newEnd = new Date(input.endsAt)

    const conflict = existing.find((s) =>
      hasOverlap(newStart, newEnd, new Date(s.startsAt), new Date(s.endsAt)),
    )
    if (conflict) {
      throw new AppError(409, `Sale period overlaps with existing sale "${conflict.name}"`)
    }

    return repo.createSale(input)
  }
}
