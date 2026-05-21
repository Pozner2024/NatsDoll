<template>
  <section class="cart-page">
    <h1 class="cart-page__title">Your cart</h1>

    <div v-if="loading" class="cart-page__loading">Loading…</div>

    <div v-else-if="error" class="cart-page__error">{{ error }}</div>

    <div v-else-if="items.length === 0" class="cart-page__empty">
      <p class="cart-page__empty-text">Your cart is empty.</p>
      <RouterLink to="/shop" class="cart-page__empty-link">Browse the shop</RouterLink>
    </div>

    <div v-else class="cart-page__layout">
      <ul class="cart-page__items">
        <CartLineItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          @update="onUpdate"
          @remove="onRemove"
        />
      </ul>

      <aside class="cart-page__summary">
        <h2 class="cart-page__summary-title">Summary</h2>
        <p class="cart-page__summary-row">
          <span>Items</span>
          <span>{{ itemCount }}</span>
        </p>
        <p class="cart-page__summary-row cart-page__summary-row--total">
          <span>Total</span>
          <span>{{ formatPrice(totalAmount) }}</span>
        </p>
        <AppButton
          type="button"
          class="cart-page__checkout"
          :disabled="itemCount === 0"
          @click="router.push({ name: 'checkout' })"
        >
          Checkout
        </AppButton>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AppButton, formatPrice } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import CartLineItem from './components/CartLineItem.vue'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()

const items = computed(() => cartStore.items)
const itemCount = computed(() => cartStore.itemCount)
const totalAmount = computed(() => cartStore.totalAmount)
const loading = computed(() => cartStore.loading)
const error = computed(() => cartStore.error)

onMounted(async () => {
  if (!authStore.authReady) await authStore.initAuth()
  if (authStore.isLoggedIn) await cartStore.load()
})

async function onUpdate(itemId: string, quantity: number): Promise<void> {
  await cartStore.update(itemId, quantity)
}

async function onRemove(itemId: string): Promise<void> {
  await cartStore.remove(itemId)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.cart-page {
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

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
  }

  &__empty-link {
    display: inline-block;
    margin-top: 0.75rem;
    color: var(--color-accent);
    text-decoration: underline;
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
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  &__summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0;
    color: var(--color-text-muted);

    &--total {
      font-weight: 700;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }
  }

  &__checkout {
    width: 100%;
    margin-top: 0.75rem;
  }
}
</style>
