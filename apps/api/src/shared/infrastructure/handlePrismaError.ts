import { Prisma } from '@prisma/client'
import { AppError } from '../errors'

export function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma known error:', { code: err.code, meta: err.meta })
    throw new AppError(500, 'Database error')
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new AppError(500, 'Database error')
  }
  throw err
}
