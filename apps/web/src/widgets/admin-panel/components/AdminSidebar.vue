<template>
  <Transition name="overlay-fade">
    <div v-if="isOpen" class="admin-sidebar__overlay" @click="$emit('close')" />
  </Transition>

  <aside class="admin-sidebar" :class="{ 'admin-sidebar--open': isOpen }">
    <div class="admin-sidebar__brand">
      <div class="admin-sidebar__logo">Shop Manager</div>
    </div>

    <div class="admin-sidebar__user">
      <span class="admin-sidebar__user-email">{{ user?.email }}</span>
    </div>

    <nav class="admin-sidebar__nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="admin-sidebar__item"
        :active-class="item.exact ? '' : 'admin-sidebar__item--active'"
        :exact-active-class="'admin-sidebar__item--active'"
        @click="$emit('close')"
      >
        <component :is="item.icon" class="admin-sidebar__icon" />
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="admin-sidebar__badge">{{ item.badge }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/entities/user'
import IconDashboard from './icons/IconDashboard.vue'
import IconListings from './icons/IconListings.vue'
import IconMessages from './icons/IconMessages.vue'
import IconOrders from './icons/IconOrders.vue'
import IconAnalytics from './icons/IconAnalytics.vue'
import IconSales from './icons/IconSales.vue'
import IconFinances from './icons/IconFinances.vue'

defineProps<{ isOpen: boolean }>()
defineEmits<{ close: [] }>()

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const navItems = [
  { to: '/admin',           label: 'Dashboard',        icon: IconDashboard,  exact: true  },
  { to: '/admin/listings',  label: 'Listings',          icon: IconListings,   exact: false },
  { to: '/admin/messages',  label: 'Messages',          icon: IconMessages,   exact: false },
  { to: '/admin/orders',    label: 'Orders',            icon: IconOrders,     exact: false },
  { to: '/admin/analytics', label: 'Analytics',         icon: IconAnalytics,  exact: false },
  { to: '/admin/sales',     label: 'Sales & Discounts', icon: IconSales,      exact: false },
  { to: '/admin/finances',  label: 'Finances',          icon: IconFinances,   exact: false },
]
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-sidebar {
  width: 240px;
  background: #2c1810;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  // Mobile: hidden off-screen, slides in when open
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  transform: translateX(-100%);
  transition: transform 0.25s ease;

  &--open {
    transform: translateX(0);
  }

  @include tablet {
    position: static;
    transform: none;
    min-height: 100vh;
  }

  &__overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    z-index: 199;

    @include tablet {
      display: none;
    }
  }

  &__brand {
    padding: 28px 24px 20px;
    border-bottom: 1px solid rgb(236 221 213 / 0.12);
  }

  &__logo {
    font-family: var(--font-brand);
    font-size: 2.2rem;
    color: var(--color-bg);
    line-height: 1;
  }

  &__user {
    padding: 12px 24px 16px;
    border-bottom: 1px solid rgb(236 221 213 / 0.12);
  }

  &__user-email {
    font-size: 0.72rem;
    color: rgb(253 246 239 / 0.5);
    font-style: italic;
  }

  &__nav {
    padding: 10px 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 24px;
    font-size: 0.82rem;
    color: rgb(253 246 239 / 0.55);
    text-decoration: none;
    letter-spacing: 0.02em;
    position: relative;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: rgb(253 246 239 / 0.9);
      background: rgb(253 246 239 / 0.05);
    }

    &--active {
      color: var(--color-bg);
      background: rgb(139 94 82 / 0.25);

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

  &__icon {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    opacity: 0.7;

    .admin-sidebar__item--active & {
      opacity: 1;
    }
  }

  &__badge {
    margin-left: auto;
    background: var(--color-accent);
    color: var(--color-bg);
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
  }
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
