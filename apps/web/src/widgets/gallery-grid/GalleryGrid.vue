<template>
  <section
    class="gallery-grid"
    aria-label="Gallery"
  >
    <GalleryGridSkeleton v-if="isLoading" />
    <div
      v-else-if="hasError"
      class="gallery-grid__state gallery-grid__state--error"
    >
      Failed to load gallery
    </div>

    <template v-else>
      <div
        v-for="(_, i) in GALLERY_GRID_SIZE"
        :key="i + 1"
        :class="`gallery-grid__cell gallery-grid__cell--${i + 1}`"
      >
        <img
          v-if="previewCells[i]"
          :src="previewCells[i]!.imageUrl"
          :alt="`Gallery image ${i + 1}`"
          class="gallery-grid__img"
          :class="{ 'gallery-grid__img--hidden': flipped[i] }"
        >
        <img
          v-if="poolCells[i]"
          :src="poolCells[i]!.imageUrl"
          aria-hidden="true"
          class="gallery-grid__img gallery-grid__img--top"
          :class="{ 'gallery-grid__img--hidden': !flipped[i] }"
        >
      </div>

      <div class="gallery-grid__overlay">
        <p class="gallery-grid__title">
          THE GALLERY
        </p>
        <AppButton to="/gallery">
          Explore
        </AppButton>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch, onUnmounted } from 'vue'
import { AppButton } from '@/shared'
import { useGalleryGrid } from './useGalleryGrid'
import GalleryGridSkeleton from './GalleryGridSkeleton.vue'
import { GALLERY_GRID_SIZE } from './galleryApi'

const MIN_DELAY_MS = 1_500
const MAX_DELAY_MS = 8_000

function randomDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
}

const { preview, pool, isLoading, hasError } = useGalleryGrid()

const previewCells = computed(() => {
  const byPosition = new Map(preview.value.map(item => [item.position, item]))
  return Array.from({ length: GALLERY_GRID_SIZE }, (_, i) => byPosition.get(i + 1) ?? null)
})

const poolCells = computed(() => {
  const byPosition = new Map(pool.value.map(item => [item.position, item]))
  return Array.from({ length: GALLERY_GRID_SIZE }, (_, i) => byPosition.get(i + 1) ?? null)
})

const flipped = reactive<boolean[]>(Array(GALLERY_GRID_SIZE).fill(false))

// Храним только активные (pending) таймеры — по одному на ячейку
const timers: (ReturnType<typeof setTimeout> | null)[] = Array(GALLERY_GRID_SIZE).fill(null)
let timersStarted = false

function scheduleFlip(i: number) {
  timers[i] = setTimeout(() => {
    flipped[i] = !flipped[i]
    scheduleFlip(i)
  }, randomDelay())
}

// Таймеры стартуют один раз — как только в pool появятся данные,
// чтобы не было src="undefined" на первом кадре.
watch(pool, (newPool) => {
  if (timersStarted || newPool.length === 0) return
  timersStarted = true
  for (let i = 0; i < GALLERY_GRID_SIZE; i++) scheduleFlip(i)
})

onUnmounted(() => {
  timers.forEach(id => { if (id !== null) clearTimeout(id) })
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.gallery-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(15, 1fr);
  width: 100%;
  height: calc(100dvh - var(--header-height));
  gap: 2px;
  grid-template-areas:
    "p1 p1 p1 p1 p2 p2 p3 p3 p3"
    "p1 p1 p1 p1 p2 p2 p3 p3 p3"
    "p1 p1 p1 p1 p2 p2 p3 p3 p3"
    "p4 p4 p4 p5 p5 p5 p3 p3 p3"
    "p4 p4 p4 p5 p5 p5 p3 p3 p3"
    "p4 p4 p4 p5 p5 p5 p3 p3 p3"
    "p4 p4 p4 p5 p5 p5 p3 p3 p3"
    "p6 p6 p6 p5 p5 p5 p3 p3 p3"
    "p6 p6 p6 p5 p5 p5 p3 p3 p3"
    "p6 p6 p6 p5 p5 p5 p7 p7 p7"
    "p6 p6 p6 p5 p5 p5 p7 p7 p7"
    "p6 p6 p6 p5 p5 p5 p7 p7 p7"
    "p6 p6 p6 p8 p8 p9 p9 p9 p9"
    "p6 p6 p6 p8 p8 p9 p9 p9 p9"
    "p6 p6 p6 p8 p8 p9 p9 p9 p9";

  &__state {
    grid-column: 1 / -1;
    grid-row: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-brand);
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 1;
    transition: opacity 450ms linear;

    &--top {
      z-index: var(--z-gallery-img-top);
    }

    &--hidden {
      opacity: 0;
    }
  }

  &__overlay {
    position: absolute;
    top: calc(100% / 15 * 3 - 1rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-gallery-grid-button);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    @include tablet {
      top: calc(100% / 11 * 3 + 1rem);
      left: calc(100% / 8 * 2 + 1rem);
      transform: none;
      align-items: flex-start;
      --color-text: var(--color-white);
    }
  }

  &__title {
    font-family: var(--font-brand);
    font-weight: 700;
    font-size: clamp(2rem, 4vw, 3.5rem);
    color: var(--color-text);
    text-align: center;
    margin-top: 1.5rem;
    line-height: 0.9;

    @include tablet {
      margin-top: 0;
      line-height: 1.1;
      color: var(--color-white);
      text-align: left;
    }
  }
  @include tablet {
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(11, 1fr);
    grid-template-areas:
      "p2 p2 p4 p4 p1 p1 p3 p3"
      "p2 p2 p4 p4 p1 p1 p3 p3"
      "p2 p2 p4 p4 p1 p1 p3 p3"
      "p2 p2 p9 p9 p9 p9 p3 p3"
      "p2 p2 p9 p9 p9 p9 p3 p3"
      "p5 p5 p9 p9 p9 p9 p7 p7"
      "p5 p5 p9 p9 p9 p9 p7 p7"
      "p5 p5 p9 p9 p9 p9 p7 p7"
      "p5 p5 p6 p6 p8 p8 p7 p7"
      "p5 p5 p6 p6 p8 p8 p7 p7"
      "p5 p5 p6 p6 p8 p8 p7 p7";
  }

  @for $i from 1 through 9 {
    &__cell--#{$i} {
      grid-area: p#{$i};
      background: var(--color-border);
      overflow: hidden;
      position: relative;
    }
  }
}
</style>
