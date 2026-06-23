export const PAID_STATUSES: Array<'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'> = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]

export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.includes(status as typeof PAID_STATUSES[number])
}

export const TERMINAL_STATUSES: Array<'CANCELLED' | 'REFUNDED'> = ['CANCELLED', 'REFUNDED']

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number])
}
