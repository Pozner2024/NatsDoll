<!-- apps/web/src/App.vue -->
<template>
  <div id="app">
    <AppHeader />
    <main>
      <router-view />
    </main>
    <AppFooter />
    <ContactModal />
    <AuthModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { AppHeader } from '@/widgets/app-header'
import { AppFooter } from '@/widgets/app-footer'
import { ContactModal } from '@/features/contact-modal'
import { AuthModal } from '@/features/auth-modal'
import { useAuthStore } from '@/features/auth'

const authStore = useAuthStore()
onMounted(() => { authStore.initAuth() })
</script>
