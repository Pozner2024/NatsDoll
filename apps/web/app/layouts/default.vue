<template>
  <div class="app-shell">
    <a
      class="skip-link"
      href="#main"
    >Skip to content</a>
    <AppHeader />
    <main
      id="main"
      tabindex="-1"
    >
      <slot />
    </main>
    <AppFooter />
    <ContactModal />
    <AuthModal />
    <CartPromptModal />
    <AppToaster />
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from 'nuxt/app'
import { AppHeader } from '@/widgets/app-header'
import { AppFooter } from '@/widgets/app-footer'
import { ContactModal } from '@/features/contact-modal'
import { AuthModal } from '@/features/auth-modal'
import { CartPromptModal } from '@/features/cart-prompt-modal'
import { AppToaster } from '@/shared'
import { useCategoryStore } from '@/entities/category'

const categoryStore = useCategoryStore()
useAsyncData('nav-categories', async () => {
  await categoryStore.load()
  return true
})
</script>

<style>
main {
  min-height: calc(100dvh - var(--header-height));
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: var(--z-lightbox);
  padding: 0.5rem 1rem;
  background: var(--color-text);
  color: var(--color-bg);
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

.page-enter-active {
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.page-leave-active {
  transition: opacity 0.2s ease-in;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.page-leave-to {
  opacity: 0;
}
</style>
