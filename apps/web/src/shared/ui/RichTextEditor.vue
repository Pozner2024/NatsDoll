<template>
  <div class="rich-text-editor">
    <div class="rich-text-editor__toolbar">
      <button
        type="button"
        class="rich-text-editor__btn"
        :class="{ 'rich-text-editor__btn--active': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        class="rich-text-editor__btn"
        :class="{ 'rich-text-editor__btn--active': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        class="rich-text-editor__btn"
        :class="{ 'rich-text-editor__btn--active': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        •≡
      </button>
      <button
        type="button"
        class="rich-text-editor__btn"
        :class="{ 'rich-text-editor__btn--active': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        1≡
      </button>
    </div>
    <EditorContent
      class="rich-text-editor__content"
      :editor="editor"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate({ editor: e }) {
    emit('update:modelValue', e.getHTML())
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && editor.value.getHTML() !== val) {
      editor.value.commands.setContent(val, { emitUpdate: false })
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped lang="scss">
.rich-text-editor {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  text-transform: none;
  letter-spacing: normal;

  &__toolbar {
    display: flex;
    gap: 2px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    border-radius: 6px 6px 0 0;
  }

  &__btn {
    font-size: 0.8rem;
    padding: 3px 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    color: var(--color-text);
    font-family: var(--font-display);
    line-height: 1.4;

    &:hover {
      background: var(--color-border);
    }

    &--active {
      background: var(--color-accent);
      color: var(--color-white);
    }
  }

  &__content {
    padding: 8px 10px;
    font-size: 0.85rem;
    font-weight: normal;
    line-height: 1.6;
    color: var(--color-text);
    min-height: 240px;

    :deep(.ProseMirror) {
      outline: none;
      min-height: 240px;

      p { margin: 0 0 0.5em; }
      p:last-child { margin-bottom: 0; }
      ul, ol { padding-left: 1.4em; margin: 0 0 0.5em; }
      li { margin-bottom: 0.2em; }
    }
  }
}
</style>
