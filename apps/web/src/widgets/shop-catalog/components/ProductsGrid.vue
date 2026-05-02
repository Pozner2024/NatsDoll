<template>
  <div
    class="products-grid"
    :class="{ 'products-grid--dimmed': dimmed }"
  >
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
    />
  </div>
</template>

<script setup lang="ts">
import { ProductCard, type Product } from '@/entities/product'

defineProps<{
  products: Product[]
  dimmed?: boolean
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.products-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  transition: opacity 0.2s ease;

  &--dimmed {
    opacity: 0.6;
    pointer-events: none;
  }

  @media (width >= 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include tablet {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  @include desktop {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}
</style>
