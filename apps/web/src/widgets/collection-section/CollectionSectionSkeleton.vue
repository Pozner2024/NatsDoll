<template>
  <div
    class="collection-skeleton"
    aria-hidden="true"
  >
    <div class="collection-skeleton__label" />
    <div class="collection-skeleton__title" />
    <div class="collection-skeleton__grid">
      <div class="collection-skeleton__cell collection-skeleton__cell--1" />
      <div class="collection-skeleton__cell collection-skeleton__cell--2" />
      <div class="collection-skeleton__cell collection-skeleton__cell--3" />
      <div class="collection-skeleton__cell collection-skeleton__cell--4" />
      <div class="collection-skeleton__cell collection-skeleton__cell--5" />
      <div class="collection-skeleton__cell collection-skeleton__cell--6" />
      <div class="collection-skeleton__cell collection-skeleton__cell--7" />
      <div class="collection-skeleton__cell collection-skeleton__cell--8" />
      <div class="collection-skeleton__cell collection-skeleton__cell--9" />
      <div class="collection-skeleton__cell collection-skeleton__cell--10" />
      <div class="collection-skeleton__cell collection-skeleton__cell--11" />
      <div class="collection-skeleton__cell collection-skeleton__cell--12" />
      <div class="collection-skeleton__cell collection-skeleton__cell--13" />
      <div class="collection-skeleton__cell collection-skeleton__cell--14" />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
$shimmer: linear-gradient(
  90deg,
  var(--color-border) 25%,
  rgb(from var(--color-border) r g b / 0.5) 50%,
  var(--color-border) 75%
);

.collection-skeleton {
  width: 100%;

  &__label {
    width: 80px;
    height: 12px;
    border-radius: 4px;
    margin: 24px 20px 8px;
    background: $shimmer;
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__title {
    width: 160px;
    height: 28px;
    border-radius: 4px;
    margin: 0 20px 12px;
    background: $shimmer;
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(10, 1fr);
    gap: 2px;
    aspect-ratio: 3 / 10;
    grid-template-areas:
      "m1  m1  m2"
      "m1  m1  m3"
      "m4  m5  m3"
      "m4  m6  m6"
      "m7  m6  m6"
      "m8  m8  m9"
      "m8  m8  m10"
      "m11 m12 m10"
      "m11 m13 m13"
      "m14 m13 m13";
  }

  &__cell {
    background: $shimmer;
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;

    @for $i from 1 through 14 {
      &--#{$i} { grid-area: m#{$i}; }
    }
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
