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
