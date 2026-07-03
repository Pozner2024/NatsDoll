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
      v-if="moreProducts.length > 0"
      :products="moreProducts"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAsyncData, createError, useSeoMeta, useHead, useRuntimeConfig } from 'nuxt/app'
import { fetchProduct, fetchProducts } from '@/entities/product'
import { useCartStore } from '@/entities/cart'
import { useCartPrompt, metaDescription, productSeoTitle, DEFAULT_OG_IMAGE } from '@/shared'
import ProductGallery from './components/ProductGallery.vue'
import ProductInfo from './components/ProductInfo.vue'
import MoreFromShop from './components/MoreFromShop.vue'
import type { ProductDetail, Product } from '@/entities/product'

const MORE_FROM_SHOP_FETCH_LIMIT = 8
const MORE_FROM_SHOP_DISPLAY_LIMIT = 6

type ProductPageData = { product: ProductDetail | null; more: Product[] }

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data, status, error } = await useAsyncData<ProductPageData>(
  computed(() => `product:${slug.value}`),
  async () => {
    const product = await fetchProduct(slug.value)
    if (!product) return { product: null, more: [] }
    let more: Product[] = []
    try {
      const res = await fetchProducts({
        category: product.categorySlug,
        sort: 'newest',
        page: 1,
        limit: MORE_FROM_SHOP_FETCH_LIMIT,
      })
      more = res.items
        .filter((p) => p.slug !== product.slug)
        .slice(0, MORE_FROM_SHOP_DISPLAY_LIMIT)
    } catch {
      more = []
    }
    return { product, more }
  },
)

if (!error.value && data.value?.product === null) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value?.product ?? null)
const moreProducts = computed(() => data.value?.more ?? [])
const isLoading = computed(() => status.value === 'pending')
const hasError = computed(
  () => status.value === 'error' || (status.value === 'success' && !data.value?.product),
)

const siteUrl = useRuntimeConfig().public.siteUrl
const canonicalUrl = computed(() => `${siteUrl}/product/${slug.value}`)
const seoDescription = computed(() =>
  product.value ? metaDescription(product.value.description) : '',
)
const seoTitle = computed(() =>
  product.value ? productSeoTitle(product.value.name) : 'NatsDoll',
)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: computed(() => product.value?.images[0] ?? DEFAULT_OG_IMAGE),
  ogUrl: canonicalUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: product.value
    ? [
        {
          type: 'application/ld+json',
          textContent: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.value.name,
            description: seoDescription.value,
            image: product.value.images,
            offers: {
              '@type': 'Offer',
              price: (product.value.salePrice ?? product.value.price).toFixed(2),
              priceCurrency: 'USD',
              availability:
                product.value.stock > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              url: canonicalUrl.value,
            },
          }),
        },
      ]
    : [],
}))

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

const cartStore = useCartStore()
const cartPrompt = useCartPrompt()
const productInfoRef = ref<{ resetAdding: () => void } | null>(null)

async function onAddToCart(payload: { quantity: number; message: string | null }): Promise<void> {
  try {
    if (!product.value) return
    await cartStore.add({
      productId: product.value.id,
      quantity: payload.quantity,
      message: payload.message,
      productSlug: product.value.slug,
      productName: product.value.name,
      productImage: product.value.images[0] ?? null,
      productPrice: product.value.salePrice ?? product.value.price,
    })
    cartPrompt.open()
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
