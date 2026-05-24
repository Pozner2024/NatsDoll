<template>
  <section class="more-from-shop">
    <p class="more-from-shop__label">More from this shop</p>
    <div class="more-from-shop__scroll">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :hide-button="true"
        class="more-from-shop__card"
      >
        <template #overlay>
          <FavoriteToggle :product="product" />
        </template>
      </ProductCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ProductCard } from '@/entities/product'
import type { Product } from '@/entities/product'
import { FavoriteToggle } from '@/features/favorites-toggle'

defineProps<{ products: Product[] }>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.more-from-shop {
  padding: 1.25rem 0 1.5rem;

  &__label {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0.75;
    padding: 0 1rem;
    margin-bottom: 0.875rem;
  }

  &__scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 0 1rem;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__card {
    flex-shrink: 0;
    width: 130px;
  }
}
</style>
