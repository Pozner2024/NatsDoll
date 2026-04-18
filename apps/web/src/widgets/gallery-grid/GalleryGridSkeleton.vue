<template>
  <div class="gallery-skeleton" aria-hidden="true">
    <div
      v-for="i in GALLERY_GRID_SIZE"
      :key="i"
      :class="`gallery-skeleton__cell gallery-skeleton__cell--${i}`"
    />
  </div>
</template>

<script setup lang="ts">
import { GALLERY_GRID_SIZE } from './galleryApi'
</script>

<style scoped lang="scss">
.gallery-skeleton {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(15, 1fr);
  width: 100%;
  height: calc(100dvh - var(--header-height));
  gap: 2px;
  grid-template-areas:
    "p1 p1 p1 p2 p2 p2 p3 p3 p3"
    "p1 p1 p1 p2 p2 p2 p3 p3 p3"
    "p1 p1 p1 p2 p2 p2 p3 p3 p3"
    "p4 p4 p5 p5 p5 p5 p3 p3 p3"
    "p4 p4 p5 p5 p5 p5 p3 p3 p3"
    "p4 p4 p5 p5 p5 p5 p3 p3 p3"
    "p4 p4 p5 p5 p5 p5 p3 p3 p3"
    "p6 p6 p5 p5 p5 p5 p3 p3 p3"
    "p6 p6 p5 p5 p5 p5 p3 p3 p3"
    "p6 p6 p5 p5 p5 p5 p7 p7 p7"
    "p6 p6 p5 p5 p5 p5 p7 p7 p7"
    "p6 p6 p5 p5 p5 p5 p7 p7 p7"
    "p6 p6 p8 p8 p9 p9 p9 p9 p9"
    "p6 p6 p8 p8 p9 p9 p9 p9 p9"
    "p6 p6 p8 p8 p9 p9 p9 p9 p9";

  @for $i from 1 through 9 {
    &__cell--#{$i} {
      grid-area: p#{$i};
    }
  }

  &__cell {
    background: linear-gradient(
      90deg,
      var(--color-border) 25%,
      rgb(from var(--color-border) r g b / 0.5) 50%,
      var(--color-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
