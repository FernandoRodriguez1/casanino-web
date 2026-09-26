import { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminApi from '../services/admin'
import {
  normalizeProducto,
  cacheUpsertProduct,
  cacheRemoveProduct,
  cacheStoreProducts,
  cacheStoreReference,
  readCachedProductos,
  readCachedReference,
} from '../services/catalog'
import ProductEditModal from './ProductEditModal'

function notifyCatalogChanged() {
  window.dispatchEvent(new Event('casanino:catalog-changed'))
}

const categoriaOf = (p) => p.categoria ?? p.categoriaNombre ?? ''

function AdminProducts({ token }) {
  const [items, setItems] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (nuevo) | producto
  const [isNew, setIsNew] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [list, marcasList, categoriasList] = await Promise.all([
        adminApi.getProductos(token),
        adminApi.getMarcas(token),
        adminApi.getCategorias(token),
      ])
      const productos = Array.isArray(list) ? list : []
      const marcas = Array.isArray(marcasList) ? marcasList : []
      const categorias = Array.isArray(categoriasList) ? categoriasList : []
      setItems(productos)
      setMarcas(marcas)
      setCategorias(categorias)
      cacheStoreProducts(productos.map(normalizeProducto)).catch(() => {})
      cacheStoreReference({
        categorias: categorias.map((c) => ({
          id: c.id,
          slug: String(c.id),
          nombre: c.nombre,
          imagen: c.imagen ?? null,
        })),
        marcas,
      }).catch(() => {})
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    let alive = true
    readCachedProductos()
      .then((list) => {
        if (!alive || !list?.length) return
        setItems((prev) => (prev.length === 0 ? list : prev))
        return readCachedReference()
      })
      .then((reference) => {
        if (!alive || !reference) return
        setMarcas((prev) => (prev.length === 0 ? reference.marcas : prev))
        setCategorias((prev) => (prev.length === 0 ? reference.categorias : prev))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      [it.nombre, it.codigo, it.modelo, it.marcaNombre, categoriaOf(it)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [items, query])

  const openNew = () => {
    setEditing({})
    setIsNew(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setIsNew(false)
  }

  const closeForm = () => {
    setEditing(null)
  }

  const upsertItem = (raw) => {
    if (!raw || typeof raw.id === 'undefined' || raw.id === null) return
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === raw.id)
      return idx >= 0 ? prev.map((x, i) => (i === idx ? raw : x)) : [raw, ...prev]
    })
  }

  const handleSaved = async (saved, id) => {
    closeForm()
    const productId = saved?.id ?? id
    if (productId === null || typeof productId === 'undefined') return
    try {
      const resolved =
        saved && typeof saved.id !== 'undefined' && saved.id !== null
          ? saved
          : await adminApi.getProducto(token, productId)
      upsertItem(resolved)
      cacheUpsertProduct(normalizeProducto(resolved)).catch(() => {})
      notifyCatalogChanged()
    } catch (err) {
      console.error('Error actualizando caché tras guardar:', err)
    }
  }

  const cleanupAfterDelete = async (item) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id))
    try {
      await cacheRemoveProduct(item.id)
      notifyCatalogChanged()
    } catch (err) {
      console.error('Error actualizando caché tras eliminar:', err)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar el producto "${item.nombre}"?`)) return
    setError('')
    try {
      await adminApi.deleteProducto(token, item.id)
      await cleanupAfterDelete(item)
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'No se pudo eliminar')
    }
  }

  return (
    <section className="ac-card">
      <div className="ac-card-head">
        <h2>Productos</h2>
        <div className="ac-toolbar">
          <input
            type="text"
            className="ac-search"
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="ac-btn ac-btn-primary" onClick={openNew}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {error && <p className="ac-error">{error}</p>}

      {loading ? (
        <p className="ac-muted">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="ac-muted">No hay productos.</p>
      ) : (
        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th className="ac-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imagenes?.find(Boolean) ? (
                      <img className="ac-thumb" src={p.imagenes.find(Boolean)} alt="" />
                    ) : (
                      <span className="ac-thumb ac-thumb-empty" />
                    )}
                  </td>
                  <td>{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td>{p.marcaNombre ?? p.marca}</td>
                  <td>{categoriaOf(p)}</td>
                  <td className="ac-col-actions">
                    <div className="ac-cell-actions">
                      <button type="button" className="ac-btn" onClick={() => openEdit(p)}>
                        Editar
                      </button>
                      <button type="button" className="ac-btn ac-btn-danger" onClick={() => remove(p)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductEditModal
          token={token}
          producto={isNew ? null : editing}
          marcas={marcas}
          categorias={categorias}
          onClose={closeForm}
          onSaved={handleSaved}
          onDeleted={(producto) => {
            closeForm()
            cleanupAfterDelete(producto)
          }}
        />
      )}
    </section>
  )
}

export default AdminProducts