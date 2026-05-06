<template>
  <div class="product-gallery">
    <!-- Mobile: slider -->
    <div class="product-gallery__slider">
      <div class="product-gallery__track">
        <img
          v-for="(img, i) in images"
          :key="i"
          class="product-gallery__slide"
          :class="{ 'product-gallery__slide--active': i === currentIndex }"
          :src="img"
          :alt="`${name} ${i + 1}`"
        >
      </div>
      <span v-if="stock === 0" class="product-gallery__badge">Sold out</span>
      <div class="product-gallery__dots">
        <button
          v-for="(_, i) in images"
          :key="i"
          type="button"
          class="product-gallery__dot"
          :class="{ 'product-gallery__dot--active': i === currentIndex }"
          :aria-label="`Фото ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
    </div>

    <!-- Tablet+: thumbnails + main photo -->
    <div class="product-gallery__desktop">
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
      <div class="product-gallery__main">
        <img
          class="product-gallery__main-img"
          :src="activeImage"
          :alt="name"
        >
        <span v-if="stock === 0" class="product-gallery__badge">Sold out</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSlider } from '@/shared'

const props = defineProps<{
  images: string[]
  name: string
  stock?: number
}>()

const imageCount = computed(() => props.images.length)
const { currentIndex, goTo } = useSlider(imageCount, 0)

const activeIndex = ref(0)
const activeImage = computed(() => props.images[activeIndex.value] ?? '')
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-gallery {
  &__slider {
    position: relative;

    @include tablet {
      display: none;
    }
  }

  &__track {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: rgb(var(--btn-gradient-light) / 0.4);
    overflow: hidden;
  }

  &__slide {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s ease;

    &--active {
      opacity: 1;
    }
  }

  &__dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 8px 0;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: none;
    background: rgb(var(--btn-gradient-dark) / 0.25);
    padding: 0;
    transition: background-color 0.2s ease;

    &--active {
      background: var(--color-accent);
    }
  }

  &__desktop {
    display: none;

    @include tablet {
      display: flex;
      gap: 8px;
    }
  }

  &__thumbs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  &__thumb {
    width: 96px;
    height: 96px;
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

  &__main {
    position: relative;
    flex: 1;
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
}
</style>
