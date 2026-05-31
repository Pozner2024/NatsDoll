<template>
  <section class="account-dashboard">
    <h2 class="account-dashboard__greeting">
      Hello, {{ firstName }}!
    </h2>

    <div
      v-if="lastOrder"
      class="account-dashboard__last-order"
    >
      <h3 class="account-dashboard__section-title">
        Last order
      </h3>
      <RouterLink
        :to="`/orders/${lastOrder.id}`"
        class="account-dashboard__order-card"
      >
        <div class="account-dashboard__order-image">
          <img
            v-if="lastOrder.firstItemImage"
            :src="lastOrder.firstItemImage"
            :alt="'Order ' + lastOrder.id"
          >
          <span
            v-else
            class="account-dashboard__order-image-placeholder"
          >?</span>
        </div>
        <div class="account-dashboard__order-info">
          <p class="account-dashboard__order-date">
            {{ formatDate(lastOrder.createdAt) }}
          </p>
          <p class="account-dashboard__order-items">
            {{ lastOrder.itemCount }} {{ lastOrder.itemCount === 1 ? 'item' : 'items' }}
          </p>
          <p class="account-dashboard__order-total">
            {{ formatPrice(lastOrder.totalAmount) }}
          </p>
        </div>
        <span
          class="account-dashboard__order-status"
          :class="`account-dashboard__order-status--${lastOrder.status.toLowerCase()}`"
        >
          {{ lastOrder.status }}
        </span>
      </RouterLink>
    </div>

    <div
      v-else
      class="account-dashboard__no-orders"
    >
      <p>You haven't placed any orders yet.</p>
      <RouterLink
        to="/shop"
        class="account-dashboard__shop-link"
      >
        Browse the shop
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { formatPrice, formatDate } from '@/shared'
import { useAuthStore } from '@/entities/user'
import { useOrderStore } from '@/entities/order'

const authStore = useAuthStore()
const orderStore = useOrderStore()

const firstName = computed(() => authStore.user?.name.split(' ')[0] ?? '')
const lastOrder = computed(() => orderStore.myOrders[0] ?? null)


onMounted(() => {
  orderStore.loadMyOrders()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-dashboard {
  &__greeting {
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 1.75rem;

    @include tablet {
      font-size: 2rem;
    }
  }

  &__section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  &__order-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-white);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    text-decoration: none;
    transition: border-color 0.15s;

    &:hover {
      border-color: var(--color-accent);
    }
  }

  &__order-image {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__order-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__order-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__order-date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__order-items {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__order-total {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__order-status {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.65rem;
    border-radius: 20px;
    flex-shrink: 0;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--processing {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--completed {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }

  &__no-orders {
    padding: 2rem 0;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__shop-link {
    color: var(--color-accent);
    text-decoration: underline;
    font-size: 0.9rem;
    align-self: flex-start;
  }
}
</style>
