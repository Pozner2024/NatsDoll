/**
 * Очищает и валидирует URL для перенаправления (редиректа).
 * Защищает от атаки "Open Redirect", гарантируя, что редирект произойдет
 * только внутри текущего домена (сайта), а не на сторонний вредоносный ресурс.
 * 
 * @param stored - URL-адрес, куда мы хотим перенаправить пользователя.
 * @param origin - Текущий домен сайта (по умолчанию берется из браузера).
 * @returns Безопасный относительный путь (например, `/cart`), либо `/`, если ссылка невалидна или ведет на чужой сайт.
 */
export function resolveSafeRedirect(stored: string | null, origin: string = window.location.origin): string {
  if (!stored) return '/'
  try {
    const url = new URL(stored, origin)
    if (url.origin !== origin) return '/'
    return url.pathname + url.search + url.hash
  } catch {
    return '/'
  }
}
