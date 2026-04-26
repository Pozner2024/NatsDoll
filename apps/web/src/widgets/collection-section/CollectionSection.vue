<template>
  <section class="collection-section">
    <div class="collection-section__header">
      <span class="collection-section__tag">Collection</span>
      <h2 class="collection-section__name">
        {{ collection.name }}
      </h2>
    </div>

    <div class="collection-section__grid">
      <button
        v-for="item in collection.items"
        :key="item.id"
        type="button"
        :class="`collection-section__cell collection-section__cell--${item.position}`"
        :aria-label="`Enlarge ${collection.name} image ${item.position}`"
        @click="openLightbox(item.imageUrl, item.position)"
      >
        <img
          :src="item.imageUrl"
          :alt="`${collection.name} — image ${item.position}`"
          class="collection-section__img"
        >
        <div class="collection-section__zoom-hint">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6.5" cy="6.5" r="5" stroke="white" stroke-width="1.5"/>
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="6.5" y1="4" x2="6.5" y2="9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="4" y1="6.5" x2="9" y2="6.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </button>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="selected"
      class="collection-lightbox"
      @click="closeLightbox"
    >
      <button
        type="button"
        class="collection-lightbox__close"
        aria-label="Close"
        @click.stop="closeLightbox"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="2" y1="2" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <line x1="18" y1="2" x2="2" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <img
        :src="selected.url"
        :alt="`${collection.name} — image ${selected.position}`"
        class="collection-lightbox__img"
        @click.stop
      >
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { lockScroll, unlockScroll } from '@/shared'
import type { Collection } from './collectionsApi'

defineProps<{
  collection: Collection
}>()

const selected = ref<{ url: string, position: number } | null>(null)

function openLightbox(url: string, position: number) {
  selected.value = { url, position }
}

function closeLightbox() {
  selected.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
}

watch(selected, (next, prev) => {
  if (next && !prev) {
    lockScroll()
    window.addEventListener('keydown', onKeydown)
  } else if (!next && prev) {
    unlockScroll()
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  if (selected.value) {
    unlockScroll()
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<style scoped lang="scss">
.collection-section {
  width: 100%;

  &__header {
    padding: 12px 20px;
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
    grid-template-rows: repeat(10, 1fr);
    gap: 4px;
    aspect-ratio: 3 / 10;
    grid-template-areas:
      "m1  m1  m2"
      "m1  m1  m3"
      "m4  m5  m3"
      "m4  m6  m6"
      "m7  m6  m6"
      "m8  m8  m9"
      "m8  m8  m10"
      "m11 m12 m10"
      "m11 m13 m13"
      "m14 m13 m13";
  }

  &__cell {
    overflow: hidden;
    background: var(--color-border);
    position: relative;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;

    @for $i from 1 through 14 {
      &--#{$i} { grid-area: m#{$i}; }
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    @media (hover: hover) {
      &:hover .collection-section__zoom-hint {
        opacity: 1;
      }
    }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__zoom-hint {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
}

.collection-lightbox {
  position: fixed;
  inset: 0;
  z-index: var(--z-lightbox);
  background: rgb(0 0 0 / 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  &__close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgb(255 255 255 / 0.12);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;

    &:active {
      background: rgb(255 255 255 / 0.25);
    }

    @media (hover: hover) {
      &:hover {
        background: rgb(255 255 255 / 0.25);
      }
    }
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
}
</style>
