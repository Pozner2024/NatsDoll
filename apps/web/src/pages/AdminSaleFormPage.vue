<template>
  <div class="sale-form-page">
    <div class="sale-form-page__topbar">
      <RouterLink
        to="/admin/sales"
        class="sale-form-page__back"
      >
        ← Sales
      </RouterLink>
      <h1 class="sale-form-page__title">
        {{ isEdit ? 'Edit sale' : 'New sale' }}
      </h1>
    </div>

    <form
      class="sale-form-page__form"
      @submit.prevent="handleSubmit"
    >
      <div class="sale-form-page__field">
        <label class="sale-form-page__label">
          Name
          <input
            v-model="form.name"
            class="sale-form-page__input"
            placeholder="e.g. Summer Sale"
            required
          />
        </label>
      </div>

      <div class="sale-form-page__row">
        <label class="sale-form-page__label">
          Discount
          <div class="sale-form-page__input-group">
            <input
              v-model.number="form.discount"
              type="number"
              min="1"
              max="99"
              class="sale-form-page__input sale-form-page__input--narrow"
              required
            />
            <span class="sale-form-page__input-suffix">%</span>
          </div>
        </label>
        <label class="sale-form-page__label">
          Start date
          <input
            v-model="form.startsAt"
            type="date"
            class="sale-form-page__input"
            required
          />
        </label>
        <label class="sale-form-page__label">
          End date
          <input
            v-model="form.endsAt"
            type="date"
            class="sale-form-page__input"
            required
          />
        </label>
      </div>

      <div class="sale-form-page__field">
        <p class="sale-form-page__label">Applies to</p>
        <div class="sale-form-page__radios">
          <label class="sale-form-page__radio">
            <input
              v-model="form.scope"
              type="radio"
              value="ALL"
            />
            All products
          </label>
          <label class="sale-form-page__radio">
            <input
              v-model="form.scope"
              type="radio"
              value="CATEGORIES"
            />
            Categories
          </label>
          <label class="sale-form-page__radio">
            <input
              v-model="form.scope"
              type="radio"
              value="PRODUCTS"
            />
            Specific products
          </label>
        </div>

        <div
          v-if="form.scope === 'CATEGORIES'"
          class="sale-form-page__chips"
        >
          <label
            v-for="cat in categories"
            :key="cat.id"
            class="sale-form-page__chip"
            :class="{ 'sale-form-page__chip--selected': form.categoryIds.includes(cat.id) }"
          >
            <input
              type="checkbox"
              :value="cat.id"
              :checked="form.categoryIds.includes(cat.id)"
              class="sale-form-page__chip-check"
              @change="toggleCategory(cat.id)"
            />
            {{ cat.name }}
          </label>
        </div>

        <div
          v-if="form.scope === 'PRODUCTS'"
          class="sale-form-page__product-picker"
        >
          <button
            type="button"
            class="sale-form-page__pick-btn"
            @click="showPicker = true"
          >
            Pick products ({{ form.productIds.length }} selected)
          </button>
        </div>
      </div>

      <div
        v-if="previewCount !== null"
        class="sale-form-page__preview"
      >
        {{ previewCount }} product{{ previewCount === 1 ? '' : 's' }} will be discounted
      </div>

      <div
        v-if="saveError"
        class="sale-form-page__save-error"
      >
        {{ saveError }}
      </div>

      <div class="sale-form-page__footer">
        <RouterLink
          to="/admin/sales"
          class="sale-form-page__cancel"
        >
          Cancel
        </RouterLink>
        <button
          type="submit"
          class="sale-form-page__save"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>

    <div
      v-if="showPicker"
      class="sale-form-page__picker-overlay"
      @click.self="showPicker = false"
    >
      <div class="sale-form-page__picker">
        <div class="sale-form-page__picker-header">
          <span>Select products</span>
          <button
            type="button"
            class="sale-form-page__picker-done"
            @click="showPicker = false"
          >
            Done
          </button>
        </div>
        <input
          v-model="pickerSearch"
          class="sale-form-page__input"
          placeholder="Search…"
        />
        <div class="sale-form-page__picker-list">
          <label
            v-for="product in filteredPickerProducts"
            :key="product.id"
            class="sale-form-page__picker-item"
          >
            <input
              type="checkbox"
              :value="product.id"
              :checked="form.productIds.includes(product.id)"
              @change="toggleProduct(product.id)"
            />
            {{ product.name }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { authFetch } from '@/shared'
import { saveSale, fetchSalePreviewCount, SaleRecordSchema } from '@/widgets/admin-panel/adminSalesApi'
import type { SaleScope } from '@/widgets/admin-panel/adminSalesApi'

const route = useRoute()
const router = useRouter()

const id = computed(() => (route.params.id as string) || null)
const isEdit = computed(() => !!id.value)

const form = reactive({
  name: '',
  discount: 20,
  startsAt: '',
  endsAt: '',
  scope: 'ALL' as SaleScope,
  categoryIds: [] as string[],
  productIds: [] as string[],
})

const categories = ref<{ id: string; name: string }[]>([])
const allProducts = ref<{ id: string; name: string }[]>([])
const pickerSearch = ref('')
const showPicker = ref(false)
const previewCount = ref<number | null>(null)
const isSaving = ref(false)
const saveError = ref<string | null>(null)

const filteredPickerProducts = computed(() => {
  const q = pickerSearch.value.toLowerCase()
  return allProducts.value.filter((p) => p.name.toLowerCase().includes(q))
})

async function loadCategories() {
  const res = await authFetch('/admin/categories')
  if (!res.ok) return
  const data = await res.json() as { id: string; name: string }[]
  categories.value = data
}

async function loadAllProducts() {
  const res = await authFetch('/admin/products?limit=200&page=1&status=published')
  if (!res.ok) return
  const data = await res.json() as { items: { id: string; name: string }[] }
  allProducts.value = data.items
}

async function loadExistingSale() {
  if (!id.value) return
  const res = await authFetch('/admin/sales')
  if (!res.ok) return
  const all = z.array(SaleRecordSchema).parse(await res.json())
  const sale = all.find((s) => s.id === id.value)
  if (!sale) return
  form.name = sale.name
  form.discount = sale.discount
  form.startsAt = sale.startsAt.slice(0, 10)
  form.endsAt = sale.endsAt.slice(0, 10)
  form.scope = sale.scope
  form.categoryIds = [...sale.categoryIds]
  form.productIds = [...sale.productIds]
}

function toggleCategory(catId: string) {
  const idx = form.categoryIds.indexOf(catId)
  if (idx === -1) form.categoryIds.push(catId)
  else form.categoryIds.splice(idx, 1)
}

function toggleProduct(productId: string) {
  const idx = form.productIds.indexOf(productId)
  if (idx === -1) form.productIds.push(productId)
  else form.productIds.splice(idx, 1)
}

async function refreshPreviewCount() {
  const count = await fetchSalePreviewCount({
    scope: form.scope,
    categoryIds: form.categoryIds,
    productIds: form.productIds,
  })
  previewCount.value = count
}

watch(() => [form.scope, form.categoryIds.length, form.productIds.length], refreshPreviewCount)

async function handleSubmit() {
  isSaving.value = true
  saveError.value = null
  const result = await saveSale(id.value, {
    name: form.name,
    discount: form.discount,
    startsAt: form.startsAt + 'T00:00:00.000Z',
    endsAt: form.endsAt + 'T23:59:59.999Z',
    scope: form.scope,
    categoryIds: form.categoryIds,
    productIds: form.productIds,
  })
  isSaving.value = false
  if (!result.ok) {
    saveError.value = result.error ?? 'Failed to save'
    return
  }
  await router.push('/admin/sales')
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadAllProducts(), loadExistingSale()])
  await refreshPreviewCount()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.sale-form-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--color-bg);

  &__topbar {
    height: 56px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px;
    background: var(--color-white);
    flex-shrink: 0;

    @include tablet {
      padding: 0 32px;
    }
  }

  &__back {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    text-decoration: none;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__form {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 640px;

    @include tablet {
      padding: 24px 32px;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__input {
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 10px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);

    &--narrow {
      width: 72px;
    }
  }

  &__input-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__input-suffix {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__radios {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__radio {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--color-text);
  }

  &__chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  &__chip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 4px 12px;
    background: var(--color-white);
    color: var(--color-text);

    &--selected {
      background: var(--color-accent);
      color: var(--color-white);
      border-color: var(--color-accent);
    }
  }

  &__chip-check {
    display: none;
  }

  &__product-picker {
    margin-top: 8px;
  }

  &__pick-btn {
    font-size: 0.78rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 6px 14px;
    background: var(--color-white);
    color: var(--color-text);
  }

  &__preview {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    padding: 8px 12px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }

  &__save-error {
    font-size: 0.8rem;
    color: #c0392b;
    background: rgb(192 57 43 / 0.06);
    border: 1px solid rgb(192 57 43 / 0.25);
    border-radius: 6px;
    padding: 8px 12px;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 4px;
  }

  &__cancel {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    text-decoration: none;
  }

  &__save {
    font-size: 0.8rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 6px;
    padding: 8px 20px;
    font-weight: 600;
    border: none;

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__picker-overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.4);
    z-index: 200;
    display: flex;
    align-items: flex-end;

    @include tablet {
      align-items: center;
      justify-content: center;
    }
  }

  &__picker {
    background: var(--color-white);
    border-radius: 12px 12px 0 0;
    width: 100%;
    max-height: 70vh;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @include tablet {
      border-radius: 8px;
      width: 420px;
      max-height: 60vh;
    }
  }

  &__picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    font-weight: 600;
  }

  &__picker-done {
    font-size: 0.78rem;
    color: var(--color-accent);
    background: none;
    border: none;
    font-weight: 600;
  }

  &__picker-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    max-height: 40vh;
  }

  &__picker-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--color-text);
    padding: 4px 0;
  }
}
</style>
