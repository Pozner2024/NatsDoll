<template>
  <HomePage />
</template>

<script setup lang="ts">
import { useSeoMeta, useHead, useRuntimeConfig } from 'nuxt/app'
import HomePage from '@/pages/HomePage.vue'
import { DEFAULT_OG_IMAGE } from '@/shared'

definePageMeta({ name: 'home' })

const siteUrl = useRuntimeConfig().public.siteUrl
const title = 'NatsDoll — Handmade Polymer Clay Dolls & Gifts'
const description =
  'Unique handmade art dolls and personalized gifts sculpted from polymer clay. One-of-a-kind pieces made with love by Natalia.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${siteUrl}/`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/` }],
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'NatsDoll',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/favicon-512.png`,
        sameAs: [
          'https://www.instagram.com/natsdoll_',
          'https://www.pinterest.com/natalyapoznyak/',
          'https://www.facebook.com/NatsDolls',
          'https://www.tiktok.com/@natsdoll_',
          'https://www.etsy.com/shop/GiftsQueenShop',
        ],
      }),
    },
  ],
})
</script>
