<template>
  <div class="home-page">
    <HeroSlider />
    <GalleryGrid />
  </div>
</template>

<script setup lang="ts">
import { HeroSlider } from '@/widgets/hero-slider'
import { GalleryGrid } from '@/widgets/gallery-grid'
</script>

<style scoped lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
