import { useCallback, useEffect, useMemo, useState } from 'react'

// Badge de un campo en la fila del listado. Resuelve el id contra las options
// del select; si el campo vino vacio lo marca para que se note sin abrir.
function rowBadge(f, item) {
  const opt = (f.options ?? []).find((o) => String(o.value) === String(item[f.name]))
  const vacio = item[f.name] === null || item[f.name] === undefined || item[f.name] === ''
  return (
    <span key={f.name} className={`ac-badge${vacio ? ' ac-badge-warn' : ''}`}>
      {vacio ? (f.emptyLabel ?? 'Sin asignar') : (opt?.label ?? String(item[f.name]))}
    </span>
  )
}

function SimpleCrud({ title, entityLabel, api, fields, onChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formValues, setFormValues] = useState({})
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')

  const imageField = fields.find((f) => f.type === 'file')?.name ?? 'imagen'

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api.fetchList()
      setItems(Array.isArray(list) ? list : [])
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (editing) {
      const base = {}
      // Los selects guardan strings: un id numérico o null desde la API
      // se castea para que value y onChange trabajen parejo.
      for (const f of fields) {
        base[f.name] = f.type === 'select' ? String(editing?.[f.name] ?? '') : (editing?.[f.name] ?? '')
      }
      setFormValues(base)
    }
  }, [editing, fields])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => JSON.stringify(it).toLowerCase().includes(q))
  }, [items, query])

  const openNew = () => {
    const base = {}
    for (const f of fields) base[f.name] = ''
    setFormValues(base)
    setFile(null)
    setPreview('')
    setIsNew(true)
    setEditing({})
    setFormError('')
  }

  const openEdit = (item) => {
    setEditing(item)
    setFile(null)
    setPreview('')
    setFormError('')
  }

  const closeForm = () => {
    setEditing(null)
    setIsNew(false)
    setFile(null)
    setPreview('')
    setFormError('')
  }

  const change = (name, value) => setFormValues((v) => ({ ...v, [name]: value }))

  // Le avisa a quien corresponda (p.ej. AdminPanel) la lista ya autoritativa.
  // Este componente no sabe nada del catálogo público.
  const notifyChange = async () => {
    if (!onChange) return
    try {
      const list = await api.fetchList()
      await onChange(Array.isArray(list) ? list : [])
    } catch {
      /* la lista local ya quedó actualizada */
    }
  }

  const pickFile = (e) => {
    const picked = e.target.files?.[0] ?? null
    e.target.value = ''
    setFile(picked)
    setPreview(picked ? URL.createObjectURL(picked) : '')
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormBusy(true)
    setFormError('')
    try {
      let values = {}
      // Los campos type:'file' no van en values: se pasan aparte como File.
      for (const f of fields) {
        if (f.type === 'file') continue
        // String() porque un select puede sembrarse con un number desde la API
        // y los number no tienen .trim() -> TypeError.
        values[f.name] = String(formValues[f.name] ?? '').trim()
      }
      if (isNew) {
        const missing = fields.find((f) => f.required && !values[f.name])
        if (missing) throw new Error('Faltan campos obligatorios')
        const created = await api.create(values, file)
        if (created && typeof created.id !== 'undefined') {
          setItems((prev) => [created, ...prev])
        } else {
          await refresh()
        }
      } else {
        await api.update(editing.id, values, file)
        if (file) {
          // El PUT responde 204, asi que la URL nueva solo se conoce refetchando.
          await refresh()
        } else {
          const patch = {}
          for (const f of fields) {
            // Los files no entran en values: si se saltaran, patch[f.name]
            // seria undefined y pisaria el logo existente con null.
            if (f.type === 'password' || f.type === 'file') continue
            patch[f.name] = values[f.name]
          }
          setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...patch } : it)))
        }
      }
      await notifyChange()
      closeForm()
    } catch (err) {
      if (err?.status !== 401) setFormError(err?.message || 'No se pudo guardar')
    } finally {
      setFormBusy(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar ${entityLabel} "${item.nombre}"?`)) return
    setError('')
    try {
      await api.remove(item.id)
      setItems((prev) => prev.filter((it) => it.id !== item.id))
      await notifyChange()
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'No se pudo eliminar')
    }
  }

  return (
    <section className="ac-card">
      <div className="ac-card-head">
        <h2>{title}</h2>
        <div className="ac-toolbar">
          <input
            type="search"
            className="ac-search"
            placeholder={`Buscar ${entityLabel}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="ac-btn ac-btn-primary" onClick={openNew}>
            + Nuevo {entityLabel}
          </button>
        </div>
      </div>

      {error && <p className="ac-error">{error}</p>}

      {loading ? (
        <p className="ac-muted">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="ac-muted">No hay {entityLabel}s.</p>
      ) : (
        <div className="ac-list">
          {filtered.map((item) => (
            <div key={item.id} className="ac-row">
              {item[imageField] && (
                <img className="ac-thumb" src={item[imageField]} alt="" loading="lazy" />
              )}
              <div className="ac-row-main">
                <strong>{item.nombre}</strong>
                <span className="ac-muted">ID {item.id}</span>
                {fields.filter((f) => f.showInRow).map((f) => rowBadge(f, item))}
              </div>
              <div className="ac-row-actions">
                <button type="button" className="ac-btn" onClick={() => openEdit(item)}>
                  Editar
                </button>
                <button type="button" className="ac-btn ac-btn-danger" onClick={() => remove(item)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="ac-modal">
          <form className="ac-modal-card" onSubmit={submit}>
            <h3>{isNew ? `Nuevo ${entityLabel}` : `Editar ${entityLabel}`}</h3>

            {fields.map((f) =>
              f.type === 'file' ? (
                <div key={f.name} className="ac-field">
                  <span>{f.label}</span>
                  {(preview || editing?.[f.name]) && (
                    <img
                      className="ac-file-preview"
                      src={preview || editing?.[f.name]}
                      alt=""
                    />
                  )}
                  <input
                    type="file"
                    accept={f.accept || 'image/*'}
                    onChange={pickFile}
                    disabled={formBusy}
                  />
                  <span className="ac-hint">
                    {f.hint ??
                      (editing?.[f.name]
                        ? 'Elegir un archivo reemplaza el logo actual.'
                        : 'Opcional.')}
                  </span>
                </div>
              ) : f.type === 'select' ? (
                <label key={f.name} className="ac-field">
                  <span>{f.label}{f.required ? ' *' : ''}</span>
                  <select
                    value={formValues[f.name] ?? ''}
                    onChange={(e) => change(f.name, e.target.value)}
                    disabled={formBusy}
                    required={f.required}
                  >
                    <option value="">{f.placeholder ?? 'Seleccionar...'}</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label key={f.name} className="ac-field">
                  <span>{f.label}{f.required ? ' *' : ''}</span>
                  <input
                    type={f.type || 'text'}
                    value={formValues[f.name] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => change(f.name, e.target.value)}
                    autoComplete="off"
                    required={isNew && f.required}
                  />
                </label>
              )
            )}

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

export default SimpleCrud