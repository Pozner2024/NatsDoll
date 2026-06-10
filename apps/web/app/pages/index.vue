<template>
  <section class="home-stub">
    <h1 class="home-stub__title">
      NatsDoll
    </h1>
    <p class="home-stub__note">
      Nuxt skeleton — SSR works
    </p>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.home-stub {
  padding: 2rem 1rem;

  &__title {
    color: var(--color-accent);
    font-family: var(--font-brand);
    font-size: var(--fs-logo);
  }

  &__note {
    color: var(--color-text-muted);
    font-size: var(--fs-sm);

    @include tablet {
      font-size: var(--fs-base);
    }
  }
}
</style>
