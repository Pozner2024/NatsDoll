<template>
  <div class="categories-section">
    <div class="categories-section__head">
      <span class="categories-section__title">Categories</span>
      <button
        class="categories-section__add"
        @click="startAdd"
      >
        + Add category
      </button>
    </div>

    <div
      v-if="error"
      class="categories-section__error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="isLoading && !categories.length"
      class="categories-section__empty"
    >
      Loading…
    </div>

    <ul
      v-else
      class="categories-section__list"
    >
      <li
        v-for="cat in categories"
        :key="cat.id"
        class="categories-section__item"
      >
        <template v-if="editingId === cat.id">
          <input
            v-model="editName"
            class="categories-section__input"
            @keydown.enter="saveEdit(cat.id)"
            @keydown.escape="cancelEdit"
          >
          <span class="categories-section__count">{{ cat.productCount }} products</span>
          <button
            class="categories-section__action categories-section__action--save"
            @click="saveEdit(cat.id)"
          >
            Save
          </button>
          <button
            class="categories-section__action"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </template>
        <template v-else>
          <span class="categories-section__name">{{ cat.name }}</span>
          <span class="categories-section__count">{{ cat.productCount }} products</span>
          <button
            class="categories-section__action categories-section__action--icon"
            @click="startEdit(cat)"
          >
            ✎
          </button>
          <button
            class="categories-section__action categories-section__action--icon categories-section__action--delete"
            @click="handleDelete(cat)"
          >
            ✕
          </button>
        </template>
      </li>

      <li
        v-if="addingNew"
        class="categories-section__item"
      >
        <input
          v-model="newName"
          class="categories-section__input"
          placeholder="Category name"
          @keydown.enter="saveNew"
          @keydown.escape="cancelAdd"
        >
        <button
          class="categories-section__action categories-section__action--save"
          @click="saveNew"
        >
          Save
        </button>
        <button
          class="categories-section__action"
          @click="cancelAdd"
        >
          Cancel
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAdminCategories } from '../adminCategoriesApi'
import type { AdminCategoryItem } from '../adminCategoriesApi'

const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useAdminCategories()

const editingId = ref<string | null>(null)
const editName = ref('')
const addingNew = ref(false)
const newName = ref('')

function startEdit(cat: AdminCategoryItem) {
  editingId.value = cat.id
  editName.value = cat.name
  addingNew.value = false
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
}

async function saveEdit(id: string) {
  if (!editName.value.trim()) return
  await updateCategory(id, editName.value.trim())
  cancelEdit()
}

function startAdd() {
  addingNew.value = true
  newName.value = ''
  editingId.value = null
}

function cancelAdd() {
  addingNew.value = false
  newName.value = ''
}

async function saveNew() {
  if (!newName.value.trim()) return
  await createCategory(newName.value.trim())
  cancelAdd()
}

async function handleDelete(cat: AdminCategoryItem) {
  if (cat.productCount > 0) {
    if (!confirm(`"${cat.name}" has ${cat.productCount} products. Are you sure?`)) return
  }
  await deleteCategory(cat.id)
}
</script>

<style scoped lang="scss">
.categories-section {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__head {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__add {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
    font-weight: 500;
    background: none;
    border: none;
  }

  &__error,
  &__empty {
    padding: 16px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
  }

  &__list {
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    gap: 10px;
    border-bottom: 1px solid var(--color-bg);

    &:last-child {
      border-bottom: none;
    }

    &:nth-child(even) {
      background: var(--color-bg);
    }
  }

  &__name {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__count {
    font-size: 0.7rem;
    color: var(--color-border);
    white-space: nowrap;
  }

  &__input {
    flex: 1;
    font-size: 0.8rem;
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    padding: 2px 8px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
  }

  &__action {
    font-size: 0.72rem;
    background: none;
    border: none;
    color: var(--color-text-muted);
    white-space: nowrap;

    &--save {
      color: var(--color-accent);
      font-weight: 600;
    }

    &--icon {
      font-size: 0.85rem;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }

    &--delete {
      color: var(--color-error);
    }
  }
}
</style>
