import { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminApi from '../services/admin'

const empty = {
  codigo: '',
  modelo: '',
  nombre: '',
  descripcion: '',
  especificaciones: '',
  accesorios: '',
  categoriaId: '',
  marcaId: '',
}

function AdminProducts({ token }) {
  const [items, setItems] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [values, setValues] = useState(empty)
  const [file, setFile] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [list, marcasList, categoriasList] = await Promise.all([
        adminApi.getProductos(token),
        adminApi.getMarcas(token),
        adminApi.getCategorias(token),
      ])
      setItems(Array.isArray(list) ? list : [])
      setMarcas(Array.isArray(marcasList) ? marcasList : [])
      setCategorias(Array.isArray(categoriasList) ? categoriasList : [])
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      [it.nombre, it.codigo, it.modelo, it.marcaNombre, it.categoriaNombre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [items, query])

  useEffect(() => {
    if (!editing) return
    setValues(isNew ? empty : {
      codigo: editing.codigo ?? '',
      modelo: editing.modelo ?? '',
      nombre: editing.nombre ?? '',
      descripcion: editing.descripcion ?? '',
      especificaciones: editing.especificaciones ?? '',
      accesorios: editing.accesorios ?? '',
      categoriaId: editing.categoriaId ?? '',
      marcaId: editing.marcaId ?? '',
    })
    setFile(null)
  }, [editing, isNew])

  const openNew = () => {
    setEditing({})
    setIsNew(true)
    setFormError('')
  }

  const openEdit = (item) => {
    setEditing(item)
    setIsNew(false)
    setFormError('')
  }

  const closeForm = () => {
    setEditing(null)
    setFile(null)
    setFormError('')
  }

  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!values.nombre.trim() || !values.codigo.trim() || !values.modelo.trim()) {
      setFormError('Código, modelo y nombre son obligatorios')
      return
    }
    if (!values.categoriaId || !values.marcaId) {
      setFormError('Elegí una categoría y una marca')
      return
    }
    setFormBusy(true)
    setFormError('')
    const fd = new FormData()
    fd.append('codigo', values.codigo.trim())
    fd.append('modelo', values.modelo.trim())
    fd.append('nombre', values.nombre.trim())
    fd.append('descripcion', (values.descripcion || '').trim())
    fd.append('especificaciones', (values.especificaciones || '').trim())
    fd.append('accesorios', (values.accesorios || '').trim())
    fd.append('categoriaId', String(values.categoriaId))
    fd.append('marcaId', String(values.marcaId))
    if (file) fd.append('imagen', file)
    try {
      if (isNew) await adminApi.createProducto(token, fd)
      else await adminApi.updateProducto(token, editing.id, fd)
      closeForm()
      await refresh()
    } catch (err) {
      setFormError(err?.message || 'No se pudo guardar el producto')
    } finally {
      setFormBusy(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar el producto "${item.nombre}"?`)) return
    setError('')
    try {
      await adminApi.deleteProducto(token, item.id)
      await refresh()
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar')
    }
  }

  const removeImage = async () => {
    const urls = editing?.imagenes?.filter(Boolean) ?? []
    if (urls.length === 0) return
    if (!window.confirm('¿Eliminar el archivo de imagen de R2?')) return
    setFormError('')
    try {
      for (const url of urls) await adminApi.deleteImagen(token, url)
      setEditing((prev) => ({ ...prev, imagenes: [] }))
    } catch (err) {
      setFormError(err?.message || 'No se pudo eliminar la imagen')
    }
  }

  return (
    <section className="ac-card">
      <div className="ac-card-head">
        <h2>Productos</h2>
        <div className="ac-toolbar">
          <input
            type="search"
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
                  <td>{p.marcaNombre}</td>
                  <td>{p.categoriaNombre}</td>
                  <td className="ac-col-actions">
                    <button type="button" className="ac-btn" onClick={() => openEdit(p)}>
                      Editar
                    </button>
                    <button type="button" className="ac-btn ac-btn-danger" onClick={() => remove(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="ac-modal">
          <form className="ac-modal-card ac-modal-card-wide" onSubmit={submit}>
            <h3>{isNew ? 'Nuevo producto' : `Editar producto #${editing.id}`}</h3>

            <div className="ac-field">
              <span>Nombre *</span>
              <input type="text" value={values.nombre} onChange={(e) => change('nombre', e.target.value)} />
            </div>

            <div className="ac-grid-2">
              <label className="ac-field">
                <span>Código *</span>
                <input type="text" value={values.codigo} onChange={(e) => change('codigo', e.target.value)} />
              </label>
              <label className="ac-field">
                <span>Modelo *</span>
                <input type="text" value={values.modelo} onChange={(e) => change('modelo', e.target.value)} />
              </label>
            </div>

            <div className="ac-grid-2">
              <label className="ac-field">
                <span>Categoría *</span>
                <select value={values.categoriaId} onChange={(e) => change('categoriaId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="ac-field">
                <span>Marca *</span>
                <select value={values.marcaId} onChange={(e) => change('marcaId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="ac-field">
              <span>Descripción</span>
              <textarea value={values.descripcion} onChange={(e) => change('descripcion', e.target.value)} rows={3} />
            </label>

            <label className="ac-field">
              <span>Especificaciones</span>
              <textarea value={values.especificaciones} onChange={(e) => change('especificaciones', e.target.value)} rows={3} />
            </label>

            <label className="ac-field">
              <span>Accesorios</span>
              <textarea value={values.accesorios} onChange={(e) => change('accesorios', e.target.value)} rows={2} />
            </label>

            <div className="ac-field">
              <span>Imagen</span>
              {!isNew && editing?.imagenes?.find(Boolean) && (
                <div className="ac-img-preview">
                  <img src={editing.imagenes.find(Boolean)} alt="" />
                  <button type="button" className="ac-btn ac-btn-danger" onClick={removeImage}>
                    Quitar imagen
                  </button>
                </div>
              )}
              {isNew && (editing?.imagenes ?? []).length === 0 && (
                <div className="ac-img-preview">
                  <span className="ac-muted">Sin imagen cargada</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="ac-hint">{file ? `Archivo: ${file.name}` : (isNew ? 'Opcional: subí una imagen' : 'Opcional: reemplazar imagen actual')}</span>
            </div>

            {formError && <p className="ac-error">{formError}</p>}

            <div className="ac-modal-actions">
              <button type="button" className="ac-btn" onClick={closeForm}>
                Cancelar
              </button>
              <button type="submit" className="ac-btn ac-btn-primary" disabled={formBusy}>
                {formBusy ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default AdminProducts

