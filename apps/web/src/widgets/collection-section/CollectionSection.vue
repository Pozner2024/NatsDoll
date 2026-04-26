<template>
  <section class="collection-section">
    <div class="collection-section__header">
      <span class="collection-section__tag">Collection</span>
      <h2 class="collection-section__name">
        {{ collection.name }}
      </h2>
    </div>

    <div class="collection-section__grid">
      <div
        v-for="item in collection.items"
        :key="item.id"
        :class="`collection-section__cell collection-section__cell--${item.position}`"
      >
        <img
          :src="item.imageUrl"
          :alt="`${collection.name} — image ${item.position}`"
          class="collection-section__img"
        >
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Collection } from './collectionsApi'

defineProps<{
  collection: Collection
}>()
</script>

<style scoped lang="scss">
.collection-section {
  width: 100%;

  &__header {
    padding: 24px 20px 12px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__tag {
    font-family: var(--font-display);
    font-size: var(--fs-xs);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0.75;
  }

  &__name {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    line-height: 1.15;
    color: var(--color-text);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(5, 1fr);
    gap: 2px;
    aspect-ratio: 3 / 5;
    grid-template-areas:
      "p1 p1 p2"
      "p1 p1 p3"
      "p4 p5 p3"
      "p4 p6 p6"
      "p7 p6 p6";
  }

  &__cell {
    overflow: hidden;
    background: var(--color-border);

    @for $i from 1 through 7 {
      &--#{$i} { grid-area: p#{$i}; }
    }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}
</style>
