import { useCallback, useEffect, useMemo, useState } from 'react'

function SimpleCrud({ title, entityLabel, api, fields }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formValues, setFormValues] = useState({})

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
      for (const f of fields) base[f.name] = editing?.[f.name] ?? ''
      setFormValues(base)
    }
  }, [editing, fields])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => JSON.stringify(it).toLowerCase().includes(q))
  }, [items, query])

  const openNew = () => {
    const base = {}
    for (const f of fields) base[f.name] = ''
    setFormValues(base)
    setIsNew(true)
    setEditing({})
    setFormError('')
  }

  const openEdit = (item) => {
    setEditing(item)
    setIsNew(false)
    setFormError('')
  }

  const closeForm = () => {
    setEditing(null)
    setIsNew(false)
    setFormError('')
  }

  const change = (name, value) => setFormValues((v) => ({ ...v, [name]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setFormBusy(true)
    setFormError('')
    try {
      let values = {}
      for (const f of fields) values[f.name] = formValues[f.name]?.trim() ?? ''
      if (isNew) {
        const missing = fields.find((f) => f.required && !values[f.name])
        if (missing) throw new Error('Faltan campos obligatorios')
        const created = await api.create(values)
        if (created && typeof created.id !== 'undefined') {
          setItems((prev) => [created, ...prev])
        } else {
          await refresh()
        }
      } else {
        await api.update(editing.id, values)
        const patch = {}
        for (const f of fields) {
          if (f.type !== 'password') patch[f.name] = values[f.name]
        }
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...patch } : it)))
      }
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
              <div className="ac-row-main">
                <strong>{item.nombre}</strong>
                <span className="ac-muted">ID {item.id}</span>
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

            {fields.map((f) => (
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
            ))}

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