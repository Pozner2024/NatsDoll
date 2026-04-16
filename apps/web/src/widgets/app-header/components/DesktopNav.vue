<template>
  <nav class="desktop-nav">
    <RouterLink
      :to="homeItem.to"
      class="desktop-nav__link"
      exact-active-class="desktop-nav__link--active"
    >
      {{ homeItem.label }}
    </RouterLink>

    <div
      class="desktop-nav__dropdown"
      @mouseenter="shopOpen = true"
      @mouseleave="shopOpen = false"
    >
      <button
        class="desktop-nav__link desktop-nav__link--toggle"
        :class="{ 'desktop-nav__link--active': isShopActive }"
        :aria-expanded="shopOpen"
        aria-haspopup="true"
        @click="shopOpen = !shopOpen"
      >
        The shop
        <svg
          class="desktop-nav__chevron"
          :class="{ 'desktop-nav__chevron--open': shopOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <Transition name="dropdown-fade">
        <div
          v-if="shopOpen"
          class="desktop-nav__submenu"
        >
          <RouterLink
            v-for="cat in shopCategories"
            :key="cat.to"
            :to="cat.to"
            class="desktop-nav__sublink"
            exact-active-class="desktop-nav__sublink--active"
            @click="shopOpen = false"
          >
            {{ cat.label }}
          </RouterLink>
        </div>
      </Transition>
    </div>

    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="desktop-nav__link"
      exact-active-class="desktop-nav__link--active"
    >
      {{ item.label }}
    </RouterLink>

    <button
      class="desktop-nav__link desktop-nav__link--btn"
      @click="openContactModal"
    >
      Contact
    </button>

    <button
      class="desktop-nav__link desktop-nav__link--btn"
      @click="handleAuthClick"
    >
      {{ authStore.isLoggedIn ? 'My account' : 'Login' }}
    </button>

    <CartLink />
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { navItems, shopCategories, homeItem } from '../navigationConfig'
import { CartLink } from '.'
import { useContactModal } from '@/features/contact-modal'
import { useAuthModal } from '@/features/auth-modal'
import { useAuthStore } from '@/features/auth'

const { open: openContactModal } = useContactModal()
const { open: openAuthModal } = useAuthModal()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const shopOpen = ref(false)
const isShopActive = computed(() => route.path.startsWith('/shop'))

function handleAuthClick() {
  if (authStore.isLoggedIn) {
    router.push('/account')
  } else {
    openAuthModal()
  }
}
</script>

<style scoped lang="scss">
.desktop-nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;

  &__link {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    color: var(--color-text);
    text-decoration: none;
    letter-spacing: 0.05em;
    transition: color 0.2s ease;
    background: none;
    border: none;
    padding: 0;

    &:hover {
      color: var(--color-accent);
    }

    &--active {
      font-style: italic;
      color: var(--color-accent);
    }

    &--toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    &--btn {
      font-family: var(--font-display);
      font-size: var(--fs-sm);
      color: var(--color-text);
      letter-spacing: 0.05em;

      &:hover {
        color: var(--color-accent);
      }
    }
  }

  &__dropdown {
    position: relative;
  }

  &__chevron {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: transform 0.25s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__submenu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-white);
    border: 1px solid var(--color-border);
    padding: 0.5rem 0;
    min-width: 200px;
    z-index: var(--z-dropdown);
    display: flex;
    flex-direction: column;
  }

  &__sublink {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.2s ease;
    white-space: nowrap;

    &:hover {
      color: var(--color-accent);
    }

    &--active {
      font-style: italic;
      color: var(--color-accent);
    }
  }
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
}
</style>
