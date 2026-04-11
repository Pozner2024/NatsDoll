<template>
  <div id="app">
    <AppHeader />
    <router-view />
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { AppHeader } from '@/widgets/app-header'
import { AppFooter } from '@/widgets/app-footer'
</script>
