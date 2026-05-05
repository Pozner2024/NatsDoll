<template>
  <div class="product-info">
    <h1 class="product-info__name">{{ product.name }}</h1>
    <p class="product-info__price">{{ formatPrice(product.price) }}</p>
    <div v-if="product.stock > 0" class="product-info__qty">
      <button type="button" class="product-info__qty-btn" :disabled="qty <= 1" @click="qty--">−</button>
      <span class="product-info__qty-val">{{ qty }}</span>
      <button type="button" class="product-info__qty-btn" :disabled="qty >= product.stock" @click="qty++">+</button>
    </div>
    <AppButton
      type="button"
      class="product-info__btn"
      :disabled="product.stock === 0"
      @click="emit('add-to-cart')"
    >
      {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
    </AppButton>
    <hr class="product-info__divider">
    <p class="product-info__desc">{{ product.description }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AppButton, formatPrice } from '@/shared'
import type { ProductDetail } from '@/entities/product'

defineProps<{ product: ProductDetail }>()
const emit = defineEmits<{ 'add-to-cart': [] }>()
const qty = ref(1)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-info {
  padding: 1rem 1rem 1.5rem;

  &__name {
    font-size: 1.35rem;
    font-weight: 500;
    line-height: 1.25;
    color: var(--color-text);
    margin-bottom: 0.375rem;
  }

  &__price {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-accent);
    margin-bottom: 0.875rem;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.875rem;
  }

  &__qty-btn {
    width: 32px;
    height: 32px;
    border: 1.5px solid var(--color-border);
    background: none;
    border-radius: 4px;
    font-size: 1.1rem;
    line-height: 1;
    color: var(--color-text);
    transition: border-color 0.15s ease;

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.35;
    }
  }

  &__qty-val {
    font-size: var(--fs-base);
    font-weight: 600;
    min-width: 1.5rem;
    text-align: center;
  }

  &__btn {
    display: block;
    width: 100%;
    text-align: center;
    margin-bottom: 1rem;

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    @include desktop {
      width: auto;
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  &__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin-bottom: 0.875rem;
  }

  &__desc {
    font-size: 0.88rem;
    line-height: 1.7;
    color: var(--color-text-muted);
  }
}
</style>
