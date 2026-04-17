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
      ref="dropdownRef"
      class="desktop-nav__dropdown"
      @mouseenter="shopOpen = true"
      @mouseleave="shopOpen = false"
      @focusout="onDropdownFocusOut"
    >
      <button
        class="desktop-nav__link desktop-nav__link--toggle"
        :class="{ 'desktop-nav__link--active': isShopActive }"
        :aria-expanded="shopOpen"
        aria-haspopup="true"
        @keydown.escape="closeShop"
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

    <div
      v-if="authStore.isLoggedIn"
      ref="profileDropdownRef"
      class="desktop-nav__dropdown"
      @mouseenter="profileOpen = true"
      @mouseleave="profileOpen = false"
      @focusout="onProfileFocusOut"
    >
      <button
        class="desktop-nav__link desktop-nav__link--toggle"
        :aria-expanded="profileOpen"
        aria-haspopup="true"
        @keydown.escape="profileOpen = false"
        @click="profileOpen = !profileOpen"
      >
        My account
        <svg
          class="desktop-nav__chevron"
          :class="{ 'desktop-nav__chevron--open': profileOpen }"
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
          v-if="profileOpen"
          class="desktop-nav__submenu"
        >
          <RouterLink
            to="/account"
            class="desktop-nav__sublink"
            exact-active-class="desktop-nav__sublink--active"
            @click="profileOpen = false"
          >
            My profile
          </RouterLink>
          <RouterLink
            to="/account/orders"
            class="desktop-nav__sublink"
            exact-active-class="desktop-nav__sublink--active"
            @click="profileOpen = false"
          >
            Orders
          </RouterLink>
          <button
            class="desktop-nav__sublink desktop-nav__sublink--btn"
            @click="handleLogout"
          >
            Sign out
          </button>
        </div>
      </Transition>
    </div>

    <button
      v-else
      class="desktop-nav__link desktop-nav__link--btn"
      @click="openAuthModal"
    >
      Login
    </button>

    <CartLink />
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { navItems, shopCategories, homeItem } from '../navigationConfig'
import CartLink from './CartLink.vue'
import { useContactModal } from '@/features/contact-modal'
import { useAuthModal } from '@/features/auth-modal'
import { useAuthStore } from '@/features/auth'

const { open: openContactModal } = useContactModal()
const { open: openAuthModal } = useAuthModal()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const shopOpen = ref(false)
const profileOpen = ref(false)
const isShopActive = computed(() => route.path.startsWith('/shop'))
const dropdownRef = ref<HTMLElement | null>(null)
const profileDropdownRef = ref<HTMLElement | null>(null)

function closeShop() {
  shopOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!shopOpen.value) return
  const el = dropdownRef.value
  if (!el) return
  if (!el.contains(event.target as Node)) closeShop()
}

function onDropdownFocusOut(e: FocusEvent) {
  if (!shopOpen.value) return
  const el = dropdownRef.value
  if (!el) return
  const next = e.relatedTarget as Node | null
  if (!next || !el.contains(next)) closeShop()
}

function onProfileFocusOut(e: FocusEvent) {
  if (!profileOpen.value) return
  const el = profileDropdownRef.value
  if (!el) return
  const next = e.relatedTarget as Node | null
  if (!next || !el.contains(next)) profileOpen.value = false
}

watch(shopOpen, (open) => {
  if (open) document.addEventListener('click', handleDocumentClick)
  else document.removeEventListener('click', handleDocumentClick)
})

onUnmounted(() => document.removeEventListener('click', handleDocumentClick))

async function handleLogout() {
  profileOpen.value = false
  await authStore.logout()
  router.push({ name: 'home' })
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

    &--btn {
      display: block;
      width: 100%;
      background: none;
      border: none;
      text-align: left;
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
