<template>
  <footer class="app-footer">
    <!-- Бренд -->
    <div class="app-footer__brand">
      <span class="app-footer__logo">NatsDoll</span>
      <p class="app-footer__tagline">
        Handmade polymer clay art
        <em class="app-footer__tagline-sub">Made to be treasured.</em>
      </p>
    </div>

    <!-- Навигация + соцсети -->
    <div class="app-footer__columns">
      <nav class="app-footer__col">
        <p class="app-footer__col-title">Navigate</p>
        <ul class="app-footer__links">
          <li v-for="link in navLinks" :key="link.to">
            <RouterLink class="app-footer__link" :to="link.to">{{ link.label }}</RouterLink>
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
        <p class="app-footer__col-title">Follow</p>
        <ul class="app-footer__links">
          <li v-for="social in socialLinks" :key="social.label">
            <a class="app-footer__link" :href="social.href" target="_blank" rel="noopener noreferrer">
              {{ social.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Stay Connected -->
    <div class="app-footer__subscribe">
      <NewsletterSubscribe />
    </div>

    <!-- Копирайт -->
    <p class="app-footer__copyright">© 2026 NatsDoll. All rights reserved.</p>
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
  { label: 'The Artist', to: '/' },
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
@property --btn-angle {
  syntax: '<angle>';
  initial-value: 90deg;
  inherits: false;
}

.app-footer {
  width: 100%;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding: 2rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  // Бренд
  &__brand {
    text-align: right;
  }

  &__logo {
    font-family: var(--font-brand);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    display: block;
  }

  &__tagline {
    margin: 0.3rem 0 0;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  &__tagline-sub {
    display: block;
    font-style: italic;
  }

  // Колонки
  &__columns {
    display: flex;
    justify-content: space-between;
  }

  &__col-title {
    font-family: var(--font-display);
    font-size: 0.7rem;
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
    font-size: 0.82rem;
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

  // Копирайт
  &__copyright {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
    font-size: 0.68rem;
    color: var(--color-text-muted);
    opacity: 0.7;
    text-align: center;
    margin: 0;
  }
}


</style>
