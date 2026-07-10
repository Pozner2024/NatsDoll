export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(
  totalItemCount: number,
  baseCost: number = SHIPPING_BASE,
  perExtraItemCost: number = SHIPPING_PER_EXTRA_ITEM,
): number {
  return baseCost + (totalItemCount - 1) * perExtraItemCost
}
