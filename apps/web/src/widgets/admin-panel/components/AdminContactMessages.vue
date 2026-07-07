<template>
  <div class="admin-contact-messages">
    <AdminTopbar
      title="Contact Messages"
      subtitle="Submissions from the contact form"
    />

    <div
      v-if="error"
      class="admin-contact-messages__error"
    >
      {{ error }}
      <button @click="refresh">
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-contact-messages__body"
    >
      <div
        v-if="isLoading && items.length === 0"
        class="admin-contact-messages__loading"
      >
        Loading…
      </div>

      <div
        v-else-if="items.length === 0"
        class="admin-contact-messages__empty"
      >
        No messages yet
      </div>

      <div
        v-for="item in items"
        v-else
        :key="item.id"
        class="admin-contact-messages__item"
      >
        <div class="admin-contact-messages__item-header">
          <span class="admin-contact-messages__item-name">{{ item.name }}</span>
          <span class="admin-contact-messages__item-date">{{ formatDate(item.createdAt) }}</span>
        </div>
        <a
          class="admin-contact-messages__item-email"
          :href="`mailto:${item.email}`"
        >{{ item.email }}</a>
        <p class="admin-contact-messages__item-text">
          {{ item.message }}
        </p>
      </div>

      <div
        v-if="totalPages > 1"
        class="admin-contact-messages__pagination"
      >
        <button
          class="admin-contact-messages__page-btn"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          ← Prev
        </button>
        <span class="admin-contact-messages__page-info">{{ page }} / {{ totalPages }}</span>
        <button
          class="admin-contact-messages__page-btn"
          :disabled="page >= totalPages"
          @click="page += 1"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { formatDate } from '@/shared'
import AdminTopbar from './AdminTopbar.vue'
import { useAdminContactMessages } from '../adminContactMessagesApi'

const { data, isLoading, error, page, refresh } = useAdminContactMessages()

const items = computed(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)

onMounted(refresh)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-contact-messages {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  &__error {
    padding: 1.5rem;
    color: var(--color-error);
    font-size: 0.9rem;

    button {
      margin-left: 0.75rem;
      background: none;
      border: 1px solid var(--color-error);
      color: var(--color-error);
      border-radius: 4px;
      padding: 0.2rem 0.6rem;
      font-size: 0.8rem;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;

    @include tablet {
      padding: 1.5rem 2rem;
    }
  }

  &__loading,
  &__empty {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    margin-bottom: 0.9rem;
    background: var(--color-white);
  }

  &__item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
  }

  &__item-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__item-date {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__item-email {
    display: inline-block;
    font-size: 0.8rem;
    color: var(--color-accent-hover);
    margin-bottom: 0.5rem;
  }

  &__item-text {
    font-size: 0.85rem;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
  }

  &__page-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.78rem;
    color: var(--color-text);

    &:disabled {
      opacity: 0.4;
    }

    &:not(:disabled):hover {
      background: var(--color-border);
    }
  }

  &__page-info {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }
}
</style>
