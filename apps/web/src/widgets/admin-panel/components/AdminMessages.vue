<template>
  <div class="admin-messages">
    <AdminTopbar
      title="Messages"
      subtitle="Customer conversations"
    />

    <div
      v-if="convsError"
      class="admin-messages__error"
    >
      {{ convsError }}
      <button @click="convsRefresh">
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-messages__body"
      :class="{ 'admin-messages__body--thread-open': !!selectedUserId && isMobile }"
    >
      <div class="admin-messages__sidebar">
        <div
          v-if="convsLoading && conversations.length === 0"
          class="admin-messages__loading"
        >
          Loading…
        </div>
        <div
          v-else-if="conversations.length === 0"
          class="admin-messages__placeholder"
        >
          No messages yet
        </div>
        <ConversationList
          v-else
          :conversations="conversations"
          :selected-user-id="selectedUserId"
          @select="handleSelect"
        />
      </div>

      <div class="admin-messages__main">
        <div
          v-if="threadError"
          class="admin-messages__error"
        >
          {{ threadError }}
        </div>
        <div
          v-else-if="threadLoading"
          class="admin-messages__loading"
        >
          Loading…
        </div>
        <ConversationThread
          v-else
          ref="threadRef"
          :thread="thread"
          :sending="sending"
          @reply="handleReply"
          @back="selectedUserId = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import ConversationList from './ConversationList.vue'
import ConversationThread from './ConversationThread.vue'
import {
  useConversations,
  useConversationThread,
  replyToUser,
  markConversationRead,
} from '../adminMessagesApi'

const MOBILE_BREAKPOINT = 768

const route = useRoute()
const selectedUserId = ref<string | null>(null)
const sending = ref(false)
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const threadRef = ref<InstanceType<typeof ConversationThread> | null>(null)

const { conversations, isLoading: convsLoading, error: convsError, refresh: convsRefresh } = useConversations()
const { thread, isLoading: threadLoading, error: threadError, reload: reloadThread } = useConversationThread(selectedUserId)

async function handleSelect(userId: string) {
  selectedUserId.value = userId
  await markConversationRead(userId)
  const conv = conversations.value.find((c) => c.userId === userId)
  if (conv) conv.unreadCount = 0
}

async function handleReply(payload: { text: string; orderId?: string }) {
  if (!selectedUserId.value) return
  sending.value = true
  try {
    await replyToUser({ userId: selectedUserId.value, ...payload })
    threadRef.value?.clearForm()
    await reloadThread()
    await convsRefresh()
  } catch (e) {
    threadRef.value?.setError(e instanceof Error ? e.message : 'Failed to send reply')
  } finally {
    sending.value = false
  }
}

function handleResize() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

onMounted(() => {
  convsRefresh()
  window.addEventListener('resize', handleResize)
  const preselect = route.query.userId
  if (typeof preselect === 'string' && preselect) {
    handleSelect(preselect)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-messages {
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
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__sidebar {
    width: 100%;
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    flex-shrink: 0;

    @include tablet {
      width: 260px;
    }
  }

  &__main {
    flex: 1;
    display: none;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    @include tablet {
      display: flex;
    }
  }

  &__body--thread-open {
    .admin-messages__sidebar {
      display: none;
    }

    .admin-messages__main {
      display: flex;
      width: 100%;
    }
  }

  &__loading,
  &__placeholder {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
}
</style>
