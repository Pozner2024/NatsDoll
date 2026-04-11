<template>
  <section class="reviews-slider">
    <h2 class="reviews-slider__title">The Reviews</h2>

    <div
      class="reviews-slider__viewport"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="reviews-slider__track" :style="trackStyle">
        <div
          v-for="review in REVIEWS"
          :key="review.id"
          class="reviews-slider__slide"
        >
          <ReviewCard
            :text="review.text"
            :name="review.name"
            :country="review.country"
            :rating="review.rating"
            :counter="counterLabel"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSlider } from '@/shared'
import { ReviewCard } from './components'
import { REVIEWS } from './reviews'

const AUTOPLAY_INTERVAL_MS = 5000
const SWIPE_THRESHOLD_PX = 40

const { currentIndex, next, prev } = useSlider(REVIEWS.length, AUTOPLAY_INTERVAL_MS)

const trackStyle = computed(() => ({
  transform: `translateX(-${currentIndex.value * 100}%)`,
}))

const counterLabel = computed(() => `${currentIndex.value + 1} / ${REVIEWS.length}`)

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
</script>

<style scoped lang="scss">
.reviews-slider {
  width: 100%;
  padding: 3rem 1.5rem;

  &__title {
    font-family: var(--font-brand);
    font-size: 2.2rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  &__viewport {
    overflow: hidden;
  }

  &__track {
    display: flex;
    transition: transform 0.4s ease-in-out;
  }

  &__slide {
    min-width: 100%;
  }
}
</style>
