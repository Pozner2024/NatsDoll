export function calcShipping(totalItemCount: number, baseCost: number, perExtraItemCost: number): number {
  return baseCost + (totalItemCount - 1) * perExtraItemCost
}
