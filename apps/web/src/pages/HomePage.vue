<template>
  <div class="home-page">
    <HeroSlider />
    <GalleryGrid />
    <ArtistSection />
    <hr class="home-page__divider">
    <ReviewsSlider />
    <hr class="home-page__divider">
    <FaqSection />
  </div>
</template>

<script setup lang="ts">
import { HeroSlider } from '@/widgets/hero-slider'
import { GalleryGrid } from '@/widgets/gallery-grid'
import { ArtistSection } from '@/widgets/artist-section'
import { ReviewsSlider } from '@/widgets/reviews-slider'
import { FaqSection } from '@/widgets/faq-section'
</script>

<style scoped lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__divider {
    width: calc(100% - 3rem);
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0;
  }
}
</style>
