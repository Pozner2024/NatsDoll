<template>
  <NewsletterConfirmPage />
</template>

<script setup lang="ts">
import NewsletterConfirmPage from '@/pages/NewsletterConfirmPage.vue'

definePageMeta({ name: 'newsletter-confirm' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>
