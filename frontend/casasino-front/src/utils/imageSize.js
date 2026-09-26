const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

function readAscii(view, offset, length) {
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i))
  return out
}

function readPngSize(bytes, view) {
  if (bytes.length < 24) return null
  if (readAscii(view, 1, 3) !== 'PNG') return null
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function readWebpSize(bytes, view) {
  if (bytes.length < 30) return null
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WEBP') return null
  const chunk = readAscii(view, 12, 4)
  if (chunk === 'VP8 ') {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const bits = view.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    const width = 1 + (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16))
    const height = 1 + (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16))
    return { width, height }
  }
  return null
}

function readJpegSize(bytes, view) {
  if (bytes.length < 4 || view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null
  let i = 2
  while (i + 9 < bytes.length) {
    if (view.getUint8(i) !== 0xff) {
      i++
      continue
    }
    const marker = view.getUint8(i + 1)
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    const length = view.getUint16(i + 2)
    if (JPEG_SOF.has(marker)) {
      return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) }
    }
    if (marker === 0xda || marker === 0xd9) return null
    i += 2 + length
  }
  return null
}

export async function readImageSize(blob) {
  try {
    const head = blob.slice(0, 65536)
    const bytes = new Uint8Array(await head.arrayBuffer())
    const view = new DataView(bytes.buffer)
    return readPngSize(bytes, view) ?? readWebpSize(bytes, view) ?? readJpegSize(bytes, view)
  } catch {
    return null
  }
}

export function fitWithin(width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: scale < 1,
  }
}
