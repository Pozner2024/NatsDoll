<template>
  <section class="purchase-detail">
    <RouterLink
      to="/account/purchases"
      class="purchase-detail__back"
    >
      ← Back to purchases
    </RouterLink>

    <p
      v-if="loading"
      class="purchase-detail__status"
    >
      Loading…
    </p>

    <p
      v-else-if="error"
      class="purchase-detail__status purchase-detail__status--error"
    >
      {{ error }}
    </p>

    <template v-else-if="order">
      <div class="purchase-detail__header">
        <div>
          <p class="purchase-detail__date">
            {{ formatDate(order.createdAt) }}
          </p>
          <p class="purchase-detail__id">
            Order #{{ order.orderNumber }}
          </p>
        </div>
        <span
          class="purchase-detail__status-badge"
          :class="`purchase-detail__status-badge--${order.status.toLowerCase()}`"
        >
          {{ order.status }}
        </span>
      </div>

      <div class="purchase-detail__items">
        <h3 class="purchase-detail__section-title">
          Items
        </h3>
        <div
          v-for="item in order.items"
          :key="item.id"
          class="purchase-detail__item"
        >
          <RouterLink
            :to="`/product/${item.productSlug}`"
            class="purchase-detail__item-image"
          >
            <img
              v-if="item.productImage"
              :src="item.productImage"
              :alt="item.productName"
            >
            <span
              v-else
              class="purchase-detail__item-image-placeholder"
            >?</span>
          </RouterLink>
          <div class="purchase-detail__item-info">
            <RouterLink
              :to="`/product/${item.productSlug}`"
              class="purchase-detail__item-name"
            >
              {{ item.productName }}
            </RouterLink>
            <p
              v-if="item.message"
              class="purchase-detail__item-message"
            >
              "{{ item.message }}"
            </p>
            <p class="purchase-detail__item-qty">
              Qty: {{ item.quantity }}
            </p>
          </div>
          <p class="purchase-detail__item-subtotal">
            {{ formatPrice(item.subtotal) }}
          </p>
        </div>
      </div>

      <div class="purchase-detail__footer">
        <div class="purchase-detail__address">
          <h3 class="purchase-detail__section-title">
            Shipping address
          </h3>
          <p>{{ order.shippingAddress.fullName }}</p>
          <p>{{ order.shippingAddress.line1 }}</p>
          <p v-if="order.shippingAddress.line2">
            {{ order.shippingAddress.line2 }}
          </p>
          <p>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</p>
          <p>{{ order.shippingAddress.country }}</p>
        </div>

        <div class="purchase-detail__totals">
          <div class="purchase-detail__totals-row">
            <span class="purchase-detail__totals-label">Subtotal</span>
            <span class="purchase-detail__totals-value">{{ formatPrice(order.totalAmount - order.shippingCost) }}</span>
          </div>
          <div class="purchase-detail__totals-row">
            <span class="purchase-detail__totals-label">Shipping</span>
            <span class="purchase-detail__totals-value">{{ formatPrice(order.shippingCost) }}</span>
          </div>
          <div class="purchase-detail__totals-row purchase-detail__totals-row--grand">
            <span class="purchase-detail__totals-label">Total</span>
            <span class="purchase-detail__totals-value purchase-detail__totals-value--grand">{{ formatPrice(order.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { formatPrice, formatDate } from '@/shared'
import { useOrderStore } from '@/entities/order'

const route = useRoute()
const orderStore = useOrderStore()

const order = computed(() => orderStore.currentOrder)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)


onMounted(() => {
  orderStore.loadOrder(route.params.id as string)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.purchase-detail {
  &__back {
    display: inline-block;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: none;
    margin-bottom: 1.5rem;

    &:hover {
      color: var(--color-text);
    }
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  &__date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 0.2rem;
  }

  &__id {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__status-badge {
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

  &__section-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  &__items {
    margin-bottom: 2rem;
    border-top: 1px solid var(--color-border);
    padding-top: 1.5rem;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__item-image {
    width: 72px;
    height: 72px;
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

  &__item-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__item-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
    }
  }

  &__item-message {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item-qty {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__item-subtotal {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @include tablet {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
    }
  }

  &__address {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__totals {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  &__totals-row {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    font-size: 0.9rem;

    &--grand {
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }
  }

  &__totals-label {
    color: var(--color-text-muted);

    .purchase-detail__totals-row--grand & {
      font-weight: 600;
      color: var(--color-text);
    }
  }

  &__totals-value {
    color: var(--color-text);

    &--grand {
      font-size: 1.25rem;
      font-weight: 600;
    }
  }
}
</style>
