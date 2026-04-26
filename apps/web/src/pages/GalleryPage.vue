<template>
  <div class="gallery-page">
    <div class="gallery-page__header">
      <h1 class="gallery-page__title">
        THE GALLERY
      </h1>
    </div>

    <template v-if="isLoading">
      <CollectionSectionSkeleton
        v-for="i in 3"
        :key="i"
      />
    </template>

    <div
      v-else-if="hasError"
      class="gallery-page__error"
    >
      Failed to load collections
    </div>

    <template v-else>
      <CollectionSection
        v-for="collection in collections"
        :key="collection.id"
        :collection="collection"
      />
    </template>

    <ArtistSection />
    <hr class="gallery-page__divider">
    <FaqSection />
  </div>
</template>

<script setup lang="ts">
import { CollectionSection, CollectionSectionSkeleton, useCollectionSection } from '@/widgets/collection-section'
import { ArtistSection } from '@/widgets/artist-section'
import { FaqSection } from '@/widgets/faq-section'

const { collections, isLoading, hasError } = useCollectionSection()
</script>

<style scoped lang="scss">
.gallery-page {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__header {
    width: 100%;
    padding: 28px 20px 0;
  }

  &__title {
    font-family: var(--font-brand);
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 700;
    line-height: 0.9;
    color: var(--color-text);
    text-align: right;
  }

  &__error {
    padding: 2rem 1.5rem;
    font-family: var(--font-brand);
    color: var(--color-error);
  }

  &__divider {
    width: calc(100% - 3rem);
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0;
  }
}
</style>
