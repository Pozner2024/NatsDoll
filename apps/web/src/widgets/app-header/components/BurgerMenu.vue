<template>
  <Transition name="slide-fade">
    <nav
      v-if="isOpen"
      ref="navRef"
      class="burger-menu"
      aria-label="Navigation menu"
      tabindex="-1"
      @keydown.escape="closeMenu"
    >
      <RouterLink
        :to="homeItem.to"
        class="burger-menu__item"
        exact-active-class="burger-menu__item--active"
        @click="closeMenu"
      >
        {{ homeItem.label }}
      </RouterLink>

      <div class="burger-menu__group">
        <button
          class="burger-menu__item burger-menu__item--toggle"
          :class="{ 'burger-menu__item--active': isShopActive }"
          aria-haspopup="true"
          :aria-expanded="shopOpen"
          aria-controls="shop-submenu"
          @click="toggleShop"
        >
          The shop
          <svg
            class="burger-menu__chevron"
            :class="{ 'burger-menu__chevron--open': shopOpen }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <Transition name="slide-fade">
          <div
            v-if="shopOpen"
            id="shop-submenu"
            role="menu"
            class="burger-menu__submenu"
          >
            <RouterLink
              v-for="cat in shopCategories"
              :key="cat.to"
              :to="cat.to"
              role="menuitem"
              class="burger-menu__subitem"
              exact-active-class="burger-menu__subitem--active"
              @click="closeMenu"
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
        class="burger-menu__item"
        exact-active-class="burger-menu__item--active"
        @click="closeMenu"
      >
        {{ item.label }}
      </RouterLink>

      <button
        class="burger-menu__item burger-menu__item--btn"
        @click="() => { openContactModal(); closeMenu() }"
      >
        Contact
      </button>

      <CartLink
        class="burger-menu__item"
        @navigate="closeMenu"
      />
    </nav>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { navItems, shopCategories, homeItem } from "../navigationConfig";
import { CartLink } from '.';
import { useContactModal } from '@/features/contact-modal'

const { open: openContactModal } = useContactModal()

const props = defineProps<{
  isOpen: boolean;
  triggerRef?: HTMLElement | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const shopOpen = ref(false);
const navRef = ref<HTMLElement | null>(null);

const isShopActive = computed(() => route.path.startsWith("/shop"));

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nextTick(() => navRef.value?.focus());
    } else {
      shopOpen.value = false;
      nextTick(() => props.triggerRef?.focus());
    }
  },
);

function closeMenu() {
  emit("close");
}

function toggleShop() {
  shopOpen.value = !shopOpen.value
}

</script>

<style scoped lang="scss">
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.burger-menu {
  position: relative;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  z-index: var(--z-dropdown);
  padding: 0.375rem 0 0.25rem;

  &__group {
    border-bottom: 1px solid var(--color-border);
  }

  &__item {
    display: block;
    padding: 0.8rem 1.375rem;
    font-family: var(--font-display);
    font-size: var(--fs-base);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    transition:
      color 0.2s ease,
      transform 0.2s ease;
    transform-origin: left center;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      color: var(--color-accent);
      transform: scale(1.02);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    &--active {
      font-style: italic;
      color: var(--color-accent);
    }

    &--btn {
      width: 100%;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
    }

    &--toggle {
      width: 100%;
      background: none;
      border: none;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-right: 1.125rem;
      transform: none;

      &:hover {
        transform: none;
      }
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

  &__subitem {
    display: block;
    padding: 0.75rem 1.375rem 0.75rem 2.25rem;
    font-family: var(--font-display);
    font-size: var(--fs-base);
    color: var(--color-text-muted);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border);
    transition:
      color 0.2s ease,
      transform 0.2s ease;
    transform-origin: left center;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      color: var(--color-accent);
      transform: scale(1.02);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    &--active {
      font-style: italic;
      color: var(--color-accent);
    }
  }

}
</style>
