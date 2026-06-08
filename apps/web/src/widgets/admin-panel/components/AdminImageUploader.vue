<template>
  <div class="image-uploader">
    <div
      class="image-uploader__dropzone"
      :class="{ 'image-uploader__dropzone--over': isOver }"
      @dragover.prevent="isOver = true"
      @dragleave.prevent="isOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        multiple
        class="image-uploader__input"
        @change="onChange"
      />
      <button
        type="button"
        class="image-uploader__choose"
        :disabled="modelValue.length >= MAX_IMAGES"
        @click="inputRef?.click()"
      >
        Choose files
      </button>
      <span class="image-uploader__hint">
        or drag &amp; drop · up to {{ MAX_IMAGES }} · max {{ MAX_MB }}MB each
      </span>
    </div>

    <p
      v-if="error"
      class="image-uploader__error"
    >
      {{ error }}
    </p>

    <ul
      v-if="modelValue.length"
      class="image-uploader__grid"
    >
      <li
        v-for="(url, i) in modelValue"
        :key="url"
        class="image-uploader__item"
        draggable="true"
        @dragstart="dragIndex = i"
        @dragover.prevent
        @drop="onReorder(i)"
      >
        <img
          :src="url"
          class="image-uploader__thumb"
          alt=""
        />
        <span
          v-if="i === 0"
          class="image-uploader__main"
        >
          Main
        </span>
        <button
          type="button"
          class="image-uploader__remove"
          @click="remove(i)"
        >
          ✕
        </button>
      </li>
    </ul>

    <p
      v-if="uploadingCount > 0"
      class="image-uploader__status"
    >
      Uploading… ({{ uploadingCount }})
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { authFetch, apiErrorMessage } from '@/shared'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{
  'update:modelValue': [string[]]
  'update:uploading': [boolean]
}>()

const MAX_IMAGES = 10
const MAX_MB = 25
const MAX_BYTES = MAX_MB * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const inputRef = ref<HTMLInputElement | null>(null)
const isOver = ref(false)
const error = ref<string | null>(null)
const uploadingCount = ref(0)
const dragIndex = ref<number | null>(null)

watch(uploadingCount, (n) => emit('update:uploading', n > 0))

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) handleFiles(Array.from(input.files))
  input.value = ''
}

function onDrop(e: DragEvent) {
  isOver.value = false
  if (e.dataTransfer?.files) handleFiles(Array.from(e.dataTransfer.files))
}

async function handleFiles(files: File[]) {
  error.value = null
  let current = [...props.modelValue]
  for (const file of files) {
    if (current.length >= MAX_IMAGES) {
      error.value = `Maximum ${MAX_IMAGES} images`
      break
    }
    if (!ALLOWED.includes(file.type)) {
      error.value = `Unsupported file type: ${file.name}`
      continue
    }
    if (file.size > MAX_BYTES) {
      error.value = `File is too large: ${file.name}`
      continue
    }
    const url = await uploadOne(file)
    if (url) {
      current = [...current, url]
      emit('update:modelValue', current)
    }
  }
}

async function uploadOne(file: File): Promise<string | null> {
  uploadingCount.value++
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authFetch('/admin/products/images', { method: 'POST', body: formData })
    if (!res.ok) {
      error.value = await apiErrorMessage(res, `Failed to upload ${file.name}`)
      return null
    }
    const { url } = await res.json() as { url: string }
    return url
  } catch {
    error.value = `Failed to upload ${file.name}`
    return null
  } finally {
    uploadingCount.value--
  }
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onReorder(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const next = [...props.modelValue]
  const [moved] = next.splice(dragIndex.value, 1)
  next.splice(targetIndex, 0, moved!)
  dragIndex.value = null
  emit('update:modelValue', next)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px;
    border: 1px dashed var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    text-align: center;

    &--over {
      border-color: var(--color-accent);
    }
  }

  &__input {
    display: none;
  }

  &__choose {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: var(--font-display);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 18px;
    background: var(--color-white);
    color: var(--color-text);

    &:disabled {
      opacity: 0.5;
    }
  }

  &__hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__error {
    font-size: 0.8rem;
    color: var(--color-error);
  }

  &__status {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__item {
    position: relative;
    width: 88px;
    height: 88px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }

  &__thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__main {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
    padding: 2px 0;
    color: var(--color-white);
    background: rgb(0 0 0 / 0.55);
  }

  &__remove {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    font-size: 0.65rem;
    color: var(--color-white);
    background: rgb(0 0 0 / 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
