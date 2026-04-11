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
      <p class="app-footer__subscribe-title">Stay Connected</p>
      <p class="app-footer__subscribe-sub">New pieces & discounts - straight to your inbox.</p>
      <form v-if="state !== 'success'" class="app-footer__form" @submit.prevent="handleSubmit">
        <input
          v-model="email"
          class="app-footer__input"
          type="email"
          placeholder="Your email"
          :disabled="state === 'loading'"
          required
        />
        <button class="app-footer__btn" type="submit" :disabled="state === 'loading'" aria-label="Subscribe">→</button>
      </form>
      <p v-if="state === 'success'" class="app-footer__subscribe-success">You're in!</p>
      <p v-if="state === 'error'" class="app-footer__subscribe-error">Something went wrong. Try again.</p>
    </div>

    <!-- Копирайт -->
    <p class="app-footer__copyright">© 2026 NatsDoll. All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useNewsletterSubscribe } from '@/shared'

const navLinks = [
  { label: 'The Shop', to: '/shop' },
  { label: 'The Gallery', to: '/gallery' },
  { label: 'The Artist', to: '/' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact', to: '/contact' },
]

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Pinterest', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'TikTok', href: '#' },
  { label: 'Etsy', href: '#' },
]

const { email, state, handleSubmit } = useNewsletterSubscribe()
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
  }

  // Подписка
  &__subscribe-title {
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text);
    margin: 0 0 0.4rem;
  }

  &__subscribe-sub {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin: 0 0 0.875rem;
    line-height: 1.5;
  }

  &__form {
    --btn-angle: 90deg;

    display: flex;
    border: 2px solid;
    border-image: conic-gradient(
      from var(--btn-angle),
      rgb(var(--btn-gradient-dark) / 0.4),
      rgb(var(--btn-gradient-mid) / 1) 0.07turn,
      rgb(var(--btn-gradient-light) / 1) 0.12turn,
      rgb(var(--btn-gradient-mid) / 1) 0.17turn,
      rgb(var(--btn-gradient-dark) / 0.4) 0.25turn
    ) 1;
    animation: footer-btn-rotate 3000ms linear infinite forwards;
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.6rem 0.875rem;
    font-family: var(--font-display);
    font-size: 0.78rem;
    color: var(--color-text-muted);
    outline: none;
    min-width: 0;

    &::placeholder {
      opacity: 0.5;
    }
  }

  &__btn {
    border: none;
    border-left: 1px solid var(--color-border);
    background: none;
    padding: 0.6rem 1rem;
    font-size: 1rem;
    color: var(--color-accent);
    display: flex;
    align-items: center;

    transition: color 0.2s ease, background-color 0.2s ease;

    &:hover {
      color: var(--color-text);
      background-color: rgb(var(--btn-gradient-mid) / 0.12);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  &__subscribe-success {
    font-size: 0.82rem;
    color: var(--color-accent);
    margin: 0;
  }

  &__subscribe-error {
    font-size: 0.78rem;
    color: #e53e3e;
    margin: 0.4rem 0 0;
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

@keyframes footer-btn-rotate {
  100% {
    --btn-angle: 420deg;
  }
}
</style>
