<template>
  <li class="cart-line">
    <RouterLink :to="`/product/${item.productSlug}`" class="cart-line__link">
      <img
        v-if="item.productImage"
        :src="item.productImage"
        :alt="item.productName"
        class="cart-line__image"
      >
    </RouterLink>

    <div class="cart-line__body">
      <RouterLink :to="`/product/${item.productSlug}`" class="cart-line__name">
        {{ item.productName }}
      </RouterLink>

      <p v-if="item.message" class="cart-line__message">
        <span class="cart-line__message-label">Message:</span>
        <span class="cart-line__message-text">{{ item.message }}</span>
      </p>

      <div class="cart-line__row">
        <div class="cart-line__qty">
          <button
            type="button"
            class="cart-line__qty-btn"
            :disabled="item.quantity <= 1"
            @click="onDecrement"
          >−</button>
          <span class="cart-line__qty-val">{{ item.quantity }}</span>
          <button
            type="button"
            class="cart-line__qty-btn"
            @click="onIncrement"
          >+</button>
        </div>

        <p class="cart-line__subtotal">{{ formatPrice(item.subtotal) }}</p>
      </div>

      <button
        type="button"
        class="cart-line__remove"
        @click="onRemoveClick"
      >Remove</button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import type { CartItem } from '@/entities/cart'

const props = defineProps<{ item: CartItem }>()
const emit = defineEmits<{
  update: [itemId: string, quantity: number]
  remove: [itemId: string]
}>()

function onIncrement(): void {
  emit('update', props.item.id, props.item.quantity + 1)
}

function onDecrement(): void {
  if (props.item.quantity > 1) emit('update', props.item.id, props.item.quantity - 1)
}

function onRemoveClick(): void {
  emit('remove', props.item.id)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.cart-line {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;

  &__link {
    flex-shrink: 0;
  }

  &__image {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;

    @include tablet {
      width: 96px;
      height: 96px;
    }
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }

  &__name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;
    line-height: 1.3;

    &:hover {
      color: var(--color-accent-hover);
    }
  }

  &__message {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  &__message-label {
    font-weight: 600;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.25rem;
  }

  &__qty {
    display: inline-flex;
    align-items: center;
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  &__qty-btn {
    width: 28px;
    height: 30px;
    background: rgb(var(--btn-gradient-light) / 0.5);
    border: none;
    font-size: 1rem;
    color: var(--color-text);

    &:disabled {
      opacity: 0.35;
    }
  }

  &__qty-val {
    min-width: 2rem;
    text-align: center;
    font-weight: 600;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    line-height: 30px;
  }

  &__subtotal {
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  &__remove {
    align-self: flex-start;
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    text-decoration: underline;
    padding: 0;

    &:hover {
      color: rgb(180 30 30 / 1);
    }
  }
}
</style>
