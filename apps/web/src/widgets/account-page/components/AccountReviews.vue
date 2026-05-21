<template>
  <section class="account-reviews">
    <h2 class="account-reviews__title">Reviews</h2>

    <div class="account-reviews__empty">
      <svg class="account-reviews__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <p>No reviews yet</p>
      <p class="account-reviews__hint">After receiving your order you can leave a review</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.account-reviews {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
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

  &__hint {
    font-size: 0.8rem;
  }
}
</style>
