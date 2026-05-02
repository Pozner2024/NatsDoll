<template>
  <div
    class="error-bar"
    role="alert"
  >
    <p class="error-bar__text">{{ message }}</p>
    <button
      type="button"
      class="error-bar__btn"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ message?: string }>(),
  { message: "Couldn't load shop." },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped lang="scss">
.error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgb(192 57 43 / 0.08);
  border: 1px solid rgb(192 57 43 / 0.25);
  border-radius: 4px;

  &__text {
    color: var(--color-error);
    font-size: var(--fs-sm);
  }

  &__btn {
    padding: 0.4rem 1rem;
    background: var(--color-white);
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: 4px;
    font-size: var(--fs-sm);

    &:hover {
      background: var(--color-error);
      color: var(--color-white);
    }
  }
}
</style>
