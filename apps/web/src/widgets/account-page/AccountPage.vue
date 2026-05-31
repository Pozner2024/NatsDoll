<template>
  <div class="account-page">
    <aside class="account-page__sidebar">
      <div class="account-page__brand">
        <div class="account-page__logo">My Account</div>
      </div>

      <div class="account-page__user">
        <div class="account-page__avatar">{{ initials }}</div>
        <div class="account-page__user-info">
          <p class="account-page__user-name">{{ user?.name }}</p>
          <p class="account-page__user-email">{{ user?.email }}</p>
        </div>
      </div>

      <nav class="account-page__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="account-page__nav-item"
          active-class="account-page__nav-item--active"
        >
          <component :is="item.icon" class="account-page__nav-icon" />
          <span class="account-page__nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="account-page__main">
      <header class="account-page__topbar">
        <h1 class="account-page__topbar-title">{{ currentTitle }}</h1>
      </header>
      <div class="account-page__content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/entities/user'
import IconProfile from './components/IconProfile.vue'
import IconPurchases from './components/IconPurchases.vue'
import IconFavorites from './components/IconFavorites.vue'
import IconAddresses from './components/IconAddresses.vue'
import IconReviews from './components/IconReviews.vue'
import IconMessages from './components/IconMessages.vue'

const authStore = useAuthStore()
const route = useRoute()

const user = computed(() => authStore.user)

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
})

const navItems = [
  { to: '/account/profile',   label: 'Profile',    icon: IconProfile   },
  { to: '/account/purchases', label: 'Purchases',  icon: IconPurchases },
  { to: '/account/favorites', label: 'Favorites',  icon: IconFavorites },
  { to: '/account/addresses', label: 'Addresses',  icon: IconAddresses },
  { to: '/account/reviews',   label: 'Reviews',    icon: IconReviews   },
  { to: '/account/messages',  label: 'Messages',   icon: IconMessages  },
]

const currentTitle = computed(() => {
  const match = navItems.find(item => route.path.startsWith(item.to))
  return match?.label ?? 'Account'
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @include tablet {
    flex-direction: row;
  }

  // ── Sidebar ──────────────────────────────────────────
  &__sidebar {
    background: var(--color-bg);
    padding: 1.25rem 1rem 0;

    @include tablet {
      width: 240px;
      min-height: 100vh;
      background: #2c1810;
      padding: 0;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
  }

  &__brand {
    display: none;

    @include tablet {
      display: block;
      padding: 28px 24px 20px;
      border-bottom: 1px solid rgb(236 221 213 / 0.12);
    }
  }

  &__logo {
    font-family: var(--font-brand);
    font-size: 2.2rem;
    color: var(--color-bg);
    line-height: 1;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.5rem;

    @include tablet {
      padding: 14px 18px 16px;
      border-bottom: 1px solid rgb(236 221 213 / 0.12);
      margin-bottom: 0;
      gap: 10px;
    }
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(var(--btn-gradient-dark)), rgb(var(--btn-gradient-mid)));
    color: var(--color-white);
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0.05em;

    @include tablet {
      width: 30px;
      height: 30px;
      font-size: 0.65rem;
    }
  }

  &__user-info {
    overflow: hidden;
  }

  &__user-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include tablet {
      font-size: 0.72rem;
      color: rgb(253 246 239 / 0.85);
    }
  }

  &__user-email {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include tablet {
      font-size: 0.62rem;
      color: rgb(253 246 239 / 0.45);
      font-style: italic;
    }
  }

  // ── Nav ──────────────────────────────────────────────
  &__nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    padding-bottom: 1rem;

    @include tablet {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 8px 0;
      flex: 1;
    }
  }

  &__nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.65rem 0.5rem;
    border-radius: 8px;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    text-decoration: none;
    text-align: center;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.7);
      color: var(--color-accent);
      font-weight: 600;
    }

    @include tablet {
      flex-direction: row;
      gap: 11px;
      padding: 11px 24px;
      border-radius: 0;
      font-size: 0.82rem;
      color: rgb(253 246 239 / 0.55);
      text-align: left;
      position: relative;

      &:hover {
        background: rgb(253 246 239 / 0.05);
        color: rgb(253 246 239 / 0.9);
      }

      &--active {
        background: rgb(139 94 82 / 0.25);
        color: var(--color-bg);
        font-weight: 400;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--color-accent);
          border-radius: 0 2px 2px 0;
        }
      }
    }
  }

  &__nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    opacity: 0.6;

    .account-page__nav-item--active & {
      opacity: 1;
    }

    @include tablet {
      width: 16px;
      height: 16px;
      opacity: 0.65;

      .account-page__nav-item--active & {
        opacity: 1;
      }
    }
  }

  &__nav-label {
    @include tablet {
      font-size: 0.82rem;
    }
  }

  // ── Main ─────────────────────────────────────────────
  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__topbar {
    display: none;

    @include tablet {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 32px;
      background: var(--color-white);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
  }

  &__topbar-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.01em;
  }

  &__content {
    padding: 1.5rem 1rem 3rem;
    flex: 1;

    @include tablet {
      padding: 28px 32px;
    }
  }
}
</style>
