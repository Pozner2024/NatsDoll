// Тестам, дёргающим токены/HMAC (tokens.ts), нужны секреты в env.
// Ставим детерминированные значения, чтобы прогон не зависел от локального .env
// и порядка выполнения. ??= уважает уже заданное окружение (например в CI).
process.env.NODE_ENV ??= 'test'
process.env.JWT_SECRET ??= 'test-jwt-secret'
process.env.HMAC_SECRET ??= 'test-hmac-secret'
