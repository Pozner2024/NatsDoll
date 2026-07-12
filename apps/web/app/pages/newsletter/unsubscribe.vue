<template>
  <NewsletterUnsubscribePage />
</template>

<script setup lang="ts">
import NewsletterUnsubscribePage from '@/pages/NewsletterUnsubscribePage.vue'

definePageMeta({ name: 'newsletter-unsubscribe' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>
