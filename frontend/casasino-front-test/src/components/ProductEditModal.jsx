import { useEffect, useState } from 'react'
import * as adminApi from '../services/admin'
import { sortImagesForDisplay } from '../utils/images'
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
  const [imgUrls, setImgUrls] = useState([])
  const [pending, setPending] = useState([]) // [{ file, blob, url, processed }]
  const [toRemove, setToRemove] = useState([]) // [url]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removeBg, setRemoveBg] = useState(true)
  const [processing, setProcessing] = useState(false)

  const revokeAll = () => {
    setPending((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.url)
      return []
    })
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
    setImgUrls(sortImagesForDisplay(producto?.imagenes))
    setToRemove([])
    revokeAll()
    setError('')
  }, [producto])

  useEffect(() => () => revokeAll(), [])

  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const handlePick = async (e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return
    e.target.value = ''
    setProcessing(true)
    const items = []
    for (const file of picked) {
      try {
        if (removeBg) {
          const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
          const blob = await removeWhiteBackground(bmp)
          bmp.close()
          if (blob) {
            items.push({ file, blob, url: URL.createObjectURL(blob), processed: true })
            continue
          }
        }
      } catch (err) {
        console.warn('No se pudo quitar el fondo:', err)
      }
      const raw = URL.createObjectURL(file)
      items.push({ file, blob: file, url: raw, processed: false })
    }
    setPending((prev) => [...prev, ...items])
    setProcessing(false)
  }

  const dropPending = (url) => {
    URL.revokeObjectURL(url)
    setPending((prev) => prev.filter((p) => p.url !== url))
  }

  const toggleRemove = (url) => {
    setToRemove((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))
  }

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
    for (const p of pending) fd.append('Imagenes', p.blob, p.file.name)
    for (const url of toRemove) fd.append('ImagenesEliminar', url)
    try {
      if (isNew) await adminApi.createProducto(token, fd)
      else await adminApi.updateProducto(token, producto.id, fd)
      onSaved?.(producto?.id)
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
          <span>Fotos nuevas</span>

          {imgUrls.length === 0 && pending.length === 0 && (
            <div className="ac-img-grid">
              <span className="ac-muted">Sin foto cargada</span>
            </div>
          )}

          {imgUrls.length > 0 && (
            <>
              <span className="ac-hint">Fotos actuales del producto (marcá "Quitar" para desvincularlas al guardar):</span>
              <div className="ac-img-grid">
                {imgUrls.map((u) => {
                  const marked = toRemove.includes(u)
                  return (
                    <div key={u} className={`ac-photo${marked ? ' ac-photo-remove' : ''}`}>
                      <img src={u} alt="" />
                      {isNew ? null : (
                        <button type="button" onClick={() => toggleRemove(u)}>
                          {marked ? 'Restaurar' : 'Quitar'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {processing && (
            <span className="ac-hint">Procesando fotos (quitando fondo)...</span>
          )}

          {pending.length > 0 && (
            <>
              <span className="ac-hint">
                {pending.length === 1 ? '1 foto nueva:' : `${pending.length} fotos nuevas:`}
              </span>
              <div className="ac-img-grid">
                {pending.map((p) => (
                  <div key={p.url} className={`ac-photo ac-photo-new${p.processed ? ' ac-photo-bgless' : ''}`}>
                    <img className="ac-photo-checker" src={p.url} alt="" />
                    {p.processed && <b className="ac-photo-badge">fondo removido</b>}
                    <button type="button" onClick={() => dropPending(p.url)}>✕</button>
                  </div>
                ))}
              </div>
              <span className="ac-hint">
                Se subirán al guardar. {toRemove.length > 0 && `${toRemove.length} foto(s) actual(es) marcada(s) "a quitar".`}
              </span>
            </>
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