<template>
  <section class="account-reviews">
    <div class="account-reviews__header">
      <h2 class="account-reviews__title">
        Reviews
      </h2>
      <button
        v-if="!showForm && store.reviewableItems.length > 0"
        class="account-reviews__add-btn"
        @click="showForm = true"
      >
        + Leave a review
      </button>
    </div>

    <p
      v-if="loading && reviews.length === 0"
      class="account-reviews__status"
    >
      Loading…
    </p>

    <p
      v-else-if="store.error"
      class="account-reviews__status account-reviews__status--error"
    >
      {{ store.error }}
    </p>

    <template v-else>
      <form
        v-if="showForm"
        class="account-reviews__form"
        @submit.prevent="submitForm"
      >
        <h3 class="account-reviews__form-title">
          Leave a review
        </h3>

        <div class="account-reviews__field">
          <label
            for="review-product"
            class="account-reviews__label"
          >Product</label>
          <select
            id="review-product"
            v-model="selectedKey"
            class="account-reviews__select"
            required
          >
            <option
              value=""
              disabled
            >
              Select a product
            </option>
            <option
              v-for="item in store.reviewableItems"
              :key="item.productId + item.orderId"
              :value="item.productId + '|' + item.orderId"
            >
              {{ item.productName }}
            </option>
          </select>
        </div>

        <div class="account-reviews__field">
          <label
            id="review-rating-label"
            class="account-reviews__label"
          >Rating</label>
          <div
            class="account-reviews__stars"
            role="radiogroup"
            aria-labelledby="review-rating-label"
          >
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              role="radio"
              class="account-reviews__star"
              :class="{ 'account-reviews__star--active': n <= rating }"
              :aria-label="`${n} star${n > 1 ? 's' : ''}`"
              :aria-checked="n === rating"
              :tabindex="n === (rating || 1) ? 0 : -1"
              @click="rating = n"
              @keydown="onStarKeydown($event, n)"
            >
              ★
            </button>
          </div>
        </div>

        <div class="account-reviews__field">
          <label
            for="review-comment"
            class="account-reviews__label"
          >Comment <span class="account-reviews__optional">(optional)</span></label>
          <textarea
            id="review-comment"
            v-model="comment"
            class="account-reviews__textarea"
            rows="3"
            placeholder="Share your experience…"
          />
        </div>

        <p
          v-if="formError"
          class="account-reviews__hint account-reviews__hint--error"
          role="alert"
        >
          {{ formError }}
        </p>

        <div class="account-reviews__form-actions">
          <AppButton
            type="submit"
            :disabled="!selectedKey || rating === 0 || formSaving"
          >
            {{ formSaving ? 'Submitting…' : 'Submit review' }}
          </AppButton>
          <button
            type="button"
            class="account-reviews__cancel-btn"
            @click="closeForm"
          >
            Cancel
          </button>
        </div>
      </form>

      <div
        v-if="reviews.length > 0"
        class="account-reviews__list"
      >
        <div
          v-for="review in reviews"
          :key="review.id"
          class="account-reviews__card"
        >
          <div class="account-reviews__card-image">
            <img
              v-if="review.productImage"
              :src="review.productImage"
              :alt="review.productName"
            >
            <span
              v-else
              class="account-reviews__card-image-placeholder"
            >?</span>
          </div>
          <div class="account-reviews__card-body">
            <p class="account-reviews__card-name">
              {{ review.productName }}
            </p>
            <div
              class="account-reviews__card-stars"
              role="img"
              :aria-label="`${review.rating} out of 5 stars`"
            >
              <span
                v-for="n in 5"
                :key="n"
                class="account-reviews__card-star"
                :class="{ 'account-reviews__card-star--active': n <= review.rating }"
                aria-hidden="true"
              >★</span>
            </div>
            <p
              v-if="review.comment"
              class="account-reviews__card-comment"
            >
              {{ review.comment }}
            </p>
            <p class="account-reviews__card-date">
              {{ formatDate(review.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-else-if="!showForm"
        class="account-reviews__empty"
      >
        <svg
          class="account-reviews__empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <p>No reviews yet</p>
        <p class="account-reviews__hint">
          After receiving your order you can leave a review
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, formatDate } from '@/shared'
import { useReviewStore } from '@/entities/review'

const store = useReviewStore()
const reviews = computed(() => store.reviews)
const loading = computed(() => store.loading)

const showForm = ref(false)
const selectedKey = ref('')
const rating = ref(0)
const comment = ref('')
const formSaving = ref(false)
const formError = ref('')

function onStarKeydown(e: KeyboardEvent, n: number) {
  let next: number | null = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = n < 5 ? n + 1 : 1
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = n > 1 ? n - 1 : 5
  if (next === null) return
  e.preventDefault()
  rating.value = next
  const star = (e.currentTarget as HTMLElement).parentElement?.children[next - 1]
  if (star instanceof HTMLElement) star.focus()
}

function closeForm() {
  showForm.value = false
  selectedKey.value = ''
  rating.value = 0
  comment.value = ''
  formError.value = ''
}

async function submitForm() {
  if (!selectedKey.value || rating.value === 0) return
  formError.value = ''
  formSaving.value = true
  try {
    const [productId, orderId] = selectedKey.value.split('|')
    await store.create({
      productId,
      orderId,
      rating: rating.value,
      comment: comment.value.trim() || undefined,
    })
    closeForm()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    formSaving.value = false
  }
}

onMounted(() => {
  store.load()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-reviews {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--color-text);
  }

  &__add-btn {
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 480px;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-bottom: 2rem;
  }

  &__form-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  &__select {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__stars {
    display: flex;
    gap: 0.25rem;
  }

  &__star {
    font-size: 2rem;
    color: var(--color-border);
    background: none;
    border: none;
    padding: 0;
    line-height: 1;
    transition: color 0.1s;

    &--active {
      color: var(--color-gold);
    }

    &:hover {
      color: var(--color-gold);
    }
  }

  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    resize: vertical;
    min-height: 80px;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__hint {
    font-size: 0.8rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__cancel-btn {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
  }

  &__card-image {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__card-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__card-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__card-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
  }

  &__card-stars {
    display: flex;
    gap: 0.1rem;
  }

  &__card-star {
    font-size: 1rem;
    color: var(--color-border);

    &--active {
      color: var(--color-gold);
    }
  }

  &__card-comment {
    font-size: 0.9rem;
    color: var(--color-text);
    margin-top: 0.2rem;
  }

  &__card-date {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }
}
</style>
