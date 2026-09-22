import { normalizeBrand } from '../utils/brand'

const PRODUCTOS_URL = '/data/productos.json'
const CATEGORIAS_URL = '/data/categorias.json'

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function toPublicPath(path) {
  const p = String(path).replace(/\\/g, '/')
  if (/^https?:\/\//.test(p)) return p
  return '/' + p
}

export function normalizeProducto(raw, index) {
  return {
    id: raw.id ?? index + 1,
    codigo: raw.codigo ?? '',
    modelo: raw.modelo ?? '',
    nombre: raw.nombre ?? '',
    descripcion: raw.descripcion ?? '',
    categoria: raw.categoria ?? '',
    accesorios: raw.accesorios ?? null,
    especificaciones: raw.especificaciones ?? null,
    marca: raw.marca ?? '',
    marcaNombre: normalizeBrand(raw.marca),
    imagenes: (raw.imagenes ?? []).map(toPublicPath),
  }
}

export async function fetchProductos() {
  const raw = await getJson(PRODUCTOS_URL)
  return raw.map(normalizeProducto)
}

export async function fetchCategorias() {
  return getJson(CATEGORIAS_URL)
}