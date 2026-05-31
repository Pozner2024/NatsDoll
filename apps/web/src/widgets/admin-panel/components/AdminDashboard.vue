<template>
  <div class="admin-dashboard">
    <AdminTopbar
      title="Dashboard"
      subtitle="Overview for today"
    />

    <div class="admin-dashboard__content">
      <div class="admin-dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__label">
            Orders today
          </div>
          <div class="stat-card__value">
            —
          </div>
          <div class="stat-card__hint">
            Loading...
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">
            Revenue today
          </div>
          <div class="stat-card__value">
            —
          </div>
          <div class="stat-card__hint">
            Month total: —
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">
            New messages
          </div>
          <div class="stat-card__value stat-card__value--accent">
            —
          </div>
          <div class="stat-card__hint">
            Unread: —
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">
            Active listings
          </div>
          <div class="stat-card__value">
            —
          </div>
          <div class="stat-card__hint">
            Published products
          </div>
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
          <div class="admin-panel-card__body admin-panel-card__body--empty">
            No orders yet
          </div>
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
          <div class="admin-panel-card__body admin-panel-card__body--empty">
            No messages yet
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
</script>

<style scoped lang="scss">
.admin-dashboard {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__content {
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}

.stat-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;

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
</style>
