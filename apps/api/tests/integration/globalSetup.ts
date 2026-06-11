import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTestEnv } from './loadTestEnv'

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Один раз на прогон: валидируем тестовый DATABASE_URL и накатываем миграции
// на тестовую базу (база `natsdoll_test` должна быть создана заранее — см. .env.test.example).
export default function setup(): void {
  const url = loadTestEnv()
  // Команда — статический литерал без пользовательского ввода; DATABASE_URL передаётся
  // через env-объект, а не интерполируется в строку, поэтому инъекция невозможна.
  execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: url },
  })
}
