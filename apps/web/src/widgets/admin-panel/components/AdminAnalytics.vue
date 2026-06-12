<template>
  <div class="admin-analytics">
    <AdminTopbar
      title="Analytics"
      subtitle="Sales overview"
    />

    <div class="admin-analytics__content">
      <div class="admin-analytics__period">
        <button
          v-for="p in PERIODS"
          :key="p.value"
          class="admin-analytics__period-btn"
          :class="{ 'admin-analytics__period-btn--active': period === p.value }"
          @click="period = p.value"
        >
          {{ p.label }}
        </button>
      </div>

      <div
        v-if="error"
        class="admin-analytics__error"
      >
        <span>{{ error }}</span>
        <button
          class="admin-analytics__retry"
          @click="refresh"
        >
          Retry
        </button>
      </div>

      <template v-else>
        <div class="admin-analytics__stats">
          <div class="stat-card">
            <div class="stat-card__label">
              Revenue
            </div>
            <div class="stat-card__value">
              {{ isLoading ? '—' : formatMoney(data?.summary.totalRevenue ?? 0) }}
            </div>
            <div
              v-if="!isLoading && data && data.summary.revenueChange !== null"
              class="stat-card__hint"
              :class="{ 'stat-card__hint--down': data.summary.revenueChange < 0 }"
            >
              {{ formatChange(data.summary.revenueChange) }} vs prev period
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">
              Orders
            </div>
            <div class="stat-card__value">
              {{ isLoading ? '—' : data?.summary.totalOrders ?? 0 }}
            </div>
            <div
              v-if="!isLoading && data && data.summary.ordersChange !== null"
              class="stat-card__hint"
              :class="{ 'stat-card__hint--down': data.summary.ordersChange < 0 }"
            >
              {{ formatChange(data.summary.ordersChange) }} vs prev period
            </div>
          </div>
        </div>

        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">Revenue by {{ granularityLabel }}</span>
          </div>
          <div class="admin-panel-card__body">
            <div class="admin-analytics__chart-wrap">
              <Bar
                v-if="revenueChartData"
                :data="revenueChartData"
                :options="revenueChartOptions"
              />
              <div
                v-else
                class="admin-analytics__loading"
              >
                Loading…
              </div>
            </div>
          </div>
        </div>

        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">Orders by {{ granularityLabel }}</span>
          </div>
          <div class="admin-panel-card__body">
            <div class="admin-analytics__chart-wrap">
              <Bar
                v-if="ordersChartData"
                :data="ordersChartData"
                :options="ordersChartOptions"
              />
              <div
                v-else
                class="admin-analytics__loading"
              >
                Loading…
              </div>
            </div>
          </div>
        </div>

        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">Traffic &amp; Sources</span>
          </div>
          <div class="admin-panel-card__body">
            <div class="admin-analytics__traffic-links">
              <a
                href="https://stats.natsdoll.com"
                target="_blank"
                rel="noopener noreferrer"
                class="admin-analytics__traffic-link"
              >↗ Umami Analytics</a>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                class="admin-analytics__traffic-link"
              >↗ Google Search Console</a>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import AdminTopbar from './AdminTopbar.vue'
import { useAnalytics } from '../adminAnalyticsApi'
import type { AnalyticsPeriod } from '../adminAnalyticsApi'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const COLOR_ACCENT = '#8b5e52'
const COLOR_BORDER = '#ecddd5'

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Today',     value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: '7 days',    value: '7d' },
  { label: '30 days',   value: '30d' },
  { label: '3 months',  value: '90d' },
  { label: '1 year',    value: '365d' },
]

const period = ref<AnalyticsPeriod>('7d')
const { data, isLoading, error, refresh } = useAnalytics(period)

const granularityLabel = computed(() => {
  if (period.value === 'today' || period.value === 'yesterday') return 'hour'
  if (period.value === '365d') return 'month'
  if (period.value === '90d') return 'week'
  return 'day'
})

function barColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? COLOR_ACCENT : COLOR_BORDER))
}

function formatLabel(date: string): string {
  if (period.value === 'today' || period.value === 'yesterday') {
    // "YYYY-MM-DD HH:00" → "HH:00"
    return date.slice(11)
  }
  return date
}

const revenueChartData = computed(() => {
  if (!data.value) return null
  const labels = data.value.revenue.map(r => formatLabel(r.date))
  return {
    labels,
    datasets: [{
      data: data.value.revenue.map(r => r.amount),
      backgroundColor: barColors(labels.length),
      borderRadius: 3,
    }],
  }
})

const ordersChartData = computed(() => {
  if (!data.value) return null
  const labels = data.value.orders.map(o => formatLabel(o.date))
  return {
    labels,
    datasets: [{
      data: data.value.orders.map(o => o.count),
      backgroundColor: barColors(labels.length),
      borderRadius: 3,
    }],
  }
})

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Playfair Display' }, color: '#5a3d35' } },
    y: { display: false, grid: { color: '#ecddd5' } },
  },
}

const revenueChartOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) => `$${(ctx.parsed.y ?? 0).toFixed(2)}`,
      },
    },
  },
}

const ordersChartOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) => `${ctx.parsed.y ?? 0} orders`,
      },
    },
  },
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatChange(value: number): string {
  return value >= 0 ? `↑ ${value}%` : `↓ ${Math.abs(value)}%`
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-analytics {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__content {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    @include tablet {
      padding: 28px 32px;
      gap: 24px;
    }
  }

  &__period {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__period-btn {
    padding: 5px 14px;
    font-family: var(--font-display);
    font-size: 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-white);
    color: var(--color-text-muted);
    letter-spacing: 0.03em;

    &--active {
      background: var(--color-accent);
      color: var(--color-white);
      border-color: var(--color-accent);
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @include tablet {
      gap: 16px;
    }
  }

  &__chart-wrap {
    height: 160px;

    @include tablet {
      height: 200px;
    }
  }

  &__loading {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__retry {
    font-size: 0.8rem;
    padding: 6px 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
  }

  &__traffic-links {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__traffic-link {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    font-family: var(--font-display);
    font-size: 0.75rem;
    color: var(--color-accent);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    text-decoration: none;
    letter-spacing: 0.02em;

    &:hover {
      color: var(--color-accent-hover);
      border-color: var(--color-accent);
    }
  }
}

.stat-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;

  @include tablet {
    padding: 20px;
  }

  &__label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-bottom: 8px;
  }

  &__value {
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  &__hint {
    font-size: 0.68rem;
    color: var(--color-accent);
    margin-top: 6px;
    font-style: italic;

    &--down {
      color: var(--color-error);
    }
  }
}

.admin-panel-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__head {
    padding: 14px 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text);
  }

  &__body {
    padding: 16px 20px;
  }
}
</style>
