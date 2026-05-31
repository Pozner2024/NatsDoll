<template>
  <section class="account-purchases">
    <h2 class="account-purchases__title">
      Purchases
    </h2>

    <p
      v-if="loading && orders.length === 0"
      class="account-purchases__status"
    >
      Loading…
    </p>

    <p
      v-else-if="error"
      class="account-purchases__status account-purchases__status--error"
    >
      {{ error }}
    </p>

    <div
      v-else-if="orders.length === 0"
      class="account-purchases__empty"
    >
      <svg
        class="account-purchases__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
        />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <p>No orders yet</p>
      <RouterLink
        to="/shop"
        class="account-purchases__link"
      >
        Browse the shop
      </RouterLink>
    </div>

    <div
      v-else
      class="account-purchases__list"
    >
      <RouterLink
        v-for="order in orders"
        :key="order.id"
        :to="`/account/purchases/${order.id}`"
        class="account-purchases__card"
      >
        <div class="account-purchases__card-image">
          <img
            v-if="order.firstItemImage"
            :src="order.firstItemImage"
            :alt="'Order ' + order.id"
          >
          <span
            v-else
            class="account-purchases__card-image-placeholder"
          >?</span>
        </div>
        <div class="account-purchases__card-info">
          <p class="account-purchases__card-date">
            {{ formatDate(order.createdAt) }}
          </p>
          <p class="account-purchases__card-items">
            {{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}
          </p>
          <p class="account-purchases__card-total">
            {{ formatPrice(order.totalAmount) }}
          </p>
        </div>
        <span
          class="account-purchases__card-status"
          :class="`account-purchases__card-status--${order.status.toLowerCase()}`"
        >
          {{ order.status }}
        </span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { formatPrice, formatDate } from '@/shared'
import { useOrderStore } from '@/entities/order'

const orderStore = useOrderStore()
const orders = computed(() => orderStore.myOrders)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)


onMounted(() => {
  orderStore.loadMyOrders()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-purchases {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }

  &__link {
    color: var(--color-accent);
    text-decoration: underline;
    font-size: 0.9rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__card {
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

  &__card-image {
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

  &__card-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__card-date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__card-items {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__card-total {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__card-status {
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

    &--paid,
    &--processing,
    &--shipped {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

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
}
</style>
