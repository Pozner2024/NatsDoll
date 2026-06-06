<template>
  <div class="admin-sales">
    <AdminTopbar
      title="Sales & Discounts"
      subtitle="Seasonal promotions"
    >
      <template #action>
        <RouterLink
          to="/admin/sales/new"
          class="admin-sales__new-btn"
        >
          + New sale
        </RouterLink>
      </template>
    </AdminTopbar>

    <div
      v-if="error"
      class="admin-sales__error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="isLoading && !sales.length"
      class="admin-sales__loading"
    >
      Loading…
    </div>

    <template v-else>
      <div class="admin-sales__active-section">
        <template v-if="activeSales.length">
          <div
            v-for="sale in activeSales"
            :key="sale.id"
            class="admin-sales__active-card"
          >
            <div class="admin-sales__card-header">
              <span
                class="admin-sales__status-dot"
                :class="`admin-sales__status-dot--${saleStatus(sale)}`"
              />
              <span class="admin-sales__status-label">
                {{ saleStatus(sale) === 'active' ? 'Active' : 'Scheduled' }}
              </span>
              <span class="admin-sales__card-name">{{ sale.name }}</span>
              <div class="admin-sales__card-actions">
                <RouterLink
                  :to="`/admin/sales/${sale.id}`"
                  class="admin-sales__btn admin-sales__btn--secondary"
                >
                  Edit
                </RouterLink>
                <button
                  class="admin-sales__btn admin-sales__btn--danger"
                  @click="handleDelete(sale.id)"
                >
                  End
                </button>
              </div>
            </div>
            <div class="admin-sales__card-meta">
              <span class="admin-sales__badge">-{{ sale.discount }}%</span>
              <span class="admin-sales__meta-item">{{ formatPeriod(sale) }}</span>
              <span class="admin-sales__meta-item">{{ formatScope(sale) }}</span>
              <span class="admin-sales__meta-item admin-sales__meta-item--muted">{{ timeLabel(sale) }}</span>
            </div>
          </div>
        </template>

        <div
          v-else
          class="admin-sales__empty"
        >
          <span class="admin-sales__empty-icon">%</span>
          <p class="admin-sales__empty-title">No sale is running right now</p>
          <p class="admin-sales__empty-sub">Create a seasonal sale to discount your products</p>
          <RouterLink
            to="/admin/sales/new"
            class="admin-sales__new-btn"
          >
            + Start a sale
          </RouterLink>
        </div>
      </div>

      <div
        v-if="pastSales.length"
        class="admin-sales__past"
      >
        <h2 class="admin-sales__past-title">Past sales</h2>
        <div class="admin-sales__past-list">
          <div
            v-for="sale in pastSales"
            :key="sale.id"
            class="admin-sales__past-item"
          >
            <span class="admin-sales__past-name">{{ sale.name }}</span>
            <span class="admin-sales__past-badge">-{{ sale.discount }}%</span>
            <span class="admin-sales__past-period">{{ formatPeriod(sale) }}</span>
            <span class="admin-sales__past-scope">{{ formatScope(sale) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import { useAdminSales, saleStatus } from '../adminSalesApi'
import type { SaleRecord } from '../adminSalesApi'

const { sales, isLoading, error, deleteSale } = useAdminSales()

const activeSales = computed(() =>
  sales.value.filter((s) => saleStatus(s) === 'active' || saleStatus(s) === 'scheduled'),
)
const pastSales = computed(() => sales.value.filter((s) => saleStatus(s) === 'ended'))

function formatPeriod(sale: SaleRecord) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(sale.startsAt)} → ${fmt(sale.endsAt)}`
}

function formatScope(sale: SaleRecord) {
  if (sale.scope === 'ALL') return 'All products'
  if (sale.scope === 'CATEGORIES') return `${sale.categoryIds.length} categories`
  return `${sale.productIds.length} products`
}

function timeLabel(sale: SaleRecord) {
  const now = new Date()
  const start = new Date(sale.startsAt)
  const end = new Date(sale.endsAt)
  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / 86400000)
    return `Starts in ${days} day${days === 1 ? '' : 's'}`
  }
  const days = Math.ceil((end.getTime() - now.getTime()) / 86400000)
  return `${days} day${days === 1 ? '' : 's'} left`
}

async function handleDelete(id: string) {
  if (!confirm('End this sale? This cannot be undone.')) return
  await deleteSale(id)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-sales {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__new-btn {
    font-size: 0.75rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 6px;
    padding: 7px 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }

  &__error,
  &__loading {
    padding: 40px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__active-section {
    padding: 16px;

    @include tablet {
      padding: 20px 32px;
    }
  }

  &__active-card {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-white);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &--active    { background: #3a7d44; }
    &--scheduled { background: #c97b1a; }
    &--ended     { background: var(--color-text-muted); }
  }

  &__status-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  &__card-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
  }

  &__card-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  &__btn {
    font-size: 0.72rem;
    border-radius: 5px;
    padding: 5px 12px;
    font-weight: 600;
    border: 1px solid var(--color-border);
    background: var(--color-white);
    color: var(--color-text);
    text-decoration: none;
    display: inline-flex;
    align-items: center;

    &--danger {
      border-color: #c0392b;
      color: #c0392b;
    }
  }

  &__card-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  &__badge {
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 4px;
    padding: 2px 8px;
  }

  &__meta-item {
    font-size: 0.78rem;
    color: var(--color-text);

    &--muted {
      color: var(--color-text-muted);
      font-style: italic;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    gap: 8px;
    text-align: center;
  }

  &__empty-icon {
    font-size: 2.5rem;
    color: var(--color-text-muted);
    font-weight: 700;
    line-height: 1;
  }

  &__empty-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 4px 0 0;
  }

  &__empty-sub {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: 0 0 12px;
  }

  &__past {
    padding: 0 16px 24px;

    @include tablet {
      padding: 0 32px 24px;
    }
  }

  &__past-title {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    margin-bottom: 8px;
  }

  &__past-list {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
  }

  &__past-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    font-size: 0.78rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-white);

    &:last-child {
      border-bottom: none;
    }
  }

  &__past-name {
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
  }

  &__past-badge {
    font-size: 0.7rem;
    font-weight: 700;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1px 6px;
    color: var(--color-text-muted);
  }

  &__past-period,
  &__past-scope {
    color: var(--color-text-muted);
    font-style: italic;
    white-space: nowrap;
  }
}
</style>
