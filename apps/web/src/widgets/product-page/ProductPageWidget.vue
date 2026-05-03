<template>
  <div v-if="isLoading" class="product-page-widget__skeleton" />

  <div v-else-if="hasError" class="product-page-widget__error">
    <p>Failed to load product. Please try again.</p>
  </div>

  <div v-else-if="product" class="product-page-widget">
    <ProductGallery
      :images="product.images"
      :name="product.name"
      :stock="product.stock"
    />
    <ProductInfo
      :product="product"
      @add-to-cart="onAddToCart"
    />
    <slot name="reviews" />
    <MoreFromShop :products="moreProducts" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData } from '@/shared'
import { fetchProduct, fetchProducts } from '@/entities/product'
import ProductGallery from './components/ProductGallery.vue'
import ProductInfo from './components/ProductInfo.vue'
import MoreFromShop from './components/MoreFromShop.vue'
import type { ProductDetail, Product } from '@/entities/product'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: product, isLoading, hasError } = useAsyncData<ProductDetail | null>(
  () => fetchProduct(slug.value),
  null,
)

const { data: moreProducts } = useAsyncData<Product[]>(
  async () => {
    const res = await fetchProducts({ sort: 'newest', page: 1, limit: 8 })
    return res.items.filter((p) => p.slug !== slug.value).slice(0, 6)
  },
  [],
)

function onAddToCart() {
  console.log('add to cart', product.value?.id)
}
</script>

<style scoped lang="scss">
.product-page-widget {
  &__skeleton {
    width: 100%;
    aspect-ratio: 1;
    background: linear-gradient(
      135deg,
      rgb(var(--btn-gradient-light) / 1),
      rgb(var(--btn-gradient-mid) / 0.4)
    );
  }

  &__error {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }
}
</style>
