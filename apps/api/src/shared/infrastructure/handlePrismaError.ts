import { Prisma } from '@prisma/client'
import { AppError, NotFoundError } from '../errors'

type HandlerOptions = {
  notFoundMessage?: string
}

export function handlePrismaError(err: unknown, options: HandlerOptions = {}): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025' && options.notFoundMessage) {
      throw new NotFoundError(options.notFoundMessage)
    }
    console.error('Prisma known error:', { code: err.code, meta: err.meta })
    throw new AppError(500, 'Database error')
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new AppError(500, 'Database error')
  }
  throw err
}
