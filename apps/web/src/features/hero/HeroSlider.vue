<template>
  <div class="hero-slider">
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
      <p class="hero-slider__text">Find a unique gift here.</p>
      <RouterLink class="hero-slider__btn" to="/shop">The shop</RouterLink>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import slide1 from '@/assets/slides/slide1.jpg'
import slide2 from '@/assets/slides/slide2.jpg'
import slide3 from '@/assets/slides/slide3.jpg'

const AUTOPLAY_INTERVAL_MS = 4000

const slides = [
  { id: 1, image: slide1 },
  { id: 2, image: slide2 },
  { id: 3, image: slide3 },
]

const currentIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % slides.length
  }, AUTOPLAY_INTERVAL_MS)
}

function resetTimer() {
  if (timer) clearInterval(timer)
  startTimer()
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % slides.length
  resetTimer()
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + slides.length) % slides.length
  resetTimer()
}

function goTo(index: number) {
  currentIndex.value = index
  resetTimer()
}

onMounted(startTimer)
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
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
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 2.5rem 2.5rem 0;
    gap: 1rem;
    z-index: 1;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse 60% 55% at 100% 0%,
        rgba(15, 7, 3, 0.65) 0%,
        rgba(15, 7, 3, 0.2) 55%,
        transparent 100%
      );
      pointer-events: none;
      z-index: 0;
    }
  }

  &__text {
    position: relative;
    z-index: 1;
    font-family: var(--font-brand);
    font-weight: 700;
    font-size: clamp(3.5rem, 7vw, 6rem);
    color: #fff;
    text-align: right;
    line-height: 1.1;
    text-shadow: 0 3px 16px rgba(0, 0, 0, 0.6);
  }

  &__btn {
    position: relative;
    z-index: 1;
    display: inline-block;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.72rem;
    color: #fff;
    padding: 0.6rem 2rem;
    text-decoration: none;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: none;
    transition: color 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 1px;
      padding: 2px;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.1) 20%,
        rgba(255, 255, 255, 0.95) 48%,
        rgba(255, 255, 255, 0.25) 52%,
        rgba(255, 255, 255, 0.1) 80%,
        rgba(255, 255, 255, 0.1) 100%
      );
      background-size: 250% 100%;
      background-position: 200% center;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: destination-out;
      mask-composite: exclude;
      animation: shimmer-border 3s ease-in-out infinite;
    }

    &:hover {
      background-color: #fff;
      color: var(--color-text);

      &::before {
        opacity: 0;
        animation-play-state: paused;
      }
    }
  }

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    background: none;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.4rem 0.6rem;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    &--prev {
      left: 0.25rem;
    }

    &--next {
      right: 0.25rem;
    }
  }

  &__dots {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    z-index: 2;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;

    &--active {
      background: #fff;
    }
  }
}

@keyframes shimmer-border {
  0%   { background-position: 200% center; }
  100% { background-position: -50% center; }
}
</style>
