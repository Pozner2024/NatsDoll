<template>
  <section class="account-addresses">
    <h2 class="account-addresses__title">
      Addresses
    </h2>

    <div class="account-addresses__empty">
      <svg
        class="account-addresses__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
        <circle
          cx="12"
          cy="10"
          r="3"
        />
      </svg>
      <p>No saved addresses</p>
      <p class="account-addresses__hint">
        Saved addresses will be pre-filled at checkout
      </p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.account-addresses {
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
