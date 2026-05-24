<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="closed">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c5 0 9 4 10 6-.4.8-1.4 2.2-2.9 3.5" />
      <path d="M6.3 7.5C4 9 2.4 11.2 2 12c1 2 5 6 10 6 1.7 0 3.3-.5 4.7-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </template>
    <template v-else>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ closed?: boolean }>()
</script>
