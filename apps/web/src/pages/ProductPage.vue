<template>
  <ProductPageWidget>
    <template #reviews>
      <ReviewsSlider :seed="seed" />
    </template>
  </ProductPageWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ProductPageWidget } from '@/widgets/product-page'
import { ReviewsSlider } from '@/widgets/reviews-slider'

const route = useRoute()
const seed = computed(() => `product:${String(route.params.slug)}`)
</script>

<style scoped lang="scss">
.product-page {
  &__reviews-label {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0.75;
    padding: 1.25rem 1rem 0;
  }
}
</style>
