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
    <AppButton
      v-if="!props.hideButton"
      type="button"
      class="product-card__btn"
      :disabled="product.stock === 0"
      @click="onAdd"
    >
      {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
    </AppButton>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { AppButton, formatPrice } from '@/shared'
import type { Product } from './types'

const props = defineProps<{ product: Product; hideButton?: boolean }>()

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
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgb(var(--btn-gradient-mid) / 0.5);
    box-shadow: 0 12px 28px -12px rgb(var(--btn-gradient-dark) / 0.25);
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
    display: block;
    margin: 0 0.75rem 0.75rem;
    text-align: center;

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}
</style>
