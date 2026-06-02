<template>
  <div class="order-list">
    <div class="order-list__filters">
      <select
        :value="filters.status"
        class="order-list__select"
        @change="$emit('filter-change', { status: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
        <option value="PROCESSING">Processing</option>
        <option value="SHIPPED">Shipped</option>
        <option value="DELIVERED">Delivered</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REFUNDED">Refunded</option>
      </select>
      <input
        :value="filters.search"
        class="order-list__search"
        placeholder="Search #N or name…"
        @input="onSearch(($event.target as HTMLInputElement).value)"
      >
    </div>

    <div
      v-if="orders.length === 0"
      class="order-list__empty"
    >
      No orders found
    </div>

    <div
      v-for="order in orders"
      :key="order.id"
      class="order-list__item"
      :class="{ 'order-list__item--active': order.id === selectedId }"
      @click="$emit('select', order.id)"
    >
      <div class="order-list__item-header">
        <span class="order-list__item-number">#{{ order.orderNumber }}</span>
        <span
          class="order-list__item-badge"
          :class="`order-list__item-badge--${order.status.toLowerCase()}`"
        >{{ order.status }}</span>
      </div>
      <div class="order-list__item-sub">
        <span class="order-list__item-name">{{ order.userName }}</span>
        <span class="order-list__item-total">{{ formatPrice(order.totalAmount) }}</span>
      </div>
      <span class="order-list__item-date">{{ formatDate(order.createdAt) }}</span>
    </div>

    <div
      v-if="totalPages > 1"
      class="order-list__pagination"
    >
      <button
        class="order-list__page-btn"
        :disabled="filters.page <= 1"
        @click="$emit('page-change', filters.page - 1)"
      >
        ← Prev
      </button>
      <span class="order-list__page-info">{{ filters.page }} / {{ totalPages }}</span>
      <button
        class="order-list__page-btn"
        :disabled="filters.page >= totalPages"
        @click="$emit('page-change', filters.page + 1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatPrice, formatDate } from '@/shared'
import type { AdminOrderSummary, AdminOrderFilters } from '../adminOrdersApi'

defineProps<{
  orders: AdminOrderSummary[]
  selectedId: string | null
  totalPages: number
  filters: AdminOrderFilters
}>()

const emit = defineEmits<{
  select: [id: string]
  'filter-change': [patch: Partial<AdminOrderFilters>]
  'page-change': [page: number]
}>()

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function onSearch(value: string) {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    emit('filter-change', { search: value })
  }, 300)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  &__filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__select,
  &__search {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.45rem 0.75rem;
    font-size: 0.82rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    width: 100%;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__empty {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.88rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    flex-shrink: 0;

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.06);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.1);
      border-left: 3px solid var(--color-accent);
      padding-left: calc(1rem - 3px);
    }
  }

  &__item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
  }

  &__item-number {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__item-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--paid,
    &--processing {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--shipped,
    &--delivered {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled,
    &--refunded {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }

  &__item-sub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
  }

  &__item-name {
    font-size: 0.8rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 55%;
  }

  &__item-total {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__item-date {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    margin-top: auto;
  }

  &__page-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.78rem;
    color: var(--color-text);

    &:disabled {
      opacity: 0.4;
    }

    &:not(:disabled):hover {
      background: var(--color-border);
    }
  }

  &__page-info {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }
}
</style>
