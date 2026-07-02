import type { PaymentRepository } from '../types'

export type MarkOrderPaid = (orderId: string, captureId: string | null) => Promise<boolean>

export function makeMarkOrderPaid(repo: Pick<PaymentRepository, 'markOrderPaid'>): MarkOrderPaid {
  return (orderId, captureId) => repo.markOrderPaid(orderId, captureId)
}
