import { normalizeBrand } from '../utils/brand'

const BASE = import.meta.env.VITE_API_URL || 'https://casanino-web.onrender.com'

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
    imagenes: Array.isArray(raw.imagenes) ? raw.imagenes.filter(Boolean) : [],
  }
}

export async function fetchProductos() {
  const raw = await getJson('/api/Productos')
  return raw.map(normalizeProducto)
}

export async function fetchCategorias() {
  const raw = await getJson('/api/Categorias')
  return raw.map((c) => ({
    id: c.id,
    slug: String(c.id),
    nombre: c.nombre,
    imagen: c.imagen ?? null,
  }))
}

export async function fetchMarcas() {
  const raw = await getJson('/api/Marcas')
  return raw.map((m) => ({ id: m.id, nombre: m.nombre }))
}