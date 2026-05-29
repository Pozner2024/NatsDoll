<template>
  <div
    v-if="isLoading"
    class="product-page-widget__skeleton"
  />

  <div
    v-else-if="hasError"
    class="product-page-widget__error"
  >
    <p>Failed to load product. Please try again.</p>
  </div>

  <div
    v-else-if="product"
    class="product-page-widget"
  >
    <nav
      class="product-page-widget__breadcrumbs"
      aria-label="Breadcrumb"
    >
      <RouterLink
        class="product-page-widget__breadcrumb-link"
        to="/shop"
      >
        The Shop
      </RouterLink>
      <span
        class="product-page-widget__breadcrumb-sep"
        aria-hidden="true"
      >/</span>
      <RouterLink
        class="product-page-widget__breadcrumb-link"
        :to="`/shop/${product.categorySlug}`"
      >
        {{ product.category }}
      </RouterLink>
    </nav>
    <div class="product-page-widget__main">
      <ProductGallery
        :images="product.images"
        :name="product.name"
        :stock="product.stock"
        :product="productForFavorite"
      />
      <ProductInfo
        ref="productInfoRef"
        :product="product"
        @add-to-cart="onAddToCart"
      />
    </div>
    <div class="product-page-widget__reviews">
      <slot name="reviews" />
    </div>
    <MoreFromShop
      v-if="!moreLoading && moreProducts.length > 0"
      :products="moreProducts"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { fetchProduct, fetchProducts } from '@/entities/product'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import { useAuthModal } from '@/features/auth-modal'
import ProductGallery from './components/ProductGallery.vue'
import ProductInfo from './components/ProductInfo.vue'
import MoreFromShop from './components/MoreFromShop.vue'
import type { ProductDetail, Product } from '@/entities/product'

const MORE_FROM_SHOP_FETCH_LIMIT = 8
const MORE_FROM_SHOP_DISPLAY_LIMIT = 6

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const product = ref<ProductDetail | null>(null)
const isLoading = ref(true)
const hasError = ref(false)

const moreProducts = ref<Product[]>([])
const moreLoading = ref(false)

const productForFavorite = computed<Product | undefined>(() => {
  const p = product.value
  if (!p) return undefined
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.images[0] ?? null,
    stock: p.stock,
  }
})

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()
const authModal = useAuthModal()
const productInfoRef = ref<{ resetAdding: () => void } | null>(null)

let currentController: AbortController | null = null

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

watch(
  slug,
  async (newSlug) => {
    currentController?.abort()
    const controller = new AbortController()
    currentController = controller
    const { signal } = controller

    isLoading.value = true
    hasError.value = false
    product.value = null
    moreLoading.value = true

    let loaded: ProductDetail | null
    try {
      loaded = await fetchProduct(newSlug, signal)
    } catch (err) {
      if (signal.aborted || isAbortError(err)) return
      hasError.value = true
      isLoading.value = false
      moreLoading.value = false
      return
    }

    if (signal.aborted) return
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
        limit: MORE_FROM_SHOP_FETCH_LIMIT,
      }, signal)
      if (signal.aborted) return
      moreProducts.value = res.items
        .filter((p) => p.slug !== newSlug)
        .slice(0, MORE_FROM_SHOP_DISPLAY_LIMIT)
    } catch (err) {
      if (signal.aborted || isAbortError(err)) return
      moreProducts.value = []
    } finally {
      if (!signal.aborted) moreLoading.value = false
    }
  },
  { immediate: true },
)

onScopeDispose(() => currentController?.abort())

async function onAddToCart(payload: { quantity: number; message: string | null }): Promise<void> {
  try {
    if (!authStore.isLoggedIn) {
      authModal.open()
      productInfoRef.value?.resetAdding()
      return
    }
    if (!product.value) return
    await cartStore.add({
      productId: product.value.id,
      quantity: payload.quantity,
      message: payload.message,
    })
    await router.push({ name: 'cart' })
  } catch (e) {
    console.error('Failed to add to cart', e)
  } finally {
    productInfoRef.value?.resetAdding()
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-page-widget {
  padding: 1rem 1rem 4rem;

  @include phablet {
    padding: 1.5rem 2rem 4rem;
  }

  @include tablet {
    padding: 1.5rem 2rem 4rem;
  }

  @include desktop {
    padding: 1.5rem 2rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  &__breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  &__breadcrumb-link {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    text-decoration: none;
    letter-spacing: 0.05em;

    &:hover {
      color: var(--color-accent-hover);
    }
  }

  &__breadcrumb-sep {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: 0.5;
  }

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

  &__main {
    @include desktop {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
    }
  }

  &__reviews {
    margin: 0 -1rem;

    @include phablet {
      margin: 0 -2rem;
    }

    @include tablet {
      margin: 0 -2rem;
    }

    @include desktop {
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
    }
  }
}
</style>
