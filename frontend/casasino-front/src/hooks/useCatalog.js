import { useEffect, useMemo, useState } from 'react'
import { fetchProductos, fetchCategorias, fetchMarcas } from '../services/catalog'

const scrollTop = () => window.scrollTo(0, 0)

export function useCatalog() {
  const [activeBrand, setActiveBrand] = useState('all')
  const [activeCategoria, setActiveCategoria] = useState(null)
  const [search, setSearch] = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [fullCatalog, setFullCatalog] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [marcas, setMarcas] = useState([])
  const [status, setStatus] = useState('loading')
  const [selectedId, setSelectedId] = useState(null)

  const LIMITED_PER_BRAND = 16

  useEffect(() => {
    let alive = true
    fetchProductos()
      .then((list) => {
        if (!alive) return
        setAllProducts(list)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('Error cargando productos:', err)
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchCategorias()
      .then((cats) => {
        if (alive) setCategorias(cats)
      })
      .catch((err) => console.error('Error cargando categorías:', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetchMarcas()
      .then((m) => {
        if (alive) setMarcas(m)
      })
      .catch((err) => console.error('Error cargando marcas:', err))
    return () => {
      alive = false
    }
  }, [])

  const products = useMemo(() => {
    if (fullCatalog || activeBrand !== 'all') return allProducts
    const seen = {}
    return allProducts.filter((p) => {
      seen[p.marcaNombre] = (seen[p.marcaNombre] ?? 0) + 1
      return seen[p.marcaNombre] <= LIMITED_PER_BRAND
    })
  }, [allProducts, fullCatalog, activeBrand])

  const sortedMarcas = useMemo(
    () => [...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [marcas]
  )

  const counts = useMemo(() => {
    const acc = { all: allProducts.length }
    for (const p of allProducts) acc[p.marcaNombre] = (acc[p.marcaNombre] ?? 0) + 1
    return acc
  }, [allProducts])

  const enrichedCategorias = useMemo(() => {
    const marca = {}
    const count = {}
    for (const p of allProducts) {
      if (p.categoriaId && !(p.categoriaId in marca)) marca[p.categoriaId] = p.marcaNombre
      count[p.categoriaId] = (count[p.categoriaId] ?? 0) + 1
    }
    return categorias.map((c) => ({
      ...c,
      marca: marca[c.id] ?? null,
      count: count[c.id] ?? 0,
    }))
  }, [categorias, allProducts])

  const visibleCategorias = useMemo(() => {
    if (activeBrand === 'all') return enrichedCategorias
    return enrichedCategorias.filter((c) => c.marca === activeBrand)
  }, [enrichedCategorias, activeBrand])

  const categoriaMeta = useMemo(
    () => enrichedCategorias.find((c) => c.slug === activeCategoria) ?? null,
    [enrichedCategorias, activeCategoria]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const catId = categoriaMeta?.id
    return products.filter((p) => {
      if (activeBrand !== 'all' && p.marcaNombre !== activeBrand) return false
      if (catId && p.categoriaId !== catId) return false
      if (!q) return true
      const haystack = [
        p.nombre,
        p.codigo,
        p.modelo,
        p.categoria,
        p.marcaNombre,
        p.descripcion,
        p.especificaciones,
        p.accesorios,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [activeBrand, search, products, categoriaMeta])

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId]
  )

  const setBrand = (b) => {
    setActiveBrand(b)
    setActiveCategoria(null)
    scrollTop()
  }

  const selectCategoria = (slug) => {
    const cat = enrichedCategorias.find((c) => c.slug === slug)
    if (!cat) return
    if (activeBrand !== 'all' && cat.marca !== activeBrand) setActiveBrand(cat.marca)
    setActiveCategoria(slug === activeCategoria ? null : slug)
    scrollTop()
  }

  const openDetail = (id) => {
    setSelectedId(id)
    scrollTop()
  }

  const closeDetail = () => {
    setSelectedId(null)
    scrollTop()
  }

  const clearCategoria = () => setActiveCategoria(null)

  const loadFullCatalog = () => setFullCatalog(true)

  return {
    activeBrand,
    activeCategoria,
    search,
    setSearch,
    status,
    products,
    marcas: sortedMarcas,
    counts,
    categorias: enrichedCategorias,
    visibleCategorias,
    categoriaMeta,
    filtered,
    selected,
    loadedCount: activeBrand === 'all' ? products.length : counts[activeBrand] ?? 0,
    totalCount: allProducts.length,
    isFullCatalog: fullCatalog,
    loadFullCatalog,
    setBrand,
    selectCategoria,
    openDetail,
    closeDetail,
    clearCategoria,
  }
}