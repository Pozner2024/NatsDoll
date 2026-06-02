<template>
  <div class="conv-list">
    <div
      v-for="conv in conversations"
      :key="conv.userId"
      class="conv-list__item"
      :class="{ 'conv-list__item--active': conv.userId === selectedUserId }"
      @click="$emit('select', conv.userId)"
    >
      <div class="conv-list__header">
        <span class="conv-list__name">{{ conv.userName }}</span>
        <span class="conv-list__date">{{ formatDate(conv.lastMessageAt) }}</span>
      </div>
      <div class="conv-list__subheader">
        <span class="conv-list__email">{{ conv.userEmail }}</span>
        <span
          v-if="conv.unreadCount > 0"
          class="conv-list__badge"
        >{{ conv.unreadCount }}</span>
      </div>
      <p class="conv-list__preview">
        {{ conv.lastMessageText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/shared'
import type { ConversationPreview } from '../adminMessagesApi'

defineProps<{
  conversations: ConversationPreview[]
  selectedUserId: string | null
}>()

defineEmits<{
  select: [userId: string]
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.conv-list {
  overflow-y: auto;
  height: 100%;

  &__item {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.08);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.12);
      border-left: 3px solid var(--color-accent);
      padding-left: calc(1rem - 3px);
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  &__name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__date {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__subheader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }

  &__email {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__badge {
    background: var(--color-accent);
    color: var(--color-white);
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    flex-shrink: 0;
  }

  &__preview {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
