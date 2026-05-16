<template>
  <div class="product-info">
    <div class="product-info__header">
      <h1 class="product-info__name">{{ product.name }}</h1>
      <p class="product-info__price">{{ formatPrice(product.price) }}</p>
    </div>

    <div class="product-info__action">
      <div v-if="product.stock > 0" class="product-info__qty">
        <button type="button" class="product-info__qty-btn" :disabled="qty <= 1" @click="qty--">−</button>
        <span class="product-info__qty-val">{{ qty }}</span>
        <button type="button" class="product-info__qty-btn" :disabled="qty >= product.stock" @click="qty++">+</button>
      </div>

      <AppButton
        type="button"
        class="product-info__btn"
        :disabled="product.stock === 0"
        @click="emit('add-to-cart')"
      >
        {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
      </AppButton>
    </div>

    <ul class="product-info__meta">
      <li class="product-info__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Dispatched from Poland
      </li>
      <li class="product-info__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.96"/>
        </svg>
        Returns &amp; exchanges accepted
      </li>
      <li class="product-info__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 5v3h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="1.5"/>
          <circle cx="18.5" cy="18.5" r="1.5"/>
        </svg>
        Delivery cost €12
      </li>
    </ul>

    <hr class="product-info__divider">

    <div class="product-info__desc">
      <p
        v-for="(paragraph, i) in paragraphs"
        :key="i"
        class="product-info__desc-p"
      >{{ paragraph }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, formatPrice } from '@/shared'
import type { ProductDetail } from '@/entities/product'

const props = defineProps<{ product: ProductDetail }>()
const emit = defineEmits<{ 'add-to-cart': [] }>()
const qty = ref(1)

const paragraphs = computed(() =>
  props.product.description
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean),
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-info {
  padding: 1.25rem 1rem 1.5rem;

  @include tablet {
    padding: 1rem 1.25rem 2rem;
  }

  @include desktop {
    padding: 0.5rem 1.5rem 2rem;
  }

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__name {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.25;
    color: var(--color-text);

    @include tablet {
      font-size: 1.4rem;
    }

    @include desktop {
      font-size: 1.6rem;
    }
  }

  &__price {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-accent);
    flex-shrink: 0;

    @include tablet {
      font-size: 1.5rem;
    }
  }

  &__action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__qty-btn {
    width: 38px;
    height: 42px;
    border: none;
    background: rgb(var(--btn-gradient-light) / 0.5);
    font-size: 1.1rem;
    line-height: 1;
    color: var(--color-text);
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
      background: rgb(var(--btn-gradient-mid) / 0.25);
    }

    &:disabled {
      opacity: 0.35;
    }
  }

  &__qty-val {
    font-size: var(--fs-base);
    font-weight: 600;
    min-width: 2rem;
    text-align: center;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__btn {
    --btn-font-size: var(--fs-sm);
    flex: 1;
    text-align: center;
    white-space: nowrap;
    padding: 0.6rem 0.75rem;

    @include desktop {
      --btn-font-size: var(--fs-base);
      flex: 0 1 auto;
      padding: 0.6rem 2rem;
    }

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__meta {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1.25rem;

    @include tablet {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.35rem 1.5rem;
    }
  }

  &__meta-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
    opacity: 0.85;

    svg {
      flex-shrink: 0;
      opacity: 0.55;
    }
  }

  &__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin-bottom: 1rem;
  }

  &__desc {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  &__desc-p {
    font-size: 0.88rem;
    line-height: 1.75;
    color: var(--color-text-muted);

    @include desktop {
      font-size: var(--fs-md);
    }
  }
}
</style>
