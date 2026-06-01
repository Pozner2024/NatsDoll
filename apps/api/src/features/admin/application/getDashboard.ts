import type { AdminRepository, GetDashboard } from '../types'

export function makeGetDashboard(repo: AdminRepository): GetDashboard {
  return () => repo.getDashboardData()
}
