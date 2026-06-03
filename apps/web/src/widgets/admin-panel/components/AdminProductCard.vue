<template>
  <div class="product-card">
    <div class="product-card__image-wrap">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="product-card__image"
      />
      <div
        v-else
        class="product-card__image product-card__image--placeholder"
      />
      <span
        class="product-card__badge product-card__badge--status"
        :class="product.isPublished ? 'product-card__badge--published' : 'product-card__badge--draft'"
      >
        {{ product.isPublished ? 'Published' : 'Draft' }}
      </span>
      <span
        v-if="product.stock === 0"
        class="product-card__badge product-card__badge--stock"
      >
        0 in stock
      </span>
    </div>
    <div class="product-card__body">
      <div class="product-card__name">{{ product.name }}</div>
      <div class="product-card__meta">{{ product.category }} · ${{ product.price.toFixed(2) }}</div>
      <div
        class="product-card__stock"
        :class="{ 'product-card__stock--empty': product.stock === 0 }"
      >
        {{ product.stock === 0 ? 'Out of stock' : `${product.stock} in stock` }}
      </div>
      <div class="product-card__actions">
        <RouterLink
          :to="`/admin/listings/${product.id}/edit`"
          class="product-card__edit"
        >
          Edit
        </RouterLink>
        <div
          class="product-card__menu-btn"
          @click.stop="menuOpen = !menuOpen"
        >
          ⋯
          <div
            v-if="menuOpen"
            class="product-card__menu"
          >
            <button
              class="product-card__menu-item"
              @click="emit('toggle-publish', product.id)"
            >
              {{ product.isPublished ? 'Hide' : 'Publish' }}
            </button>
            <button
              class="product-card__menu-item product-card__menu-item--danger"
              @click="handleDelete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { AdminProductItem } from '../adminListingsApi'

const props = defineProps<{ product: AdminProductItem }>()
const emit = defineEmits<{
  (e: 'toggle-publish', id: string): void
  (e: 'delete', id: string): void
}>()

const menuOpen = ref(false)

function handleDelete() {
  if (window.confirm('Вы действительно хотите удалить этот товар?')) emit('delete', props.product.id)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__image-wrap {
    position: relative;
  }

  &__image {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;

    &--placeholder {
      background: linear-gradient(135deg, #fdf0e8, #f5ddd0);
    }
  }

  &__badge {
    position: absolute;
    top: 7px;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 10px;

    &--status { left: 7px; }
    &--stock   { right: 7px; background: rgb(239 68 68 / 0.15); color: #c62828; }

    &--published { background: rgb(34 197 94 / 0.15); color: #2e7d32; }
    &--draft     { background: rgb(234 179 8 / 0.15); color: #92400e; }
  }

  &__body {
    padding: 10px;
  }

  &__name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-bottom: 2px;
  }

  &__stock {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-bottom: 10px;

    &--empty {
      color: var(--color-border);
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
  }

  &__edit {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 5px;
    padding: 4px;
    font-weight: 600;
    text-decoration: none;
  }

  &__menu-btn {
    position: relative;
    width: 30px;
    text-align: center;
    font-size: 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 4px;
    color: var(--color-text-muted);
  }

  &__menu {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: var(--color-white);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    min-width: 110px;
    box-shadow: 0 4px 12px rgb(44 24 16 / 0.1);
    z-index: 10;
    overflow: hidden;
  }

  &__menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 0.78rem;
    background: none;
    border: none;
    color: var(--color-text);

    &:hover {
      background: var(--color-bg);
    }

    &--danger {
      color: var(--color-error);
    }
  }
}
</style>
