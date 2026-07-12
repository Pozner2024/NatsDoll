<template>
  <fieldset class="message-selector">
    <legend class="message-selector__legend">
      Personalization
    </legend>

    <ul class="message-selector__list">
      <li
        v-for="(option, i) in options"
        :key="`preset-${i}`"
        class="message-selector__item"
      >
        <label class="message-selector__label">
          <input
            type="radio"
            class="message-selector__radio"
            name="message"
            :value="option"
            :checked="!isCustom && selected === option"
            @change="selectPreset(option)"
          >
          <span class="message-selector__text">{{ option }}</span>
        </label>
      </li>

      <li class="message-selector__item">
        <label class="message-selector__label">
          <input
            type="radio"
            class="message-selector__radio"
            name="message"
            value="__custom__"
            :checked="isCustom"
            @change="selectCustom"
          >
          <span class="message-selector__text">Your own text</span>
        </label>
      </li>
    </ul>

    <textarea
      v-if="isCustom"
      ref="textareaRef"
      v-model="customText"
      class="message-selector__textarea"
      :maxlength="MAX_LENGTH"
      aria-label="Your own message"
      placeholder="Type your message…"
      rows="3"
      @input="emitChange"
    />

    <div
      v-if="isCustom"
      class="message-selector__counter"
    >
      {{ customText.length }} / {{ MAX_LENGTH }}
    </div>

    <p
      v-if="error"
      class="message-selector__error"
      role="alert"
    >
      {{ error }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const MAX_LENGTH = 100

const props = defineProps<{
  options: string[]
  error?: string
}>()

const emit = defineEmits<{
  change: [value: string | null]
}>()

const selected = ref<string | null>(null)
const isCustom = ref(false)
const customText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function selectPreset(value: string): void {
  selected.value = value
  isCustom.value = false
  customText.value = ''
  emit('change', value)
}

async function selectCustom(): Promise<void> {
  isCustom.value = true
  selected.value = null
  emit('change', customText.value.length > 0 ? customText.value : null)
  await nextTick()
  textareaRef.value?.focus()
}

function emitChange(): void {
  if (isCustom.value) {
    emit('change', customText.value.length > 0 ? customText.value : null)
  }
}

watch(() => props.options, () => {
  selected.value = null
  isCustom.value = false
  customText.value = ''
  emit('change', null)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.message-selector {
  border: none;
  padding: 0;
  margin: 0 0 1.25rem;

  &__legend {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__radio {
    accent-color: var(--color-accent);
  }

  &__text {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__textarea {
    width: 100%;
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 80px;
    background: rgb(var(--btn-gradient-light) / 0.25);

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }

  &__counter {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    text-align: right;
    margin-top: 0.25rem;
  }

  &__error {
    font-size: var(--fs-xs);
    color: rgb(180 30 30 / 1);
    margin-top: 0.35rem;
  }
}
</style>
