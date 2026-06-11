<template>
  <ShopPage />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useHead, useRuntimeConfig } from 'nuxt/app'
import ShopPage from '@/pages/ShopPage.vue'
import { useCategoryStore } from '@/entities/category'
import { DEFAULT_OG_IMAGE } from '@/shared'

definePageMeta({ name: 'shop' })

const siteUrl = useRuntimeConfig().public.siteUrl
const route = useRoute()
const categoryStore = useCategoryStore()

const categoryName = computed(() => {
  const slug = route.params.category
  if (typeof slug !== 'string' || slug.length === 0) return null
  return categoryStore.categories.find((c) => c.slug === slug)?.name ?? null
})
const title = computed(() =>
  categoryName.value ? `${categoryName.value} — NatsDoll` : 'The Shop — NatsDoll',
)
const description = computed(() =>
  categoryName.value
    ? `Handmade polymer clay ${categoryName.value.toLowerCase()} by NatsDoll. Every piece is sculpted and painted by hand.`
    : 'Browse handmade polymer clay dolls, birthday gifts, Christmas ornaments and personalized keepsakes. Worldwide shipping.',
)
const canonical = computed(() => `${siteUrl}${route.path}`)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
</script>
