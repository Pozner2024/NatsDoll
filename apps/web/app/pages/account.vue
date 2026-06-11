<template>
  <AccountPage>
    <NuxtPage :transition="false" />
  </AccountPage>
</template>

<script setup lang="ts">
import { AccountPage } from '@/widgets/account-page'

definePageMeta({ middleware: 'auth' })
</script>
