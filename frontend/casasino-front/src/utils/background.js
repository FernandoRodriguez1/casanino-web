const MAX_PIXELS = 6000000
const MAX_DIST = 30
const SOFT_RADIUS = 2
const CORNER = 10

function median(values) {
  const a = values.slice().sort((x, y) => x - y)
  return a[Math.floor(a.length / 2)]
}

function blurAxis(src, w, h) {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      const i = row + x
      out[i] = src[i]
      out[i] += x > 0 ? src[i - 1] : src[i]
      out[i] += x < w - 1 ? src[i + 1] : src[i]
      out[i] /= 3
    }
  }
  return out
}

function blurAxisY(src, w, h) {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    const up = y > 0 ? row - w : row
    const down = y < h - 1 ? row + w : row
    for (let x = 0; x < w; x++) {
      const i = row + x
      out[i] = (src[up + x] + src[i] + src[down + x]) / 3
    }
  }
  return out
}

function boxBlur(mask, w, h, radius) {
  let cur = mask
  for (let i = 0; i < radius; i++) {
    cur = blurAxis(cur, w, h)
    cur = blurAxisY(cur, w, h)
  }
  return cur
}

export function processPixels(px, w, h) {
  const n = w * h

  const cw = Math.min(CORNER, w)
  const ch = Math.min(CORNER, h)
  const corners = [
    [0, 0],
    [w - cw, 0],
    [0, h - ch],
    [w - cw, h - ch],
  ]
  const rs = []
  const gs = []
  const bs = []
  for (const [cx, cy] of corners) {
    for (let y = 0; y < ch; y++) {
      const row = (cy + y) * w
      for (let x = 0; x < cw; x++) {
        const i = (row + cx + x) * 4
        rs.push(px[i])
        gs.push(px[i + 1])
        bs.push(px[i + 2])
      }
    }
  }
  const bgR = median(rs)
  const bgG = median(gs)
  const bgB = median(bs)

  const white = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const dr = px[j] - bgR
    const dg = px[j + 1] - bgG
    const db = px[j + 2] - bgB
    if (dr * dr + dg * dg + db * db <= MAX_DIST * MAX_DIST) white[i] = 1
  }

  const filled = new Uint8Array(n)
  const stack = new Int32Array(n)
  let head = 0
  let tail = -1
  const push = (i) => {
    if (!filled[i]) {
      filled[i] = 1
      stack[++tail] = i
    }
  }
  for (let x = 0; x < w; x++) {
    if (white[x]) push(x)
    if (white[(h - 1) * w + x]) push((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    if (white[y * w]) push(y * w)
    if (white[y * w + w - 1]) push(y * w + w - 1)
  }
  while (head <= tail) {
    const i = stack[head++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0 && white[i - 1]) push(i - 1)
    if (x < w - 1 && white[i + 1]) push(i + 1)
    if (y > 0 && white[i - w]) push(i - w)
    if (y < h - 1 && white[i + w]) push(i + w)
  }

  const soft = boxBlur(Float32Array.from(filled), w, h, SOFT_RADIUS)

  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const s = soft[i]
    const alpha = Math.round((1 - s) * 255)
    const f = alpha / 255
    out[j] = Math.round(px[j] * f + bgR * (1 - f))
    out[j + 1] = Math.round(px[j + 1] * f + bgG * (1 - f))
    out[j + 2] = Math.round(px[j + 2] * f + bgB * (1 - f))
    out[j + 3] = alpha
  }

  return { out, bg: [bgR, bgG, bgB] }
}

export async function removeWhiteBackground(image) {
  const w = image.width
  const h = image.height
  if (!w || !h || w * h > MAX_PIXELS) return null

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0)
  const { data: px } = ctx.getImageData(0, 0, w, h)

  const { out } = processPixels(px, w, h)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = w
  outCanvas.height = h
  outCanvas.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0)

  return new Promise((resolve) => {
    outCanvas.toBlob(
      (blob) => resolve(blob && blob.size > 0 ? blob : null),
      'image/webp',
      0.93
    )
  })
}