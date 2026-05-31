import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { MessageView, SendMessageData } from './types'
import { fetchMyMessages, postMessage } from './messageApi'

export const useMessageStore = defineStore('message', () => {
  const messages = ref<MessageView[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      messages.value = await fetchMyMessages()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load messages'
    } finally {
      loading.value = false
    }
  }

  async function send(data: SendMessageData): Promise<void> {
    await postMessage(data)
    await load()
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),
    load,
    send,
  }
})
