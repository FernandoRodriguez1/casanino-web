import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadCatalogData,
  normalizeProducto,
  fetchProductoById,
  readCachedProductos,
  readCachedReference,
  cacheUpsertProduct,
  cacheRemoveProduct,
} from '../services/catalog'

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
  const [reloadTick, setReloadTick] = useState(0)

  const savedScrollRef = useRef(0)

  const LIMITED_PER_BRAND = 16
  const INITIAL_IN_LIMIT = 38

  const reload = useCallback(() => {
    setStatus('loading')
    setReloadTick((t) => t + 1)
  }, [])

  const applyProductUpdate = useCallback((saved, id) => {
    const apply = (product) => {
      setAllProducts((prev) => {
        const idx = prev.findIndex((x) => x.id === product.id)
        return idx >= 0 ? prev.map((x, i) => (i === idx ? product : x)) : [product, ...prev]
      })
      setTimeout(() => {
        cacheUpsertProduct(product).catch(() => {})
      }, 0)
    }
    if (saved && typeof saved.id !== 'undefined' && saved.id !== null) {
      apply(normalizeProducto(saved))
    } else if (id) {
      fetchProductoById(id).then(apply).catch((err) => console.error('Error actualizando producto en caché:', err))
    }
  }, [])

  const applyProductRemove = useCallback((id) => {
    setAllProducts((prev) => prev.filter((x) => x.id !== id))
    setTimeout(() => {
      cacheRemoveProduct(id).catch(() => {})
    }, 0)
  }, [])

  useEffect(() => {
    let alive = true
    const forceFresh = reloadTick > 0
    loadCatalogData(!forceFresh)
      .then(({ productos, categorias, marcas }) => {
        if (!alive) return
        setAllProducts(productos)
        setCategorias(categorias)
        setMarcas(marcas)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('Error cargando catálogo:', err)
        if (alive) setStatus((s) => (s === 'ready' ? s : 'error'))
      })
    return () => {
      alive = false
    }
  }, [reloadTick])

  useEffect(() => {
    const sync = () => {
      readCachedProductos()
        .then((list) => {
          if (Array.isArray(list) && list.length) setAllProducts(list)
        })
        .catch(() => {})
      // Marcas y categorías también se editan desde el admin.
      readCachedReference()
        .then((reference) => {
          if (!reference) return
          if (reference.marcas?.length) setMarcas(reference.marcas)
          if (reference.categorias?.length) setCategorias(reference.categorias)
        })
        .catch(() => {})
    }
    window.addEventListener('casanino:catalog-changed', sync)
    return () => window.removeEventListener('casanino:catalog-changed', sync)
  }, [])

  const sortedMarcas = useMemo(
    () => [...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [marcas]
  )

  const products = useMemo(() => {
    if (fullCatalog || activeBrand !== 'all') return allProducts
    const blocks = []
    const inBlocks = new Set()
    for (const m of sortedMarcas) {
      const group = allProducts
        .filter((p) => p.marcaNombre === m.nombre)
        .slice(0, LIMITED_PER_BRAND)
      if (group.length) {
        blocks.push(...group)
        for (const p of group) inBlocks.add(p.id)
      }
    }
    const seen = {}
    for (const p of allProducts) {
      if (inBlocks.has(p.id)) continue
      seen[p.marcaNombre] = (seen[p.marcaNombre] ?? 0) + 1
      if (seen[p.marcaNombre] <= LIMITED_PER_BRAND) blocks.push(p)
    }
    return blocks.slice(0, INITIAL_IN_LIMIT)
  }, [allProducts, fullCatalog, activeBrand, sortedMarcas])

  const counts = useMemo(() => {
    const acc = { all: allProducts.length }
    for (const p of allProducts) acc[p.marcaNombre] = (acc[p.marcaNombre] ?? 0) + 1
    return acc
  }, [allProducts])

  const enrichedCategorias = useMemo(() => {
    const marca = {}
    const count = {}
    const img = {}
    for (const p of allProducts) {
      if (p.categoriaId && !(p.categoriaId in marca)) marca[p.categoriaId] = p.marcaNombre
      count[p.categoriaId] = (count[p.categoriaId] ?? 0) + 1
      if (
        p.marcaNombre === 'Crossmaster' &&
        p.imagenes?.length &&
        !(p.categoriaId in img)
      ) {
        img[p.categoriaId] = p.imagenes.find((u) => !!u) ?? null
      }
    }
    return categorias.map((c) => ({
      ...c,
      marca: marca[c.id] ?? null,
      count: count[c.id] ?? 0,
      imagen: marca[c.id] === 'Crossmaster' ? (img[c.id] ?? c.imagen) : c.imagen,
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
    const matches = (p) => {
      if (activeBrand !== 'all' && p.marcaNombre !== activeBrand) return false
      if (catId && p.categoriaId !== catId) return false
      return true
    }
    if (q) {
      return allProducts.filter((p) => {
        if (!matches(p)) return false
        const haystack = [p.nombre, p.codigo, p.modelo, p.marcaNombre]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    return products.filter(matches)
  }, [activeBrand, search, products, allProducts, categoriaMeta])

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  const setBrand = (b) => {
    setActiveBrand(b)
    setActiveCategoria(null)
    scrollTop()
  }

  const setSearchProduct = (value) => {
    if (value.trim() && !search.trim()) {
      setActiveCategoria(null)
    }
    setSearch(value)
  }

  const scrollToCatalog = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector('.catalog .grid') || document.querySelector('.catalog')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  const selectCategoria = (slug) => {
    const cat = enrichedCategorias.find((c) => c.slug === slug)
    if (!cat) return
    if (activeBrand !== 'all' && cat.marca !== activeBrand) setActiveBrand(cat.marca)
    setActiveCategoria(slug === activeCategoria ? null : slug)
    scrollToCatalog()
  }

  const openDetail = (id) => {
    savedScrollRef.current = window.scrollY
    setSelectedId(id)
    scrollTop()
  }

  const closeDetail = () => {
    setSelectedId(null)
    scrollTop()
    const y = savedScrollRef.current
    savedScrollRef.current = 0
    if (y > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, y)
        })
      })
    }
  }

  const clearCategoria = () => setActiveCategoria(null)

  const loadFullCatalog = () => {
    setFullCatalog(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector('.catalog .grid') || document.querySelector('.catalog')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  return {
    activeBrand,
    activeCategoria,
    search,
    setSearch,
    setSearchProduct,
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
    reload,
    applyProductUpdate,
    applyProductRemove,
    setBrand,
    selectCategoria,
    openDetail,
    closeDetail,
    clearCategoria,
  }
}