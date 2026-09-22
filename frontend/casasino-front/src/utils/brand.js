const BRAND_LABELS = {
  'dowen pagio': 'Dowen Pagio',
  crossmaster: 'Crossmaster',
  'bta tools': 'BTA Tools',
}

export const brandMeta = {
  'Dowen Pagio': { color: '#fc4c02' },
  Crossmaster: { color: '#2563eb' },
  'BTA Tools': { color: '#fedb00' },
}

export function normalizeBrand(name) {
  const key = (name || '').trim().toLowerCase()
  return BRAND_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

export function getBrandColor(brand) {
  return brandMeta[brand]?.color ?? '#6b7280'
}

export function isLightColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}

export function darken(hex, amount = 0.25) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * (1 - amount))
  const g = Math.round(((n >> 8) & 255) * (1 - amount))
  const b = Math.round((n & 255) * (1 - amount))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function readableBrandColor(brand) {
  const color = getBrandColor(brand)
  return isLightColor(color) ? darken(color, 0.3) : color
}

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}