<template>
  <GalleryPage />
</template>

<script setup lang="ts">
import { useSeoMeta, useHead, useRuntimeConfig } from 'nuxt/app'
import GalleryPage from '@/pages/GalleryPage.vue'
import { DEFAULT_OG_IMAGE } from '@/shared'

definePageMeta({ name: 'gallery' })

const siteUrl = useRuntimeConfig().public.siteUrl
const title = 'The Gallery — NatsDoll'
const description =
  'Explore collections of handmade polymer clay art dolls and miniatures — every piece is one of a kind, sculpted and painted by hand.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${siteUrl}/gallery`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
useHead({ link: [{ rel: 'canonical', href: `${siteUrl}/gallery` }] })
</script>
