<template>
  <section
    id="artist"
    class="artist-section"
  >
    <div class="artist-section__header">
      <img
        class="artist-section__photo"
        :src="artistPhoto"
        :alt="artist.name"
      >
      <div class="artist-section__title">
        <span class="artist-section__tag">The artist</span>
        <h2 class="artist-section__name">
          {{ artist.name }}
        </h2>
      </div>
    </div>

    <div class="artist-section__content">
      <p class="artist-section__quote">
        {{ artist.quote }}
      </p>
      <p class="artist-section__bio">
        {{ artist.bio }}
      </p>
    </div>

    <AppButton
      class="artist-section__btn"
      @click="openContactModal"
    >
      Contact
    </AppButton>
  </section>
</template>

<script setup lang="ts">
import { AppButton } from '@/shared'
import artistPhoto from '@/assets/images/artist.jpg'
import { artist } from './artist'
import { useContactModal } from '@/features/contact-modal'

const { open: openContactModal } = useContactModal()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.artist-section {
  width: 100%;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @include tablet {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: 1fr auto;
    align-items: center;
    gap: 0 2.5rem;
    padding: 3rem 2.5rem;
  }

  @include desktop {
    grid-template-columns: 320px 1fr;
    padding: 4rem 5rem;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 1rem;

    @include tablet {
      flex-direction: column;
      align-items: center;
      text-align: center;
      grid-column: 1;
      grid-row: 1;
      gap: 0.75rem;
    }
  }

  &__photo {
    width: 104px;
    height: 104px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    @include tablet {
      width: 160px;
      height: 160px;
    }

    @include desktop {
      width: 200px;
      height: 200px;
    }
  }

  &__title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    @include tablet {
      align-items: center;
    }
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

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0;

    @include tablet {
      grid-column: 2;
      grid-row: 1 / 3;
      align-self: center;
    }

    @include desktop {
      padding-right: 5rem;
    }
  }

  &__quote {
    display: none;

    @include tablet {
      display: block;
      font-family: var(--font-display);
      font-size: var(--fs-stars);
      font-style: italic;
      line-height: 1.5;
      color: var(--color-text-muted);
      padding-bottom: 0.75rem;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      position: relative;

      &::before {
        content: '\201C';
        position: absolute;
        left: 0;
        top: -0.1em;
        font-size: 2em;
        line-height: 1;
        font-style: normal;
        color: var(--color-accent);
        opacity: 0.5;
      }

      &::after {
        content: '\201D';
        font-size: 2em;
        line-height: 0;
        vertical-align: -0.5em;
        font-style: normal;
        color: var(--color-accent);
        opacity: 0.5;
        margin-left: 0.1em;
      }
    }

    @include desktop {
      font-size: 1.65rem;
    }
  }

  &__bio {
    font-size: var(--fs-base);
    line-height: 1.7;
    color: var(--color-text-muted);
    text-align: justify;

    @include tablet {
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
    }
  }

  &__btn {
    width: 180px;
    text-align: center;
    align-self: center;

    @include tablet {
      grid-column: 1;
      grid-row: 2;
      justify-self: center;
      margin-top: 1.25rem;
    }
  }
}
</style>
