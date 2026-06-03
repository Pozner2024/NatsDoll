// Фиктивный argon2id-хеш для constant-time verify, когда пользователь не найден
// или зарегистрирован только через Google. Предотвращает user enumeration по таймингу.
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$K0mGBc4bA4+zBYK6Jn2LQI2B8wD0tRpV4GQ5yqB3E8A'
