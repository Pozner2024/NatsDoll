import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Интеграционные тесты (tests/**, *.int.test.ts) гоняются отдельным конфигом
    // (vitest.integration.config.ts) с реальной БД — в быстрый юнит-прогон не тянем.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**', '**/*.int.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
