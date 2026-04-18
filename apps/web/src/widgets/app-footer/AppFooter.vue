<template>
  <footer class="app-footer">
       <div class="app-footer__brand">
      <span class="app-footer__logo">NatsDoll</span>
      <p class="app-footer__tagline">
        Handmade polymer clay art
        <em class="app-footer__tagline-sub">Made to be treasured.</em>
      </p>
    </div>

    <div class="app-footer__columns">
      <nav class="app-footer__col">
        <p class="app-footer__col-title">
          Navigate
        </p>
        <ul class="app-footer__links">
          <li
            v-for="link in navLinks"
            :key="link.to"
          >
            <RouterLink
              class="app-footer__link"
              :to="link.to"
            >
              {{ link.label }}
            </RouterLink>
          </li>
          <li>
            <button
              class="app-footer__link app-footer__link--btn"
              @click="openContactModal"
            >
              Contact
            </button>
          </li>
        </ul>
      </nav>

      <div class="app-footer__col">
        <p class="app-footer__col-title">
          Follow
        </p>
        <ul class="app-footer__links">
          <li
            v-for="social in socialLinks"
            :key="social.label"
          >
            <a
              class="app-footer__link"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ social.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="app-footer__subscribe">
      <NewsletterSubscribe />
    </div>

    <p class="app-footer__copyright">
      © 2026 NatsDoll. All rights reserved.
    </p>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NewsletterSubscribe } from '@/features/newsletter-subscribe'
import { useContactModal } from '@/features/contact-modal'

const { open: openContactModal } = useContactModal()

const navLinks = [
  { label: 'The Shop', to: '/shop' },
  { label: 'The Gallery', to: '/gallery' },
  { label: 'The Artist', to: '/#artist' },
  { label: 'FAQ', to: '/#faq' },
]

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Pinterest', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'TikTok', href: '#' },
  { label: 'Etsy', href: '#' },
]
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints' as *;

.app-footer {
  width: 100%;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding: 2rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  @include tablet {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "subscribe  subscribe"
      "brand      columns"
      "copyright  copyright";
    column-gap: 3rem;
    row-gap: 1.75rem;
    padding: 2rem 2rem 1.5rem;
  }

  @include desktop {
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      "subscribe  columns  brand"
      "copy       copy     copy";
    column-gap: 4rem;
    row-gap: 2rem;
    padding: 3rem 4rem 1.5rem;
  }

  &__subscribe {
    @include tablet {
      grid-area: subscribe;
    }

    @include desktop {
      grid-area: subscribe;
      align-self: start;
    }
  }

  &__brand {
    text-align: right;

    @include tablet {
      grid-area: brand;
      text-align: left;
      align-self: start;
    }

    @include desktop {
      text-align: right;
    }
  }

  &__logo {
    font-family: var(--font-brand);
    font-size: var(--fs-logo);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    display: block;
  }

  &__tagline {
    margin: 0.3rem 0 0;
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  &__tagline-sub {
    display: block;
    font-style: italic;
  }

  &__columns {
    display: flex;
    justify-content: space-between;

    @include tablet {
      grid-area: columns;
      justify-content: flex-start;
      gap: 3rem;
      align-self: start;
    }

    @include desktop {
      justify-content: center;
      gap: 4rem;
    }
  }

  &__col-title {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  &__links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__link {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
    }

    &--btn {
      background: none;
      border: none;
      padding: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      text-align: left;

      &:hover {
        color: var(--color-accent);
      }
    }
  }

  &__copyright {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: 0.7;
    text-align: center;
    margin: 0;

    @include tablet {
      grid-area: copyright;
    }

    @include desktop {
      grid-area: copy;
    }
  }
}


</style>
