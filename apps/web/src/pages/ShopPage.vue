<template>
  <div class="shop-page">
    <ShopCatalog />
    <hr class="shop-page__divider">
    <ReviewsSlider />
  </div>
</template>

<script setup lang="ts">
import { ShopCatalog } from '@/widgets/shop-catalog'
import { ReviewsSlider } from '@/widgets/reviews-slider'
</script>

<style scoped lang="scss">
.shop-page {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__divider {
    width: calc(100% - 3rem);
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0;
  }
}
</style>
