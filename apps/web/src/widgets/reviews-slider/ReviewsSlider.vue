<template>
  <section class="reviews-slider">
    <h2 class="reviews-slider__title">
      <span class="reviews-slider__title-sub">the reviews</span>
      <span class="reviews-slider__title-brand">Watch Collectors Say</span>
    </h2>

    <div
      class="reviews-slider__viewport"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div
        class="reviews-slider__track"
        :style="trackStyle"
      >
        <div
          v-for="(review, i) in REVIEWS"
          :key="review.id"
          class="reviews-slider__slide"
        >
          <ReviewCard
            :text="review.text"
            :name="review.name"
            :country="review.country"
            :rating="review.rating"
            :counter="`${i + 1} / ${REVIEWS.length}`"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSlider } from '@/shared'
import { ReviewCard } from './components'
import { REVIEWS } from './reviews'

const AUTOPLAY_INTERVAL_MS = 5000
const SWIPE_THRESHOLD_PX = 40
const TABLET_QUERY = '(min-width: 768px)'
const DESKTOP_QUERY = '(min-width: 1200px)'

const visibleCount = ref(1)

function updateVisibleCount() {
  visibleCount.value = window.matchMedia(DESKTOP_QUERY).matches ? 3
    : window.matchMedia(TABLET_QUERY).matches ? 2
    : 1
}

onMounted(() => {
  updateVisibleCount()
  window.addEventListener('resize', updateVisibleCount)
})
onUnmounted(() => window.removeEventListener('resize', updateVisibleCount))

const slideCount = computed(() => Math.max(1, REVIEWS.length - visibleCount.value + 1))
const { currentIndex, next, prev } = useSlider(slideCount, AUTOPLAY_INTERVAL_MS)

const slideWidth = computed(() => 100 / visibleCount.value)
const trackStyle = computed(() => ({
  transform: `translateX(-${currentIndex.value * slideWidth.value}%)`,
}))

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
@use '@/assets/styles/breakpoints' as *;

.reviews-slider {
  width: 100%;
  padding: 3rem 1.5rem;

  &__title {
    text-align: right;
    margin-bottom: 1.5rem;
    padding-right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;

    @include tablet {
      padding-right: 2rem;
    }

    @include desktop {
      padding-right: 3rem;
    }
  }

  &__title-sub {
    font-family: var(--font-display);
    font-size: var(--fs-xs);
    font-weight: 400;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0.75;
  }

  &__title-brand {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.1;
  }

  &__viewport {
    overflow: hidden;
  }

  &__track {
    display: flex;
    align-items: stretch;
    transition: transform 0.4s ease-in-out;
  }

  &__slide {
    display: flex;
    min-width: 100%;
    padding: 0 0.25rem;

    @include tablet {
      min-width: 50%;
      padding: 0 0.5rem;
    }

    @include desktop {
      min-width: 33.333%;
      padding: 0 0.75rem;
    }
  }
}
</style>
