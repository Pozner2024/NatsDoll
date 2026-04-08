<template>
  <div class="gallery-grid">
    <div
      v-for="item in items"
      :key="item.id"
      :class="`gallery-grid__cell gallery-grid__cell--${item.position}`"
    >
      <img :src="item.imageUrl" :alt="`Gallery image ${item.position}`" class="gallery-grid__img" />
    </div>

    <div class="gallery-grid__overlay">
      <AppButton to="/gallery">The Gallery</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { AppButton } from '@/shared'

const GalleryItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  position: z.number().int().min(1).max(9),
})

const GalleryHomeSchema = z.object({
  preview: z.array(GalleryItemSchema),
})

type GalleryItem = z.infer<typeof GalleryItemSchema>

const items = ref<GalleryItem[]>([])
const isLoading = ref(false)
const hasError = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    const res = await fetch('/api/gallery/home')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: unknown = await res.json()
    items.value = GalleryHomeSchema.parse(data).preview
  } catch (err) {
    console.error('Failed to load gallery', err)
    hasError.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped lang="scss">
.gallery-grid {
  position: relative;
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

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__overlay {
    position: absolute;
    top: calc(100% / 15 * 3 + 2rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-gallery-cta);
  }

  @for $i from 1 through 9 {
    &__cell--#{$i} {
      grid-area: p#{$i};
      background: var(--color-border);
      overflow: hidden;
    }
  }
}
</style>
