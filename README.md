# NatsDoll

Интернет-магазин хэндмейд изделий из полимерной глины.

**Стек:** Vue 3 + Hono + PostgreSQL + Prisma + Docker

## Локальный запуск

**Требования:** Docker Desktop

### 1. Создай файл окружения

Создай файл `apps/api/.env` 

Для базового запуска (галерея, регистрация/вход) достаточно пустого файла — Docker Compose уже содержит все значения по умолчанию для разработки (БД, JWT-секрет и т.д.).

### 2. Запусти

```bash
docker compose up
```

При первом запуске Docker скачает образы и установит зависимости (~3–5 мин).

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Health check: http://localhost:3000/health

### Архитектура

`docs/architecture.md`
