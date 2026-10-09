<template>
  <div
    class="category-description"
    v-html="safeText"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'isomorphic-dompurify'
import { plainTextToHtml } from '@/shared'

const props = defineProps<{ text: string }>()

const safeText = computed(() =>
  DOMPurify.sanitize(plainTextToHtml(props.text), {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: [],
  }),
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.category-description {
  max-width: 760px;
  margin: 3rem auto 0;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--color-text-muted);

  @include desktop {
    font-size: var(--fs-md);
  }

  :deep(p) {
    margin-bottom: 1rem;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }
}
</style>
