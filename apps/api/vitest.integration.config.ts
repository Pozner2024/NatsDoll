import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.int.test.ts'],
    // globalSetup — один раз на прогон: проверяет тестовый DATABASE_URL и накатывает миграции.
    globalSetup: ['./tests/integration/globalSetup.ts'],
    // setupFiles — в каждом воркере: валидирует DATABASE_URL (предохранитель) + секреты для tokens.ts.
    setupFiles: ['./tests/integration/setup.ts'],
    // Общая БД на весь прогон — гоняем строго последовательно, чтобы тесты
    // не затирали друг другу таблицы при truncate.
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
