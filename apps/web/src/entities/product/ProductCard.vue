<template>
  <article class="product-card">
    <RouterLink
      :to="`/product/${product.slug}`"
      class="product-card__link"
    >
      <div class="product-card__image">
        <img
          v-if="product.image"
          :src="product.image"
          :alt="product.name"
          class="product-card__img"
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
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">{{ product.name }}</h3>
        <p class="product-card__price">{{ formatPrice(product.price) }}</p>
      </div>
    </RouterLink>
    <button
      type="button"
      class="product-card__btn"
      :disabled="product.stock === 0"
      @click="onAdd"
    >
      {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import type { Product } from './types'

const props = defineProps<{ product: Product }>()

function onAdd() {
  console.log('add to cart', props.product.id)
}
</script>

<style scoped lang="scss">
.product-card {
  display: flex;
  flex-direction: column;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &__link {
    color: inherit;
    text-decoration: none;
  }

  &__image {
    position: relative;
    aspect-ratio: 1;
    background: rgb(var(--btn-gradient-light) / 0.4);
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
      rgb(var(--btn-gradient-mid) / 0.4)
    );
  }

  &__badge {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    background: rgb(0 0 0 / 0.7);
    color: var(--color-white);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  &__body {
    padding: 0.75rem 0.75rem 0.5rem;
  }

  &__name {
    font-size: var(--fs-md);
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  &__price {
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--color-accent);
  }

  &__btn {
    margin: 0 0.75rem 0.75rem;
    padding: 0.6rem 1rem;
    background: var(--color-accent);
    color: var(--color-white);
    border: none;
    border-radius: 4px;
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
      background: var(--color-text-muted);
    }

    &:disabled {
      background: var(--color-border);
      color: var(--color-text-muted);
    }
  }
}
</style>
