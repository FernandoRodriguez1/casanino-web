import { normalizeBrand } from '../utils/brand'
import { cacheGet, cacheSet } from '../utils/cache'
import { apiFetch } from './api'

const K_PRODUCTOS = 'productos_v2'
const K_CATEGORIAS = 'categorias_v1'
const K_MARCAS = 'marcas_v1'
const K_META = 'meta_v2'

export const CATALOG_TTL_MS = 10 * 60 * 1000
const REFERENCE_TTL_MS = 24 * 60 * 60 * 1000

const inflight = new Map()

function once(key, factory) {
  const existing = inflight.get(key)
  if (existing) return existing
  const promise = factory().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

async function persist(key, value) {
  await cacheSet(key, value)
  const meta = (await cacheGet(K_META)) || {}
  meta[key] = Date.now()
  await cacheSet(K_META, meta)
}

let writeChain = null
let queuedProducts = null

function queueProductsWrite(list) {
  queuedProducts = list
  if (writeChain) return writeChain
  writeChain = new Promise((resolve) => {
    setTimeout(() => {
      const snapshot = queuedProducts
      queuedProducts = null
      writeChain = null
      persist(K_PRODUCTOS, snapshot).then(resolve, resolve)
    }, 300)
  })
  return writeChain
}

let mirror = null
let mirrorPromise = null

async function getMirror() {
  if (mirror) return mirror
  if (!mirrorPromise) {
    mirrorPromise = (async () => {
      const [productos, categorias, marcas] = await Promise.all([
        cacheGet(K_PRODUCTOS),
        cacheGet(K_CATEGORIAS),
        cacheGet(K_MARCAS),
      ])
      mirror = {
        productos: Array.isArray(productos) ? productos : [],
        categorias: Array.isArray(categorias) ? categorias : [],
        marcas: Array.isArray(marcas) ? marcas : [],
      }
      return mirror
    })().finally(() => {
      mirrorPromise = null
    })
  }
  return mirrorPromise
}

async function getJson(path) {
  const data = await apiFetch(path)
  return Array.isArray(data) ? data : []
}

export function normalizeProducto(raw) {
  const codigo = raw.codigo ?? ''
  const modelo = raw.modelo ?? ''
  const nombre = raw.nombre ?? ''
  const marca = raw.marcaNombre ?? ''
  const marcaNombre = normalizeBrand(marca)
  return {
    id: raw.id,
    codigo,
    modelo,
    nombre,
    descripcion: raw.descripcion ?? null,
    categoria: raw.categoriaNombre ?? '',
    categoriaId: raw.categoriaId,
    accesorios: raw.accesorios ?? null,
    especificaciones: raw.especificaciones ?? null,
    marca,
    marcaId: raw.marcaId,
    marcaNombre,
    imagenes: (raw.imagenes ?? []).filter(Boolean),
    search: `${nombre} ${codigo} ${modelo} ${marca} ${marcaNombre}`.toLowerCase(),
  }
}

export async function fetchProductos() {
  return once('productos', async () => {
    const raw = await getJson('/api/Productos')
    const list = raw.map(normalizeProducto)
    const current = await getMirror()
    mirror = { ...current, productos: list }
    queueProductsWrite(list)
    return list
  })
}

export async function fetchCategorias() {
  return once('categorias', async () => {
    const raw = await getJson('/api/Categorias')
    const list = raw.map((c) => ({
      id: c.id,
      slug: String(c.id),
      nombre: c.nombre,
      imagen: c.imagen ?? null,
    }))
    const current = await getMirror()
    mirror = { ...current, categorias: list }
    persist(K_CATEGORIAS, list)
    return list
  })
}

export async function fetchMarcas() {
  return once('marcas', async () => {
    const raw = await getJson('/api/Marcas')
    const list = raw.map((m) => ({ id: m.id, nombre: m.nombre }))
    const current = await getMirror()
    mirror = { ...current, marcas: list }
    persist(K_MARCAS, list)
    return list
  })
}

function isFresh(meta, key, value, ttl) {
  if (!Array.isArray(value) || value.length === 0) return false
  return Date.now() - (meta[key] || 0) < ttl
}

export async function loadCatalogData({ force = false } = {}) {
  const [cached, metaRaw] = await Promise.all([getMirror(), cacheGet(K_META)])
  const meta = metaRaw || {}

  const productosFresh = !force && isFresh(meta, K_PRODUCTOS, cached.productos, CATALOG_TTL_MS)
  const categoriasFresh = !force && isFresh(meta, K_CATEGORIAS, cached.categorias, REFERENCE_TTL_MS)
  const marcasFresh = !force && isFresh(meta, K_MARCAS, cached.marcas, REFERENCE_TTL_MS)

  const stale = !productosFresh || !categoriasFresh || !marcasFresh

  const background = stale
    ? Promise.all([fetchProductos(), fetchCategorias(), fetchMarcas()])
        .then(([productos, categorias, marcas]) => ({ productos, categorias, marcas }))
        .catch((err) => {
          console.error('Error refrescando el catálogo:', err)
          return null
        })
    : null

  return {
    productos: cached.productos,
    categorias: cached.categorias,
    marcas: cached.marcas,
    fromCache: true,
    background,
  }
}

export async function fetchProductoById(id) {
  return normalizeProducto(await getJson(`/api/Productos/${id}`))
}

export async function readCachedProductos() {
  const { productos } = await getMirror()
  return productos
}

export async function cacheUpsertProduct(product) {
  if (!product || product.id === null || typeof product.id === 'undefined') return
  const current = await getMirror()
  const idx = current.productos.findIndex((x) => x.id === product.id)
  const next =
    idx >= 0
      ? current.productos.map((x, i) => (i === idx ? product : x))
      : [product, ...current.productos]
  mirror = { ...current, productos: next }
  return queueProductsWrite(next)
}

export async function cacheRemoveProduct(id) {
  const current = await getMirror()
  const next = current.productos.filter((x) => x.id !== id)
  if (next.length === current.productos.length) return
  mirror = { ...current, productos: next }
  return queueProductsWrite(next)
}

export async function cacheStoreReference({ categorias, marcas }) {
  const current = await getMirror()
  mirror = {
    ...current,
    categorias: categorias ?? current.categorias,
    marcas: marcas ?? current.marcas,
  }
  const writes = []
  if (categorias) writes.push(persist(K_CATEGORIAS, categorias))
  if (marcas) writes.push(persist(K_MARCAS, marcas))
  return Promise.all(writes)
}

export async function cacheStoreProducts(list) {
  if (!Array.isArray(list) || list.length === 0) return
  const current = await getMirror()
  mirror = { ...current, productos: list }
  return queueProductsWrite(list)
}

export async function readCachedReference() {
  const { categorias, marcas } = await getMirror()
  return { categorias, marcas }
}
