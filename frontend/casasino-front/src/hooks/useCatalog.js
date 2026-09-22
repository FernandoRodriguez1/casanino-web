import { useEffect, useMemo, useState } from 'react'
import { fetchProductos, fetchCategorias } from '../services/catalog'

const scrollTop = () => window.scrollTo(0, 0)

export function useCatalog() {
  const [activeBrand, setActiveBrand] = useState('all')
  const [activeCategoria, setActiveCategoria] = useState(null)
  const [search, setSearch] = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [fullCatalog, setFullCatalog] = useState(false)
  const [categorias, setCategorias] = useState([])
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

  const products = useMemo(() => {
    if (fullCatalog || activeBrand !== 'all') return allProducts
    const seen = {}
    return allProducts.filter((p) => {
      seen[p.marcaNombre] = (seen[p.marcaNombre] ?? 0) + 1
      return seen[p.marcaNombre] <= LIMITED_PER_BRAND
    })
  }, [allProducts, fullCatalog, activeBrand])

  const marcas = useMemo(() => {
    const names = [...new Set(allProducts.map((p) => p.marcaNombre))]
    return names
      .sort((a, b) => a.localeCompare(b))
      .map((name, i) => ({ id: i + 1, nombre: name }))
  }, [allProducts])

  const counts = useMemo(() => {
    const acc = { all: allProducts.length }
    for (const p of allProducts) acc[p.marcaNombre] = (acc[p.marcaNombre] ?? 0) + 1
    return acc
  }, [allProducts])

  const visibleCategorias = useMemo(() => {
    if (activeBrand === 'all') return categorias
    return categorias.filter((c) => c.marca === activeBrand)
  }, [categorias, activeBrand])

  const categoriaMeta = useMemo(
    () => categorias.find((c) => c.slug === activeCategoria) ?? null,
    [categorias, activeCategoria]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cat = categoriaMeta?.categoria
    return products.filter((p) => {
      if (activeBrand !== 'all' && p.marcaNombre !== activeBrand) return false
      if (cat && p.categoria !== cat) return false
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
    const cat = categorias.find((c) => c.slug === slug)
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
    marcas,
    counts,
    categorias,
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