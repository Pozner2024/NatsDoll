<template>
  <AdminPanel>
    <NuxtPage :transition="false" />
  </AdminPanel>
</template>

<script setup lang="ts">
import { AdminPanel } from '@/widgets/admin-panel'

definePageMeta({ middleware: 'admin' })
</script>
