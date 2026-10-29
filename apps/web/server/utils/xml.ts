export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function truncate(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`
}
