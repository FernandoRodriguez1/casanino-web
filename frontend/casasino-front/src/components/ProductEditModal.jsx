import { useEffect, useRef, useState } from 'react'
import * as adminApi from '../services/admin'
import { removeWhiteBackground } from '../utils/background'

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

function ProductEditModal({ token, producto, marcas, categorias, onClose, onSaved }) {
  const isNew = !producto || typeof producto.id !== 'number'
  const [values, setValues] = useState(empty)
  const [items, setItems] = useState([]) // [{ kind: 'url', url } | { kind: 'file', file, blob, url, processed }]
  const [removedUrls, setRemovedUrls] = useState([]) // [url]
  const [dragIndex, setDragIndex] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removeBg, setRemoveBg] = useState(true)
  const [processing, setProcessing] = useState(false)

  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const revokeAll = () => {
    for (const item of itemsRef.current) {
      if (item.kind === 'file') URL.revokeObjectURL(item.url)
    }
  }

  useEffect(() => {
    setValues({
      codigo: producto?.codigo ?? '',
      modelo: producto?.modelo ?? '',
      nombre: producto?.nombre ?? '',
      descripcion: producto?.descripcion ?? '',
      especificaciones: producto?.especificaciones ?? '',
      accesorios: producto?.accesorios ?? '',
      categoriaId: String(producto?.categoriaId ?? ''),
      marcaId: String(producto?.marcaId ?? ''),
    })
    revokeAll()
    setItems((producto?.imagenes ?? []).filter(Boolean).map((url) => ({ kind: 'url', url })))
    setRemovedUrls([])
    setError('')
    setDragIndex(null)
  }, [producto])

  useEffect(
    () => () => {
      revokeAll()
    },
    []
  )

  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const handlePick = async (e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return
    e.target.value = ''
    setProcessing(true)
    const next = []
    for (const file of picked) {
      try {
        if (removeBg) {
          const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
          const blob = await removeWhiteBackground(bmp)
          bmp.close()
          if (blob) {
            next.push({ kind: 'file', file, blob, url: URL.createObjectURL(blob), processed: true })
            continue
          }
        }
      } catch (err) {
        console.warn('No se pudo quitar el fondo:', err)
      }
      const raw = URL.createObjectURL(file)
      next.push({ kind: 'file', file, blob: file, url: raw, processed: false })
    }
    setItems((prev) => [...prev, ...next])
    setProcessing(false)
  }

  const removeItem = (index) => {
    const item = items[index]
    if (!item) return
    if (item.kind === 'url') {
      setRemovedUrls((prev) => (prev.includes(item.url) ? prev : [...prev, item.url]))
      setItems((prev) => prev.filter((_, i) => i !== index))
    } else {
      URL.revokeObjectURL(item.url)
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const restoreItem = (url) => {
    setRemovedUrls((prev) => prev.filter((u) => u !== url))
    setItems((prev) => [...prev, { kind: 'url', url }])
  }

  const onDragStart = (index) => setDragIndex(index)
  const onDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setDragIndex(null)
  }

  const fileItems = items.filter((i) => i.kind === 'file')

  const submit = async (e) => {
    e.preventDefault()
    if (!values.codigo.trim() || !values.nombre.trim()) {
      setError('Código y nombre son obligatorios')
      return
    }
    if (!values.categoriaId || !values.marcaId) {
      setError('Elegí una categoría y una marca')
      return
    }
    setBusy(true)
    setError('')
    const fd = new FormData()
    fd.append('codigo', values.codigo.trim())
    fd.append('modelo', values.modelo.trim())
    fd.append('nombre', values.nombre.trim())
    fd.append('descripcion', (values.descripcion || '').trim())
    fd.append('especificaciones', (values.especificaciones || '').trim())
    fd.append('accesorios', (values.accesorios || '').trim())
    fd.append('categoriaId', String(values.categoriaId))
    fd.append('marcaId', String(values.marcaId))

    if (isNew) {
      for (const item of items) {
        if (item.kind === 'file') fd.append('Imagenes', item.blob ?? item.file, item.file.name)
      }
    } else {
      let i = 0
      for (const item of items) {
        if (item.kind === 'file') {
          fd.append('Imagenes', item.blob ?? item.file, item.file.name)
          fd.append('ImagenesOrden', `new:${i++}`)
        } else {
          fd.append('ImagenesOrden', item.url)
        }
      }
    }
    for (const url of removedUrls) fd.append('ImagenesEliminar', url)

    try {
      const saved = isNew
        ? await adminApi.createProducto(token, fd)
        : await adminApi.updateProducto(token, producto.id, fd)
      onSaved?.(saved, producto?.id)
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el producto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ac-modal" role="dialog" aria-modal="true">
      <form className="ac-modal-card ac-modal-card-wide" onSubmit={submit}>
        <h3>{isNew ? 'Nuevo producto' : `Editar producto #${producto.id}`}</h3>

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
            <span>Modelo (opcional)</span>
            <input type="text" value={values.modelo} onChange={(e) => change('modelo', e.target.value)} />
          </label>
        </div>

        <div className="ac-grid-2">
          <label className="ac-field">
            <span>Categoría *</span>
            <select value={values.categoriaId} onChange={(e) => change('categoriaId', e.target.value)}>
              <option value="">Seleccionar...</option>
              {(categorias || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Marca *</span>
            <select value={values.marcaId} onChange={(e) => change('marcaId', e.target.value)}>
              <option value="">Seleccionar...</option>
              {(marcas || []).map((m) => (
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
          <span>Fotos</span>

          {items.length === 0 && removedUrls.length === 0 && (
            <div className="ac-img-grid">
              <span className="ac-muted">Sin foto cargada</span>
            </div>
          )}

          {items.length > 0 && (
            <>
              <span className="ac-hint">
                La primera foto es la portada del catálogo. Arrastrá para reordenar.
              </span>
              <div className="ac-img-grid">
                {items.map((item, index) => (
                  <div
                    key={item.url}
                    className={`ac-photo${item.kind === 'file' ? ' ac-photo-new' : ''}${item.kind === 'file' && item.processed ? ' ac-photo-bgless' : ''}${dragIndex === index ? ' ac-photo-dragging' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(index)}
                  >
                    <img className={item.kind === 'file' && item.processed ? 'ac-photo-checker' : undefined} src={item.url} alt="" />
                    {index === 0 && <b className="ac-photo-cover">Portada</b>}
                    {item.kind === 'file' && item.processed && <b className="ac-photo-badge">fondo removido</b>}
                    <button type="button" onClick={() => removeItem(index)}>
                      {item.kind === 'url' ? 'Quitar' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {removedUrls.length > 0 && (
            <>
              <span className="ac-hint">
                {removedUrls.length === 1 ? '1 foto marcada para quitar:' : `${removedUrls.length} fotos marcadas para quitar:`}
              </span>
              <div className="ac-img-grid">
                {removedUrls.map((url) => (
                  <div key={url} className="ac-photo ac-photo-remove">
                    <img src={url} alt="" />
                    <button type="button" onClick={() => restoreItem(url)}>
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {processing && (
            <span className="ac-hint">Procesando fotos (quitando fondo)...</span>
          )}

          {isNew === false && removedUrls.length + fileItems.length > 0 && (
            <span className="ac-hint">
              {removedUrls.length > 0 && `${removedUrls.length} foto(s) a quitar. `}
              {fileItems.length > 0 && `${fileItems.length} foto(s) nueva(s) a subir. `}
              Se guardarán al confirmar.
            </span>
          )}

          {isNew && fileItems.length > 0 && (
            <span className="ac-hint">{fileItems.length} foto(s) a subir. Se guardarán al confirmar.</span>
          )}

          <label className="ac-check">
            <input
              type="checkbox"
              checked={removeBg}
              onChange={(e) => setRemoveBg(e.target.checked)}
            />
            <span>Quitar fondo blanco automáticamente (WebP con transparencia). Se aplica a las fotos que elijas a continuación.</span>
          </label>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePick}
          />
        </div>

        {error && <p className="ac-error">{error}</p>}

        <div className="ac-modal-actions">
          <button type="button" className="ac-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="ac-btn ac-btn-primary" disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductEditModal