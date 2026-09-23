import { normalizeBrand } from '../utils/brand'
import { sortImagesForDisplay } from '../utils/images'
import { cacheGet, cacheSet } from '../utils/cache'

const BASE = import.meta.env.VITE_API_URL || 'https://casanino-web.onrender.com'

const K_PRODUCTOS = 'productos_v1'
const K_CATEGORIAS = 'categorias_v1'
const K_MARCAS = 'marcas_v1'
const K_META = 'meta_v1'

export const CATALOG_TTL_MS = 10 * 60 * 1000

async function persist(key, value) {
  await cacheSet(key, value)
  const meta = (await cacheGet(K_META)) || {}
  meta[key] = Date.now()
  await cacheSet(K_META, meta)
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function normalizeProducto(raw) {
  return {
    id: raw.id,
    codigo: raw.codigo ?? '',
    modelo: raw.modelo ?? '',
    nombre: raw.nombre ?? '',
    descripcion: raw.descripcion ?? null,
    categoria: raw.categoriaNombre ?? '',
    categoriaId: raw.categoriaId,
    accesorios: raw.accesorios ?? null,
    especificaciones: raw.especificaciones ?? null,
    marca: raw.marcaNombre ?? '',
    marcaId: raw.marcaId,
    marcaNombre: normalizeBrand(raw.marcaNombre),
    imagenes: sortImagesForDisplay(raw.imagenes),
  }
}

export async function fetchProductos() {
  const raw = await getJson('/api/Productos')
  const list = raw.map(normalizeProducto)
  setTimeout(() => persist(K_PRODUCTOS, list), 0)
  return list
}

export async function fetchCategorias() {
  const raw = await getJson('/api/Categorias')
  const list = raw.map((c) => ({
    id: c.id,
    slug: String(c.id),
    nombre: c.nombre,
    imagen: c.imagen ?? null,
  }))
  setTimeout(() => persist(K_CATEGORIAS, list), 0)
  return list
}

export async function fetchMarcas() {
  const raw = await getJson('/api/Marcas')
  const list = raw.map((m) => ({ id: m.id, nombre: m.nombre }))
  setTimeout(() => persist(K_MARCAS, list), 0)
  return list
}

export async function loadCatalogData(useCache = true) {
  const cached = useCache
    ? await Promise.all([cacheGet(K_PRODUCTOS), cacheGet(K_CATEGORIAS), cacheGet(K_MARCAS), cacheGet(K_META)])
    : [null, null, null, null]
  const [cp, cc, cm, metaRaw] = cached
  const meta = metaRaw || {}
  const fresh = (key, val) => val && Date.now() - (meta[key] || 0) < CATALOG_TTL_MS

  const catFresh = fresh(K_CATEGORIAS, cc)
  const marcaFresh = fresh(K_MARCAS, cm)

  const [prod, cat, marc] = await Promise.all([
    fresh(K_PRODUCTOS, cp)
      ? { list: cp, fromCache: true }
      : fetchProductos().then((l) => ({ list: l, fromCache: false })),
    (async () => {
      if (catFresh) return cc
      try { return await fetchCategorias() } catch (err) {
        console.error('Error refrescando categorías:', err)
        return cc ?? null
      }
    })(),
    (async () => {
      if (marcaFresh) return cm
      try { return await fetchMarcas() } catch (err) {
        console.error('Error refrescando marcas:', err)
        return cm ?? null
      }
    })(),
  ])

  return {
    productos: prod.list,
    categorias: cat ?? [],
    marcas: marc ?? [],
    fromCache: prod.fromCache,
  }
}