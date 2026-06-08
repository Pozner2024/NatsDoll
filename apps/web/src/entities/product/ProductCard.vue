<template>
  <article class="product-card">
    <div class="product-card__image-wrap">
      <RouterLink
        :to="`/product/${product.slug}`"
        class="product-card__image-link"
      >
        <div
          class="product-card__image"
          :class="{ 'product-card__image--dimmed': product.stock === 0 }"
        >
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="product-card__img"
            loading="lazy"
            decoding="async"
          >
          <div
            v-else
            class="product-card__placeholder"
            aria-hidden="true"
          />
          <span
            v-if="product.stock === 0"
            class="product-card__badge"
          >Sold out</span>
          <span
            v-if="product.salePrice && product.stock > 0"
            class="product-card__badge product-card__badge--sale"
          >SALE</span>
        </div>
        <div
          class="product-card__corner product-card__corner--tl"
          aria-hidden="true"
        />
        <div
          class="product-card__corner product-card__corner--bl"
          aria-hidden="true"
        />
        <div
          class="product-card__corner product-card__corner--br"
          aria-hidden="true"
        />
      </RouterLink>
      <div
        v-if="$slots.overlay"
        class="product-card__overlay"
      >
        <slot name="overlay" />
      </div>
    </div>

    <div class="product-card__body">
      <div class="product-card__top-row">
        <RouterLink
          :to="`/product/${product.slug}`"
          class="product-card__name-link"
        >
          <h3 class="product-card__name">
            {{ product.name }}
          </h3>
        </RouterLink>
        <div class="product-card__price-group">
          <span
            v-if="product.salePrice"
            class="product-card__price-original"
          >{{ formatPrice(product.price) }}</span>
          <span class="product-card__price">{{ formatPrice(product.salePrice ?? product.price) }}</span>
        </div>
      </div>

      <hr class="product-card__divider">

      <AppButton
        v-if="!props.hideButton"
        type="button"
        class="product-card__btn"
        :disabled="product.stock === 0"
        @click="onAdd"
      >
        {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
      </AppButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { AppButton, formatPrice } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import { useAuthModal } from '@/shared'
import type { Product } from './types'

const props = defineProps<{ product: Product; hideButton?: boolean }>()

const cartStore = useCartStore()
const authStore = useAuthStore()
const authModal = useAuthModal()
const router = useRouter()

async function onAdd() {
  if (!authStore.isLoggedIn) {
    authModal.open()
    return
  }
  try {
    await cartStore.add({ productId: props.product.id, quantity: 1, message: null })
    await router.push({ name: 'cart' })
  } catch {
    await router.push(`/product/${props.product.slug}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-card {
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &__image-wrap {
    position: relative;
    border-radius: 2px;
    overflow: hidden;
  }

  &__image-link {
    display: block;
  }

  &__overlay {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: var(--z-card-overlay);
  }

  &__image {
    aspect-ratio: 3 / 2;
    background: rgb(var(--btn-gradient-light) / 1);

    &--dimmed {
      opacity: 0.55;
    }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      rgb(var(--btn-gradient-light) / 1),
      rgb(var(--btn-gradient-mid) / 0.55),
      rgb(var(--btn-gradient-dark) / 0.15)
    );
  }

  &__badge {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(4px);
    color: var(--color-white);
    font-size: var(--fs-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 0.3rem 0.6rem;
    border-radius: 2px;

    &--sale {
      background: var(--color-accent);
      backdrop-filter: none;
    }
  }

  &__corner {
    position: absolute;
    width: 14px;
    height: 14px;
    border-color: var(--color-accent);
    border-style: solid;
    opacity: 0.45;
    pointer-events: none;

    &--tl { top: 8px; left: 8px; border-width: 1px 0 0 1px; }
    &--bl { bottom: 8px; left: 8px; border-width: 0 0 1px 1px; }
    &--br { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; }
  }

  &__body {
    padding: 0.85rem 0.25rem 0;
    display: flex;
    flex-direction: column;
    flex: 1;

    @include phablet {
      padding: 0.75rem 0.1rem 0;
    }
  }

  &__top-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }

  &__name-link {
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    @include phablet {
      font-size: var(--fs-md);
      -webkit-line-clamp: 1;
    }
  }

  &__price-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  &__price-original {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    text-decoration: line-through;
    line-height: 1.2;
  }

  &__price {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--color-accent);
    white-space: nowrap;
  }

  &__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin-bottom: 0.55rem;
  }

  &__btn {
    --btn-font-size: var(--fs-xs);
    display: block;
    width: 100%;
    text-align: center;
    margin-top: auto;
    padding: 0.4rem 0.5rem;
    white-space: nowrap;

    @include tablet {
      --btn-font-size: var(--fs-sm);
      padding: 0.6rem 1rem;
    }

    @include desktop {
      padding: 0.6rem 2rem;
    }

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}
</style>
