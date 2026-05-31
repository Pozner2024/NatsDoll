export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(totalItemCount: number): number {
  return SHIPPING_BASE + (totalItemCount - 1) * SHIPPING_PER_EXTRA_ITEM
}
