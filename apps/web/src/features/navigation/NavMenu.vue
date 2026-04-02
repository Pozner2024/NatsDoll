<template>
  <Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
  <nav v-show="isOpen" class="nav-menu">
    <RouterLink
      to="/"
      class="nav-menu__item"
      exact-active-class="nav-menu__item--active"
      @click="$emit('close')"
    >
      Home
    </RouterLink>

    <div class="nav-menu__group">
      <button
        class="nav-menu__item nav-menu__item--toggle"
        :class="{ 'nav-menu__item--active': isShopActive }"
        aria-haspopup="true"
        :aria-expanded="shopOpen"
        aria-controls="shop-submenu"
        @click="shopOpen = !shopOpen"
        @keydown.escape="shopOpen = false"
      >
        The shop
        <svg
          class="nav-menu__chevron"
          :class="{ 'nav-menu__chevron--open': shopOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <Transition
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @after-enter="onAfterEnter"
        @leave="onLeave"
        @after-leave="onAfterLeave"
      >
        <div v-show="shopOpen" id="shop-submenu" role="menu" class="nav-menu__submenu">
          <RouterLink
            v-for="cat in shopCategories"
            :key="cat.to"
            :to="cat.to"
            role="menuitem"
            class="nav-menu__subitem"
            exact-active-class="nav-menu__subitem--active"
            @click="$emit('close')"
          >
            {{ cat.label }}
          </RouterLink>
        </div>
      </Transition>
    </div>

    <RouterLink
      to="/gallery"
      class="nav-menu__item"
      exact-active-class="nav-menu__item--active"
      @click="$emit('close')"
    >
      The gallery
    </RouterLink>

    <RouterLink
      to="/contact"
      class="nav-menu__item"
      exact-active-class="nav-menu__item--active"
      @click="$emit('close')"
    >
      Contact
    </RouterLink>

    <RouterLink
      to="/login"
      class="nav-menu__item"
      exact-active-class="nav-menu__item--active"
      @click="$emit('close')"
    >
      Login
    </RouterLink>

    <RouterLink
      to="/cart"
      class="nav-menu__item nav-menu__item--cart"
      exact-active-class="nav-menu__item--active"
      @click="$emit('close')"
    >
      <svg class="nav-menu__cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      Cart
      <span v-if="cartCount > 0" class="nav-menu__badge">{{ cartCount }}</span>
    </RouterLink>
  </nav>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

const route = useRoute()
const shopOpen = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) shopOpen.value = false
})

const isShopActive = computed(() => route.path.startsWith('/shop'))

const shopCategories = [
  { label: 'All', to: '/shop' },
  { label: 'On sale', to: '/shop/on-sale' },
  { label: 'Art Dolls', to: '/shop/art-dolls' },
  { label: 'Birthday Gifts', to: '/shop/birthday-gifts' },
  { label: 'Christmas Gifts', to: '/shop/christmas-gifts' },
  { label: 'Valentines Day Gifts', to: '/shop/valentines-day-gifts' },
  { label: 'Halloween Gifts', to: '/shop/halloween-gifts' },
  { label: 'Graduation Gifts', to: '/shop/graduation-gifts' },
  { label: 'Cake Toppers', to: '/shop/cake-toppers' },
  { label: 'Dollhouse Miniature', to: '/shop/dollhouse-miniature' },
  { label: 'Party favors BULK', to: '/shop/party-favors-bulk' },
]

// Заглушка — заменить на useCartStore().count когда cart store будет готов
const cartCount = 0

function onBeforeEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.overflow = 'hidden'
}

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.transition = 'height 0.3s ease'
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
  htmlEl.addEventListener('transitionend', done, { once: true })
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
  htmlEl.style.overflow = 'hidden'
  // force reflow
  void htmlEl.offsetHeight
  htmlEl.style.transition = 'height 0.3s ease'
  htmlEl.style.height = '0'
  htmlEl.addEventListener('transitionend', done, { once: true })
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}
</script>

<style scoped lang="scss">
.nav-menu {
  background: #fdf6ef;
  border-bottom: 1px solid #d9c9bd;
  z-index: 5;
  padding: 6px 0 4px;

  &__group {
    border-bottom: 1px solid #ecddd5;
  }

  &__item {
    display: block;
    padding: 10px 22px;
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    color: #2c1810;
    border-bottom: 1px solid #ecddd5;
    text-decoration: none;
    transition: color 0.2s ease, padding-left 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      color: #8b5e52;
      padding-left: 28px;
    }

    &--active {
      font-style: italic;
      color: #8b5e52;
    }

    &--toggle {
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-right: 18px;
    }

    &--cart {
      display: flex;
      align-items: center;
      gap: 8px;
      font-style: italic;
    }
  }

  &__chevron {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transition: transform 0.25s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__submenu {
    overflow: hidden;
  }

  &__subitem {
    display: block;
    padding: 8px 22px 8px 36px;
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    color: #5a3d35;
    text-decoration: none;
    border-bottom: 1px solid #f0e5dd;
    transition: color 0.2s ease, padding-left 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      color: #8b5e52;
      padding-left: 42px;
    }

    &--active {
      font-style: italic;
      color: #8b5e52;
    }
  }

  &__cart-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  &__badge {
    margin-left: auto;
    background: #2c1810;
    color: #fff9f5;
    font-family: sans-serif;
    font-size: 10px;
    font-weight: 400;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}
</style>
