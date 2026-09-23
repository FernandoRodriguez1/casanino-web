export function imageArea(url) {
  const m = /(\d+)x(\d+)\.webp$/i.exec(String(url))
  if (!m) return 0
  return parseInt(m[1], 10) * parseInt(m[2], 10)
}

export function sortImagesForDisplay(imgs) {
  const list = Array.isArray(imgs) ? imgs.filter(Boolean) : []
  return [...list].sort((a, b) => imageArea(b) - imageArea(a))
}