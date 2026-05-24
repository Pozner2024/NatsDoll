<template>
  <HeartButton
    :active="isActive"
    :busy="isBusy"
    :size="size"
    :variant="variant"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HeartButton } from '@/shared'
import { useAuthStore } from '@/entities/user'
import { useFavoritesStore } from '@/entities/favorites'
import { useAuthModal } from '@/features/auth-modal'
import type { Product } from '@/entities/product'

const props = withDefaults(defineProps<{
  product: Product
  size?: 'sm' | 'md'
  variant?: 'overlay' | 'inline'
}>(), {
  size: 'sm',
  variant: 'overlay',
})

const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const authModal = useAuthModal()

const isActive = computed(() => favoritesStore.isFavorite(props.product.id))
const isBusy = computed(() => favoritesStore.isToggling(props.product.id))

async function onClick() {
  if (!authStore.isLoggedIn) {
    authModal.open('login')
    return
  }
  try {
    await favoritesStore.toggle(props.product)
  } catch {
    // ошибка уже сохранена в стор; UI откатится сам
  }
}
</script>
