<template>
  <img
    ref="imgRef"
    :src="src"
    :alt="alt"
    class="app-image"
    :class="{ 'app-image--fade': fade, 'app-image--loaded': loaded }"
    @load="loaded = true"
  >
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{ src: string; alt: string }>()

const imgRef = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const fade = ref(false)

onMounted(() => {
  fade.value = true
  if (imgRef.value?.complete) loaded.value = true
})
</script>

<style scoped lang="scss">
.app-image {
  display: block;

  &--fade {
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &--fade.app-image--loaded {
    opacity: 1;
  }
}
</style>
