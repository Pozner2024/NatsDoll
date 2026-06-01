<template>
  <div class="admin-dashboard">
    <AdminTopbar
      title="Dashboard"
      subtitle="Overview for today"
    />

    <div
      v-if="error"
      class="admin-dashboard__error"
    >
      <span>{{ error }}</span>
      <button
        class="admin-dashboard__retry"
        @click="refresh"
      >
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-dashboard__content"
    >
      <div class="admin-dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__label">Orders today</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : data?.stats.ordersToday }}
          </div>
          <div class="stat-card__hint">
            Any status
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Revenue today</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : formatMoney(data?.stats.revenueToday ?? 0) }}
          </div>
          <div class="stat-card__hint">
            Month total: {{ isLoading ? '—' : formatMoney(data?.stats.revenueMonth ?? 0) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">New messages</div>
          <div class="stat-card__value stat-card__value--accent">
            {{ isLoading ? '—' : data?.stats.newMessages }}
          </div>
          <div class="stat-card__hint">Unread by admin</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Active listings</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : data?.stats.activeListings }}
          </div>
          <div class="stat-card__hint">Published products</div>
        </div>
      </div>

      <div class="admin-dashboard__grid">
        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">Recent Orders</span>
            <RouterLink
              to="/admin/orders"
              class="admin-panel-card__link"
            >
              View all →
            </RouterLink>
          </div>
          <div
            v-if="isLoading || !data?.recentOrders.length"
            class="admin-panel-card__body admin-panel-card__body--empty"
          >
            {{ isLoading ? 'Loading…' : 'No orders yet' }}
          </div>
          <table
            v-else
            class="orders-table"
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in data.recentOrders"
                :key="order.id"
                class="orders-table__row"
              >
                <td>
                  <RouterLink
                    :to="`/admin/orders/${order.id}`"
                    class="orders-table__link"
                  >
                    #{{ order.orderNumber }}
                  </RouterLink>
                </td>
                <td>{{ order.userName }}</td>
                <td>{{ formatMoney(order.totalAmount) }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="`status-badge--${order.status.toLowerCase()}`"
                  >{{ order.status }}</span>
                </td>
                <td class="orders-table__date">{{ formatDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">New Messages</span>
            <RouterLink
              to="/admin/messages"
              class="admin-panel-card__link"
            >
              View all →
            </RouterLink>
          </div>
          <div
            v-if="isLoading || !data?.recentMessages.length"
            class="admin-panel-card__body admin-panel-card__body--empty"
          >
            {{ isLoading ? 'Loading…' : 'No messages yet' }}
          </div>
          <ul
            v-else
            class="messages-list"
          >
            <li
              v-for="msg in data.recentMessages"
              :key="msg.id"
              class="messages-list__item"
            >
              <div class="messages-list__meta">
                <span class="messages-list__name">{{ msg.userName }}</span>
                <span
                  v-if="msg.orderNumber"
                  class="messages-list__order"
                >#{{ msg.orderNumber }}</span>
                <span class="messages-list__date">{{ formatDate(msg.createdAt) }}</span>
              </div>
              <p class="messages-list__text">{{ truncate(msg.text, 80) }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import { useDashboard } from '../adminDashboardApi'

const { data, isLoading, error, refresh } = useDashboard()

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-dashboard {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
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
  }

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

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @include tablet {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @include tablet {
      grid-template-columns: 1fr 1fr;
      gap: 20px;
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

    &--accent {
      color: var(--color-accent);
    }
  }

  &__hint {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    margin-top: 6px;
    font-style: italic;
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

  &__link {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
    text-decoration: none;

    &:hover {
      color: var(--color-accent-hover);
    }
  }

  &__body {
    padding: 16px 20px;

    &--empty {
      font-size: 0.82rem;
      color: var(--color-text-muted);
      font-style: italic;
      text-align: center;
      padding: 32px 20px;
    }
  }
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th {
    text-align: left;
    padding: 8px 12px;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 10px 12px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
  }

  tr:last-child td {
    border-bottom: none;
  }

  &__row:hover td {
    background: var(--color-bg);
  }

  &__link {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  &__date {
    white-space: nowrap;
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &--pending   { background: rgb(148 163 184 / 0.2); color: #64748b; }
  &--paid      { background: rgb(34 197 94 / 0.15);  color: #16a34a; }
  &--processing { background: rgb(234 179 8 / 0.15); color: #ca8a04; }
  &--shipped   { background: rgb(59 130 246 / 0.15); color: #2563eb; }
  &--delivered { background: rgb(21 128 61 / 0.15);  color: #15803d; }
  &--cancelled { background: rgb(239 68 68 / 0.15);  color: #dc2626; }
  &--refunded  { background: rgb(239 68 68 / 0.15);  color: #dc2626; }
}

.messages-list {
  list-style: none;
  padding: 0;
  margin: 0;

  &__item {
    padding: 12px 20px;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__order {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
  }

  &__date {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__text {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }
}
</style>
