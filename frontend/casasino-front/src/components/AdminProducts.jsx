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
  notifyCatalogChanged,
} from '../services/catalog'
import ProductEditModal from './ProductEditModal'

const categoriaOf = (p) => p.categoria ?? p.categoriaNombre ?? ''

// El PUT de productos es un reemplazo total y no hay endpoint masivo, asi que
// la edicion multiple se hace con una request por producto. El tope evita
// bloquear el navegador si alguien selecciona el catalogo entero.
const MAX_BULK = 100

function AdminProducts({ token }) {
  const [items, setItems] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (nuevo) | producto
  const [isNew, setIsNew] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkCategoriaId, setBulkCategoriaId] = useState('')
  const [bulk, setBulk] = useState(null) // { total, hechos } mientras corre
  const [bulkMsg, setBulkMsg] = useState(null) // { tipo: 'error' | 'ok', texto }

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
      // cacheStoreReference normaliza marcas y categorias internamente.
      cacheStoreReference({ categorias, marcas }).catch(() => {})
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

  const selectedItems = useMemo(() => items.filter((it) => selected.has(it.id)), [items, selected])

  // La marca de una categoria se deduce del producto que la usa, asi que
  // meterle productos de otra marca la deja mezclada y fuera de los carruseles.
  // Por eso la eleccion multiple se bloquea si la seleccion mezcla marcas.
  const selectedMarcaId = useMemo(() => {
    const ids = new Set(selectedItems.map((it) => it.marcaId))
    return ids.size === 1 ? [...ids][0] : null
  }, [selectedItems])

  const selectedMarcasDistintas = useMemo(
    () => new Set(selectedItems.map((it) => it.marcaId)).size > 1,
    [selectedItems]
  )

  const selectedMarcaNombre = useMemo(
    () => marcas.find((m) => m.id === selectedMarcaId)?.nombre ?? '',
    [marcas, selectedMarcaId]
  )

  const bulkCategorias = useMemo(() => {
    if (selectedMarcaId === null) return []
    return categorias.filter((c) => c.marcaId === selectedMarcaId)
  }, [categorias, selectedMarcaId])

  const todosSeleccionados =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  const toggleOne = (id) => {
    setBulkMsg(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setBulkMsg(null)
    setSelected(todosSeleccionados ? new Set() : new Set(filtered.map((p) => p.id)))
  }

  const limpiarSeleccion = () => {
    setBulkMsg(null)
    setBulkCategoriaId('')
    setSelected(new Set())
  }

  const aplicarBulkCategoria = async () => {
    const destino = categorias.find((c) => c.id === Number(bulkCategoriaId))
    if (!destino || selectedItems.length === 0 || selectedMarcasDistintas) return

    if (selectedItems.length > MAX_BULK) {
      setBulkMsg({
        tipo: 'error',
        texto: `La acción masiva está limitada a ${MAX_BULK} productos por vez. Tenés ${selectedItems.length} seleccionados: reducilos con el buscador.`,
      })
      return
    }

    const pendientes = selectedItems.filter((p) => p.categoriaId !== destino.id)
    const sinCambio = selectedItems.length - pendientes.length

    if (pendientes.length === 0) {
      setBulkMsg({
        tipo: 'error',
        texto: `Los ${selectedItems.length} productos seleccionados ya están en "${destino.nombre}".`,
      })
      return
    }

    const nota = sinCambio > 0 ? ` ${sinCambio} ya están en esa categoría y se saltan.` : ''
    const advertencia = pendientes.length > 20 ? '\n\nSon muchos productos y no se puede deshacer.' : ''
    if (
      !window.confirm(
        `¿Cambiar la categoría de ${pendientes.length} producto(s) a "${destino.nombre}"?${nota}${advertencia}`
      )
    ) {
      return
    }

    setBulkMsg(null)
    setBulk({ total: pendientes.length, hechos: 0 })

    const fallidos = []
    let hechos = 0
    let corte401 = false
    let corteMsg = null

    for (const p of pendientes) {
      try {
        await adminApi.updateProducto(
          token,
          p.id,
          adminApi.buildProductoForm(p, { categoriaId: destino.id })
        )
        hechos += 1
        setBulk((b) => (b ? { ...b, hechos: b.hechos + 1 } : b))
      } catch (err) {
        corte401 = err?.status === 401
        corteMsg = corte401
          ? { tipo: 'error', texto: 'La sesión se venció. Volvé a iniciar sesión y repetí la operación.' }
          : {
              tipo: 'error',
              texto: `Falló el cambio en "${p.codigo}": ${err?.message || 'error desconocido'}. Se cortó la operación; los ${hechos} productos anteriores sí quedaron actualizados.`,
            }
        if (!corte401) fallidos.push(p)
        break
      }
    }

    setBulk(null)

    if (corte401) {
      setSelected(new Set())
      setBulkCategoriaId('')
      setBulkMsg(corteMsg)
      return
    }

    await refresh()
    notifyCatalogChanged()

    if (fallidos.length > 0) {
      setSelected(new Set(fallidos.map((p) => p.id)))
      setBulkMsg(corteMsg)
      return
    }

    setSelected(new Set())
    setBulkCategoriaId('')
    setBulkMsg({
      tipo: 'ok',
      texto: `Se actualizaron ${hechos} producto(s) a "${destino.nombre}".`,
    })
  }

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

      {selected.size > 0 && (
        <div className="ac-bulkbar">
          <div className="ac-bulkbar-main">
            <strong>
              {selected.size === 1
                ? '1 producto seleccionado'
                : `${selected.size} productos seleccionados`}
            </strong>

            {selectedMarcasDistintas ? (
              <span className="ac-error">
                La selección mezcla varias marcas. Reducila a productos de una sola marca para poder
                aplicar el cambio.
              </span>
            ) : (
              <>
                <label className="ac-field">
                  <span>Nueva categoría</span>
                  <select
                    value={bulkCategoriaId}
                    onChange={(e) => setBulkCategoriaId(e.target.value)}
                    disabled={Boolean(bulk) || bulkCategorias.length === 0}
                  >
                    <option value="">Seleccionar...</option>
                    {bulkCategorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                {bulkCategorias.length === 0 && (
                  <span className="ac-hint">
                    {selectedMarcaNombre
                      ? `"${selectedMarcaNombre}" no tiene categorías asignadas. Creale una desde la pestaña Categorías.`
                      : 'La marca de esos productos no tiene categorías asignadas.'}
                  </span>
                )}

                <button
                  type="button"
                  className="ac-btn ac-btn-primary"
                  onClick={aplicarBulkCategoria}
                  disabled={Boolean(bulk) || bulkCategoriaId === ''}
                >
                  Aplicar categoría
                </button>

                <button
                  type="button"
                  className="ac-btn"
                  onClick={limpiarSeleccion}
                  disabled={Boolean(bulk)}
                >
                  Limpiar
                </button>
              </>
            )}
          </div>

          {bulk && (
            <div className="ac-upload" role="status" aria-live="polite">
              <div className="ac-upload-track">
                <div
                  className="ac-upload-fill"
                  style={{ width: `${Math.round((bulk.hechos / bulk.total) * 100)}%` }}
                />
              </div>
              <span className="ac-hint">
                Cambiando categoría... {bulk.hechos} de {bulk.total}
              </span>
            </div>
          )}

          {bulkMsg && (
            <p className={bulkMsg.tipo === 'error' ? 'ac-error' : 'ac-notice'}>{bulkMsg.texto}</p>
          )}
        </div>
      )}

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
                <th className="ac-col-select">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0 || Boolean(bulk)}
                    aria-label="Seleccionar todos los productos de la búsqueda"
                  />
                </th>
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
                  <td className="ac-col-select">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      disabled={Boolean(bulk)}
                      aria-label={`Seleccionar ${p.codigo}`}
                    />
                  </td>
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