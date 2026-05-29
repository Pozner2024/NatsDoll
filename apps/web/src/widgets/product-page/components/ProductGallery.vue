<template>
  <div class="product-gallery">
    <!-- Mobile: slider -->
    <div class="product-gallery__slider">
      <div
        class="product-gallery__track"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <img
          v-for="(img, i) in images"
          :key="i"
          class="product-gallery__slide"
          :class="{ 'product-gallery__slide--active': i === currentIndex }"
          :src="img"
          :alt="`${name} ${i + 1}`"
        >
        <template v-if="images.length > 1">
          <button
            type="button"
            class="product-gallery__arrow product-gallery__arrow--prev"
            aria-label="Предыдущее фото"
            @click="prev"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="product-gallery__arrow product-gallery__arrow--next"
            aria-label="Следующее фото"
            @click="next"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </template>
        <FavoriteToggle
          v-if="product"
          :product="product"
          class="product-gallery__favorite"
        />
      </div>
      <span
        v-if="stock === 0"
        class="product-gallery__badge"
      >Sold out</span>
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
          <img
            :src="img"
            :alt="`${name} ${i + 1}`"
            class="product-gallery__thumb-img"
          >
        </button>
      </div>
      <div class="product-gallery__main">
        <img
          class="product-gallery__main-img"
          :src="activeImage"
          :alt="name"
        >
        <template v-if="images.length > 1">
          <button
            type="button"
            class="product-gallery__arrow product-gallery__arrow--prev"
            aria-label="Предыдущее фото"
            @click="activeIndex = (activeIndex - 1 + images.length) % images.length"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="product-gallery__arrow product-gallery__arrow--next"
            aria-label="Следующее фото"
            @click="activeIndex = (activeIndex + 1) % images.length"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </template>
        <FavoriteToggle
          v-if="product"
          :product="product"
          class="product-gallery__favorite"
        />
        <span
          v-if="stock === 0"
          class="product-gallery__badge"
        >Sold out</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSlider } from '@/shared'
import { FavoriteToggle } from '@/features/favorites-toggle'
import type { Product } from '@/entities/product'

const props = defineProps<{
  images: string[]
  name: string
  stock?: number
  product?: Product
}>()

const SWIPE_THRESHOLD_PX = 40

const imageCount = computed(() => props.images.length)
const { currentIndex, goTo, next, prev } = useSlider(imageCount, 0)

const touchStartX = ref(0)

function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.changedTouches[0].clientX
}

function onTouchEnd(e: TouchEvent) {
  const delta = touchStartX.value - e.changedTouches[0].clientX
  if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
  if (delta > 0) next()
  else prev()
}

const activeIndex = ref(0)
const activeImage = computed(() => props.images[activeIndex.value] ?? '')
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-gallery {
  max-width: 640px;
  margin: 0 auto;

  @include tablet {
    max-width: 774px;
    margin: 0 auto;
  }

  @include desktop {
    max-width: 774px;
    margin: 0;
    position: sticky;
    top: calc(var(--header-height) + 1.5rem);
    align-self: start;
  }

  &__slider {
    position: relative;

    @include tablet {
      display: none;
    }
  }

  &__track {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 2;
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
      flex-direction: column;
      gap: 8px;
    }
  }

  &__thumbs {
    display: flex;
    flex-direction: row;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__thumb {
    width: 72px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 3px;
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
    aspect-ratio: 3 / 2;
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

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgb(255 255 255 / 0.75);
    backdrop-filter: blur(4px);
    color: var(--color-text);
    transition: background-color 0.15s ease;

    &--prev { left: 0.6rem; }
    &--next { right: 0.6rem; }

    &:hover {
      background: rgb(255 255 255 / 0.95);
    }
  }

  &__favorite {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    z-index: 2;
  }
}
</style>
