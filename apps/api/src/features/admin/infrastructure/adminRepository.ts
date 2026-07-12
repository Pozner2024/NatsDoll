import type { PrismaClient } from '@prisma/client'
import type { AdminRepository } from '../types'
import { makeAdminDashboardRepository } from './adminDashboardRepository'
import { makeAdminMessagesRepository } from './adminMessagesRepository'
import { makeAdminOrdersRepository } from './adminOrdersRepository'
import { makeAdminProductsRepository } from './adminProductsRepository'
import { makeAdminSalesRepository } from './adminSalesRepository'

export function makeAdminRepository(prisma: PrismaClient): AdminRepository {
  return {
    ...makeAdminDashboardRepository(prisma),
    ...makeAdminMessagesRepository(prisma),
    ...makeAdminOrdersRepository(prisma),
    ...makeAdminProductsRepository(prisma),
    ...makeAdminSalesRepository(prisma),
  }
}
