<template>
  <div class="product-gallery">
    <div class="product-gallery__main">
      <img
        class="product-gallery__main-img"
        :src="activeImage"
        :alt="name"
      >
      <span
        v-if="stock === 0"
        class="product-gallery__badge"
      >Sold out</span>
    </div>
    <div class="product-gallery__thumbs">
      <button
        v-for="(img, i) in images"
        :key="i"
        type="button"
        class="product-gallery__thumb"
        :class="{ 'product-gallery__thumb--active': i === activeIndex }"
        @click="activeIndex = i"
      >
        <img :src="img" :alt="`${name} ${i + 1}`" class="product-gallery__thumb-img">
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  images: string[]
  name: string
  stock?: number
}>()

const activeIndex = ref(0)
const activeImage = computed(() => props.images[activeIndex.value] ?? '')
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-gallery {
  &__main {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: rgb(var(--btn-gradient-light) / 0.4);
    overflow: hidden;
  }

  &__main-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
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

  &__thumbs {
    display: flex;
    gap: 6px;
    padding: 8px 0;
  }

  &__thumb {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    border: 1.5px solid transparent;
    background: none;
    padding: 0;
    transition: border-color 0.15s ease;

    &--active {
      border-color: var(--color-accent);
    }
  }

  &__thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}
</style>
