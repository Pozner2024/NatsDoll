<template>
  <div class="account-page">
    <aside class="account-page__sidebar">
      <div class="account-page__user">
        <div class="account-page__user-initials">{{ initials }}</div>
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
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="account-page__content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/entities/user'
import IconProfile from './components/IconProfile.vue'
import IconPurchases from './components/IconPurchases.vue'
import IconFavorites from './components/IconFavorites.vue'
import IconAddresses from './components/IconAddresses.vue'
import IconReviews from './components/IconReviews.vue'
import IconMessages from './components/IconMessages.vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
})

const navItems = [
  { to: '/account/profile', label: 'Profile', icon: IconProfile },
  { to: '/account/purchases', label: 'Purchases', icon: IconPurchases },
  { to: '/account/favorites', label: 'Favorites', icon: IconFavorites },
  { to: '/account/addresses', label: 'Addresses', icon: IconAddresses },
  { to: '/account/reviews', label: 'Reviews', icon: IconReviews },
  { to: '/account/messages', label: 'Messages', icon: IconMessages },
]
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @include tablet {
    flex-direction: row;
    align-items: flex-start;
    gap: 2rem;
    padding: 2rem;
  }

  &__sidebar {
    @include tablet {
      width: 260px;
      flex-shrink: 0;
      position: sticky;
      top: 1.5rem;
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0 1rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.75rem;
  }

  &__user-initials {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(var(--btn-gradient-dark)), rgb(var(--btn-gradient-mid)));
    color: var(--color-white);
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0.05em;

    @include tablet {
      width: 52px;
      height: 52px;
      font-size: 1.2rem;
    }
  }

  &__user-info {
    overflow: hidden;
  }

  &__user-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include tablet {
      font-size: 1.05rem;
    }
  }

  &__user-email {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include tablet {
      font-size: 0.85rem;
    }
  }

  &__nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;

    @include tablet {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }

  &__nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.65rem 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-decoration: none;
    text-align: center;
    transition: background 0.15s, color 0.15s;

    @include tablet {
      flex-direction: row;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      text-align: left;
    }

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.5);
      color: var(--color-text);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.7);
      color: var(--color-accent);
      font-weight: 600;
    }
  }

  &__nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;

    @include tablet {
      width: 18px;
      height: 18px;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }
}
</style>
