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
    <MoreFromShop v-if="!moreLoading && moreProducts.length > 0" :products="moreProducts" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProduct, fetchProducts } from '@/entities/product'
import ProductGallery from './components/ProductGallery.vue'
import ProductInfo from './components/ProductInfo.vue'
import MoreFromShop from './components/MoreFromShop.vue'
import type { ProductDetail, Product } from '@/entities/product'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const product = ref<ProductDetail | null>(null)
const isLoading = ref(true)
const hasError = ref(false)

const moreProducts = ref<Product[]>([])
const moreLoading = ref(false)

let requestId = 0

watch(
  slug,
  async (newSlug) => {
    const myId = ++requestId

    isLoading.value = true
    hasError.value = false
    product.value = null
    moreLoading.value = true

    let loaded: ProductDetail | null
    try {
      loaded = await fetchProduct(newSlug)
    } catch {
      if (myId !== requestId) return
      hasError.value = true
      isLoading.value = false
      moreLoading.value = false
      return
    }

    if (myId !== requestId) return
    if (!loaded) {
      hasError.value = true
      isLoading.value = false
      moreLoading.value = false
      return
    }
    product.value = loaded
    isLoading.value = false

    try {
      const res = await fetchProducts({
        category: loaded.categorySlug,
        sort: 'newest',
        page: 1,
        limit: 8,
      })
      if (myId !== requestId) return
      moreProducts.value = res.items.filter((p) => p.slug !== newSlug).slice(0, 6)
    } catch {
      moreProducts.value = []
    } finally {
      if (myId === requestId) moreLoading.value = false
    }
  },
  { immediate: true },
)

function onAddToCart() {
  console.log('add to cart', product.value?.id)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

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

  @include tablet {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;

    :deep(.reviews-slider),
    :deep(.more-from-shop) {
      grid-column: 1 / -1;
    }
  }

  @include desktop {
    grid-template-columns: 2fr 3fr;
    max-width: 1100px;
    margin: 0 auto;
  }
}
</style>
