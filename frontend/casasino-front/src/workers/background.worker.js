import { processPixels } from '../utils/pixels'

function decode(blob, width, height) {
  const opts = { imageOrientation: 'from-image' }
  if (width && height) {
    opts.resizeWidth = width
    opts.resizeHeight = height
    opts.resizeQuality = 'high'
  }
  return createImageBitmap(blob, opts)
}

async function run({ id, blob, width, height, removeBg, quality }) {
  const bmp = await decode(blob, width, height)
  const w = bmp.width
  const h = bmp.height
  if (!w || !h) throw new Error('La imagen no tiene dimensiones')

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0)
  bmp.close()

  if (removeBg) {
    const px = ctx.getImageData(0, 0, w, h).data
    const { out } = processPixels(px, w, h)
    ctx.putImageData(new ImageData(out, w, h), 0, 0)
  }

  const result = await canvas.convertToBlob({ type: 'image/webp', quality })
  self.postMessage({ id, blob: result, width: w, height: h })
}

self.onmessage = (e) => {
  const job = e.data
  run(job).catch((err) => {
    self.postMessage({ id: job.id, error: err?.message || 'No se pudo procesar la imagen' })
  })
}
