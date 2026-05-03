<template>
  <div class="product-info">
    <h1 class="product-info__name">{{ product.name }}</h1>
    <p class="product-info__price">{{ formatPrice(product.price) }}</p>
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
import { AppButton, formatPrice } from '@/shared'
import type { ProductDetail } from '@/entities/product'

defineProps<{ product: ProductDetail }>()
const emit = defineEmits<{ 'add-to-cart': [] }>()
</script>

<style scoped lang="scss">
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

  &__btn {
    display: block;
    width: 100%;
    text-align: center;
    margin-bottom: 1rem;

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
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
