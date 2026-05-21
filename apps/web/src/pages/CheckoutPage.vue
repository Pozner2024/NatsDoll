<template>
  <main class="checkout-page">
    <h1 class="checkout-page__title">Checkout</h1>

    <div class="checkout-page__layout">
      <section class="checkout-page__form-section">
        <CheckoutForm @success="onOrderPlaced" />
      </section>

      <aside class="checkout-page__summary">
        <h2 class="checkout-page__summary-title">Order summary</h2>
        <ul class="checkout-page__summary-items">
          <li
            v-for="item in items"
            :key="item.id"
            class="checkout-page__summary-item"
          >
            <span class="checkout-page__item-name">{{ item.productName }}</span>
            <span class="checkout-page__item-qty">×{{ item.quantity }}</span>
            <span class="checkout-page__item-price">{{ formatPrice(item.subtotal) }}</span>
          </li>
        </ul>
        <p class="checkout-page__total">
          <span>Total</span>
          <span>{{ formatPrice(totalAmount) }}</span>
        </p>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatPrice } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { CheckoutForm } from '@/widgets/checkout-form'

const router = useRouter()
const cartStore = useCartStore()

const items = computed(() => cartStore.items)
const totalAmount = computed(() => cartStore.totalAmount)

function onOrderPlaced(orderId: string) {
  router.push({ name: 'order-confirmation', params: { id: orderId } })
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.checkout-page {
  padding: 1.5rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;

  @include tablet {
    padding: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    color: var(--color-text);

    @include tablet {
      font-size: 2rem;
    }
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__form-section {
    flex: 1;
  }

  &__summary {
    background: rgb(var(--btn-gradient-light) / 0.4);
    padding: 1rem;
    border-radius: 6px;

    @include tablet {
      width: 320px;
      flex-shrink: 0;
    }
  }

  &__summary-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  &__summary-items {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__summary-item {
    display: flex;
    gap: 0.5rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__item-name {
    flex: 1;
  }

  &__item-qty {
    color: var(--color-text-muted);
  }

  &__item-price {
    font-weight: 500;
    color: var(--color-text);
  }

  &__total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    border-top: 1px solid var(--color-border);
    padding-top: 0.75rem;
    margin: 0;
  }
}
</style>
