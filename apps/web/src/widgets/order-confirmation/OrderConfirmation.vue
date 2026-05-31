<template>
  <div class="order-confirmation">
    <div
      v-if="loading"
      class="order-confirmation__loading"
    >
      Loading…
    </div>

    <div
      v-else-if="error"
      class="order-confirmation__error"
    >
      {{ error }}
    </div>

    <template v-else-if="order">
      <div class="order-confirmation__header">
        <h1 class="order-confirmation__title">
          Order placed!
        </h1>
        <p class="order-confirmation__subtitle">
          Thank you for your order. We'll start working on it right away.
        </p>
        <p class="order-confirmation__id">
          Order #{{ order.orderNumber }}
        </p>
      </div>

      <div class="order-confirmation__layout">
        <section class="order-confirmation__items">
          <h2 class="order-confirmation__section-title">
            Items
          </h2>
          <ul class="order-confirmation__list">
            <li
              v-for="item in order.items"
              :key="item.id"
              class="order-confirmation__item"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="order-confirmation__item-image"
              >
              <div class="order-confirmation__item-info">
                <RouterLink
                  :to="`/product/${item.productSlug}`"
                  class="order-confirmation__item-name"
                >
                  {{ item.productName }}
                </RouterLink>
                <p
                  v-if="item.message"
                  class="order-confirmation__item-message"
                >
                  "{{ item.message }}"
                </p>
                <p class="order-confirmation__item-meta">
                  {{ item.quantity }} × {{ formatPrice(item.price) }}
                </p>
              </div>
              <span class="order-confirmation__item-subtotal">{{ formatPrice(item.subtotal) }}</span>
            </li>
          </ul>
        </section>

        <aside class="order-confirmation__summary">
          <h2 class="order-confirmation__section-title">
            Summary
          </h2>
          <p class="order-confirmation__summary-row">
            <span>Status</span>
            <span class="order-confirmation__status">{{ order.status }}</span>
          </p>
          <p class="order-confirmation__summary-row">
            <span>Subtotal</span>
            <span>{{ formatPrice(order.totalAmount - order.shippingCost) }}</span>
          </p>
          <p class="order-confirmation__summary-row">
            <span>Shipping</span>
            <span>{{ formatPrice(order.shippingCost) }}</span>
          </p>
          <p class="order-confirmation__summary-row order-confirmation__summary-row--total">
            <span>Total</span>
            <span>{{ formatPrice(order.totalAmount) }}</span>
          </p>

          <h2 class="order-confirmation__section-title order-confirmation__section-title--mt">
            Shipping to
          </h2>
          <address class="order-confirmation__address">
            <span>{{ order.shippingAddress.fullName }}</span>
            <span>{{ order.shippingAddress.line1 }}</span>
            <span v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}</span>
            <span>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</span>
            <span>{{ order.shippingAddress.country }}</span>
          </address>
        </aside>
      </div>

      <RouterLink
        to="/shop"
        class="order-confirmation__continue"
      >
        Continue shopping
      </RouterLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'

const props = defineProps<{ orderId: string }>()

const orderStore = useOrderStore()
const order = computed(() => orderStore.currentOrder)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)

onMounted(() => {
  if (!order.value || order.value.id !== props.orderId) {
    orderStore.loadOrder(props.orderId)
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-confirmation {
  padding: 1.5rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;

  @include tablet {
    padding: 2rem;
  }

  &__loading,
  &__error {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-muted);
  }

  &__header {
    text-align: center;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__subtitle {
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }

  &__id {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__items {
    flex: 1;
  }

  &__section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;

    &--mt {
      margin-top: 1.25rem;
    }
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  &__item-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__item-info {
    flex: 1;
    min-width: 0;
  }

  &__item-name {
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__item-message {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0.2rem 0 0;
  }

  &__item-meta {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin: 0.2rem 0 0;
  }

  &__item-subtotal {
    font-weight: 600;
    flex-shrink: 0;
  }

  &__summary {
    background: rgb(var(--btn-gradient-light) / 0.4);
    padding: 1rem;
    border-radius: 6px;

    @include tablet {
      width: 280px;
      flex-shrink: 0;
    }
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0;
    color: var(--color-text-muted);
    margin: 0;

    &--total {
      font-weight: 700;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }
  }

  &__status {
    font-weight: 500;
    color: var(--color-text);
    text-transform: lowercase;
  }

  &__address {
    font-style: normal;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    line-height: 1.5;
  }

  &__continue {
    display: inline-block;
    margin-top: 2rem;
    color: var(--color-accent);
    text-decoration: underline;
    font-size: var(--fs-sm);
  }
}
</style>
