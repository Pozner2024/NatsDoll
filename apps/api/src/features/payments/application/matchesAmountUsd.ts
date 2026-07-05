export function matchesAmountUsd(actual: unknown, expectedUsd: number): boolean {
  if (typeof actual !== 'string' && typeof actual !== 'number') {
    return false
  }
  const parsed = typeof actual === 'number' ? actual : Number(actual)
  if (!Number.isFinite(parsed)) {
    return false
  }
  return Math.round(parsed * 100) === Math.round(expectedUsd * 100)
}
