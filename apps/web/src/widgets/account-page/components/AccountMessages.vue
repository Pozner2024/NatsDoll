<template>
  <section class="account-messages">
    <h2 class="account-messages__title">
      Messages
    </h2>

    <div class="account-messages__empty">
      <svg
        class="account-messages__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <p>No messages yet</p>
      <p class="account-messages__hint">
        Messages about your orders will appear here
      </p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.account-messages {
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
