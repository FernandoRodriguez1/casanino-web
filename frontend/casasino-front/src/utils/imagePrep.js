import { processPixels } from './pixels'
import { fitWithin, readImageSize } from './imageSize'

const MAX_EDGE = 1600
const MAX_PIXELS = MAX_EDGE * MAX_EDGE
const WEBP_QUALITY = 0.85
const JOB_TIMEOUT_MS = 30000

let worker = null
let workerBroken = false
let seq = 0
const pending = new Map()

function failAll(message) {
  for (const [, entry] of pending) {
    clearTimeout(entry.timer)
    entry.reject(new Error(message))
  }
  pending.clear()
}

function getWorker() {
  if (worker || workerBroken) return worker
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    workerBroken = true
    return null
  }
  try {
    worker = new Worker(new URL('../workers/background.worker.js', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e) => {
      const { id, blob, error } = e.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      clearTimeout(entry.timer)
      if (error) entry.reject(new Error(error))
      else entry.resolve(blob)
    }
    worker.onerror = () => {
      workerBroken = true
      worker = null
      failAll('No se pudo procesar la imagen en segundo plano')
    }
  } catch {
    workerBroken = true
    worker = null
  }
  return worker
}

function runOnWorker(blob, width, height, removeBg) {
  const w = getWorker()
  if (!w) return null
  const id = ++seq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('El procesamiento de la imagen tardó demasiado'))
    }, JOB_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    w.postMessage({ id, blob, width, height, removeBg, quality: WEBP_QUALITY })
  })
}

async function runOnMainThread(blob, width, height, removeBg) {
  const bmp = await createImageBitmap(blob, {
    imageOrientation: 'from-image',
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
  })
  const w = bmp.width
  const h = bmp.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0)
  bmp.close()
  if (removeBg) {
    const px = ctx.getImageData(0, 0, w, h).data
    const { out } = processPixels(px, w, h)
    ctx.putImageData(new ImageData(out, w, h), 0, 0)
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY))
}

async function processBlob(blob, width, height, removeBg) {
  const viaWorker = await runOnWorker(blob, width, height, removeBg)
  if (viaWorker) return viaWorker
  return runOnMainThread(blob, width, height, removeBg)
}

export async function prepareImage(file, { removeBg = true } = {}) {
  const size = await readImageSize(file)
  if (!size || !size.width || !size.height) return null

  const target = fitWithin(size.width, size.height, MAX_EDGE)
  if (target.width * target.height > MAX_PIXELS) return null
  if (!removeBg && !target.scaled) return null

  try {
    const blob = await processBlob(file, target.width, target.height, removeBg)
    return blob && blob.size > 0 ? blob : null
  } catch (err) {
    console.warn('No se pudo preparar la imagen:', err)
    return null
  }
}
