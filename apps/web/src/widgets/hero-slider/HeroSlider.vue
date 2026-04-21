<template>
  <section class="hero-slider" aria-label="Hero banner">
    <div class="hero-slider__track">
      <div
        v-for="(slide, i) in slides"
        :key="slide.id"
        class="hero-slider__slide"
        :class="{ 'hero-slider__slide--active': i === currentIndex }"
        :style="{ backgroundImage: `url(${slide.image})` }"
      />
    </div>

    <div class="hero-slider__overlay">
      <p class="hero-slider__text">
        Find a unique gift here
      </p>
      <div class="hero-slider__cta">
        <AppButton to="/shop">
          The shop
        </AppButton>
      </div>
    </div>

    <button
      class="hero-slider__arrow hero-slider__arrow--prev"
      aria-label="Previous slide"
      @click="prev"
    >
      &#8249;
    </button>
    <button
      class="hero-slider__arrow hero-slider__arrow--next"
      aria-label="Next slide"
      @click="next"
    >
      &#8250;
    </button>

    <div class="hero-slider__dots">
      <button
        v-for="(slide, i) in slides"
        :key="slide.id"
        class="hero-slider__dot"
        :class="{ 'hero-slider__dot--active': i === currentIndex }"
        :aria-label="`Go to slide ${i + 1}`"
        @click="goTo(i)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSlider, AppButton } from '@/shared'
import slide1 from '@/assets/slides/slide1.jpg'
import slide2 from '@/assets/slides/slide2.jpg'
import slide3 from '@/assets/slides/slide3.jpg'
import slide4 from '@/assets/slides/slide4.jpg'

const AUTOPLAY_INTERVAL_MS = 4000

const slides = [
  { id: 1, image: slide1 },
  { id: 2, image: slide2 },
  { id: 3, image: slide3 },
  { id: 4, image: slide4 },
]

const { currentIndex, next, prev, goTo } = useSlider(slides.length, AUTOPLAY_INTERVAL_MS)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.hero-slider {
  position: relative;
  width: 100vw;
  left: 50%;
  transform: translateX(-50%);
  height: calc(100dvh - var(--header-height));
  overflow: hidden;


  &__track {
    position: relative;
    width: 100%;
    height: 100%;
  }

  &__slide {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transform: scale(1);
    transition:
      opacity 0.9s ease-in-out,
      transform 0.9s ease-in-out;

    &--active {
      opacity: 1;
      transform: scale(1.06);

      @include desktop {
        transform: scale(1.1);
      }
    }
  }

  $overlay-vertical-nudge: 20px;

  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-start;
    padding: calc(2.5rem - $overlay-vertical-nudge) 2.5rem 0;
    gap: 1rem;
    z-index: var(--z-slider-overlay);
  }

  &__cta {
    margin-top: calc($overlay-vertical-nudge / -2);
  }

  &__text {
    position: relative;
    z-index: var(--z-slider-overlay);
    font-family: var(--font-brand);
    font-weight: 700;
    font-size: clamp(3.5rem, 7vw, 6rem);
    color: var(--color-white);
    text-align: right;
    line-height: 1.1;
   
  }

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: var(--z-slider-controls);
    background: none;
    border: none;
    color: var(--color-white);
    font-size: 1.5rem;
    padding: 0.4rem 0.6rem;
    opacity: 0.7;
    transition: opacity 0.2s;

    @include tablet {
      font-size: 2.5rem;
      padding: 0.5rem 1rem;
    }

    &:hover {
      opacity: 1;
    }

    &--prev {
      left: 0.25rem;

      @include tablet {
        left: 1rem;
      }
    }

    &--next {
      right: 0.25rem;

      @include tablet {
        right: 1rem;
      }
    }
  }

  &__dots {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    z-index: var(--z-slider-controls);
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgb(255 255 255 / 0.5);
    border: none;
    transition: background-color 0.2s;

    &--active {
      background: var(--color-white);
    }
  }
}
</style>
