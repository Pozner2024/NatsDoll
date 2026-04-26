<template>
  <div
    class="collection-skeleton"
    aria-hidden="true"
  >
    <div class="collection-skeleton__label" />
    <div class="collection-skeleton__title" />
    <div class="collection-skeleton__grid">
      <div
        v-for="i in COLLECTION_SIZE"
        :key="i"
        class="collection-skeleton__cell"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { COLLECTION_SIZE } from './collectionsApi'
</script>

<style scoped lang="scss">
.collection-skeleton {
  width: 100%;

  &__label {
    width: 80px;
    height: 12px;
    border-radius: 4px;
    margin: 24px 20px 8px;
    background: linear-gradient(
      90deg,
      var(--color-border) 25%,
      rgb(from var(--color-border) r g b / 0.5) 50%,
      var(--color-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__title {
    width: 160px;
    height: 28px;
    border-radius: 4px;
    margin: 0 20px 12px;
    background: linear-gradient(
      90deg,
      var(--color-border) 25%,
      rgb(from var(--color-border) r g b / 0.5) 50%,
      var(--color-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }

  &__cell {
    aspect-ratio: 1;
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
