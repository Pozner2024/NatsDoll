import type { AdminRepository, GetAnalytics } from '../types'

export function makeGetAnalytics(repo: AdminRepository): GetAnalytics {
  return (period) => repo.getAnalyticsData(period)
}
