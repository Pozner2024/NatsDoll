<template>
  <div class="admin-panel">
    <div class="admin-panel__mobile-header">
      <div class="admin-panel__mobile-logo">
        Shop Manager
      </div>
      <span class="admin-panel__mobile-title">{{ currentTitle }}</span>
    </div>

    <AdminSidebar />

    <div class="admin-panel__main">
      <RouterView />
    </div>

    <nav class="admin-panel__tabbar">
      <RouterLink
        v-for="item in tabItems"
        :key="item.to"
        :to="item.to"
        class="admin-panel__tab"
        :active-class="item.exact ? '' : 'admin-panel__tab--active'"
        :exact-active-class="item.exact ? 'admin-panel__tab--active' : ''"
      >
        <component
          :is="item.icon"
          class="admin-panel__tab-icon"
        />
        <span class="admin-panel__tab-label">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AdminSidebar from './components/AdminSidebar.vue'
import IconDashboard from './components/icons/IconDashboard.vue'
import IconListings from './components/icons/IconListings.vue'
import IconOrders from './components/icons/IconOrders.vue'
import IconMessages from './components/icons/IconMessages.vue'
import IconAnalytics from './components/icons/IconAnalytics.vue'

const route = useRoute()

const tabItems = [
  { to: '/admin',           label: 'Home',     icon: IconDashboard, exact: true  },
  { to: '/admin/listings',  label: 'Listings', icon: IconListings,  exact: false },
  { to: '/admin/orders',    label: 'Orders',   icon: IconOrders,    exact: false },
  { to: '/admin/messages',  label: 'Messages', icon: IconMessages,  exact: false },
  { to: '/admin/analytics', label: 'More',     icon: IconAnalytics, exact: false },
]

const allTitles: Record<string, string> = {
  '/admin':           'Dashboard',
  '/admin/listings':  'Listings',
  '/admin/orders':    'Orders',
  '/admin/messages':  'Messages',
  '/admin/analytics': 'Analytics',
  '/admin/sales':     'Sales & Discounts',
}

const currentTitle = computed(() => {
  const match = Object.keys(allTitles)
    .sort((a, b) => b.length - a.length)
    .find(path => route.path === path || route.path.startsWith(path + '/'))
  return match ? allTitles[match] : 'Dashboard'
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-panel {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);

  @include tablet {
    flex-direction: row;
  }

  // ── Mobile header ─────────────────────────────────────
  &__mobile-header {
    height: 52px;
    background: #2c1810;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    flex-shrink: 0;

    @include tablet {
      display: none;
    }
  }

  &__mobile-logo {
    font-family: var(--font-brand);
    font-size: 2rem;
    color: var(--color-bg);
    line-height: 1;
  }

  &__mobile-title {
    font-size: 0.82rem;
    color: rgb(253 246 239 / 0.55);
    font-style: italic;

    &::before {
      content: '·';
      margin-right: 12px;
      color: rgb(253 246 239 / 0.25);
    }
  }

  // ── Main ─────────────────────────────────────────────
  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--color-bg);
    padding-bottom: 56px;

    @include tablet {
      padding-bottom: 0;
    }
  }

  // ── Bottom tab bar ────────────────────────────────────
  &__tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: #2c1810;
    display: flex;
    align-items: stretch;
    border-top: 1px solid rgb(236 221 213 / 0.12);
    z-index: var(--z-admin-mobile-nav);

    @include tablet {
      display: none;
    }
  }

  &__tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    text-decoration: none;
    color: rgb(253 246 239 / 0.4);
    transition: color 0.15s;

    &--active {
      color: var(--color-accent);
    }
  }

  &__tab-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  &__tab-label {
    font-size: 0.58rem;
    letter-spacing: 0.04em;
  }
}
</style>
