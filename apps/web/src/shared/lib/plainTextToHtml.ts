const HTML_TAG_PATTERN = /<[a-z][^>]*>/i

export function plainTextToHtml(text: string): string {
  if (HTML_TAG_PATTERN.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
