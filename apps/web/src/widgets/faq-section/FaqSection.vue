<template>
  <section id="faq" class="faq-section">
    <div class="faq-section__header">
      <span class="faq-section__tag">FAQ</span>
      <h2 class="faq-section__title">
        Common questions
      </h2>
    </div>

    <div class="faq-section__columns">
      <ul
        v-for="(col, colIndex) in columns"
        :key="colIndex === 0 ? 'col-left' : 'col-right'"
        class="faq-section__list"
      >
        <li
          v-for="item in col"
          :key="item.id"
          class="faq-section__item"
          :class="{ 'faq-section__item--open': openId === item.id }"
        >
          <button
            class="faq-section__question"
            :aria-expanded="openId === item.id"
            :aria-controls="`faq-answer-${item.id}`"
            @click="toggle(item.id)"
          >
            {{ item.question }}
            <span
              class="faq-section__icon"
              aria-hidden="true"
            />
          </button>

          <div
            :id="`faq-answer-${item.id}`"
            class="faq-section__answer"
            role="region"
          >
            <p class="faq-section__answer-text">
              {{ item.answer }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FAQ_ITEMS } from './faq'

const openId = ref<number | null>(null)

function toggle(id: number) {
  openId.value = openId.value === id ? null : id
}

const half = Math.ceil(FAQ_ITEMS.length / 2)
const columns = [FAQ_ITEMS.slice(0, half), FAQ_ITEMS.slice(half)]
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints' as *;

.faq-section {
  width: 100%;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @include tablet {
    max-width: 680px;
    margin: 0 auto;
    padding: 2.5rem 0;
  }

  @include desktop {
    max-width: 1400px;
    padding: 3rem 4rem;
  }

  &__header {
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

  &__title {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    line-height: 1.15;
    color: var(--color-text);
  }

  &__columns {
    @include desktop {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 4rem;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
  }

  &__item {
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
  }

  &__question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 0;
    background: none;
    border: none;
    text-align: left;
    font-family: var(--font-display);
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--color-text);
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-accent);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    position: relative;
    transition: transform 0.3s ease;

    &::before,
    &::after {
      content: '';
      position: absolute;
      background: currentColor;
      border-radius: 1px;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    &::before {
      width: 2px;
      height: 100%;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
    }

    &::after {
      width: 100%;
      height: 2px;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
    }
  }

  &__item--open &__icon::before {
    transform: translateX(-50%) scaleY(0);
    opacity: 0;
  }

  &__answer {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
  }

  &__item--open &__answer {
    grid-template-rows: 1fr;
  }

  &__answer-text {
    overflow: hidden;
    font-family: var(--font-display);
    font-size: var(--fs-base);
    line-height: 1.7;
    color: var(--color-text-muted);
    padding-bottom: 1.1rem;
    margin: 0;
  }
}
</style>
