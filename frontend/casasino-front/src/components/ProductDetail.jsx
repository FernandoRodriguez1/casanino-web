import { useState } from 'react'
import { getBrandColor, initials, isLightColor } from '../utils/brand'
import { productWhatsappMessage, whatsappUrl } from '../utils/contact'

function formatSpecs(text) {
  if (!text) return []
  return text
    .split(/(?<!\d)\.\s+(?=[A-ZÁÉÍÓÚ])/)
    .map((s) => s.replace(/\.\s*$/, '').trim())
    .map((s) => s.replace(/\s+/g, ' '))
    .filter(Boolean)
}

function DetailInfo({ producto, onBack, onEdit }) {
  const color = getBrandColor(producto.marcaNombre)
  const badgeText = isLightColor(color) ? '#000' : '#fff'
  const imgs = producto.imagenes?.filter(Boolean) ?? []
  const [current, setCurrent] = useState(0)
  const specs = formatSpecs(producto.especificaciones)

  return (
    <div className="detail" style={{ ['--accent-detail']: color }}>
      <div className="detail-top">
        <div className="detail-back">
          <button type="button" onClick={onBack}>
            ← Volver al catálogo
          </button>
        </div>
        {onEdit && (
          <button type="button" className="detail-edit" onClick={onEdit}>
            Editar producto
          </button>
        )}
      </div>

      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-main">
            {imgs.length ? (
              <img src={imgs[current]} alt={producto.nombre} />
            ) : (
              <span className="thumb-fallback" style={{ color: badgeText }}>{initials(producto.marcaNombre)}</span>
            )}
            {imgs.length > 1 && (
              <div className="thumb-nav">
                <button type="button" onClick={() => setCurrent((i) => (i - 1 + imgs.length) % imgs.length)} aria-label="Imagen anterior">‹</button>
                <span className="thumb-count">{current + 1}/{imgs.length}</span>
                <button type="button" onClick={() => setCurrent((i) => (i + 1) % imgs.length)} aria-label="Imagen siguiente">›</button>
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="detail-thumbs">
              {imgs.map((im, i) => (
                <button
                  key={im}
                  type="button"
                  className={`detail-thumb${i === current ? ' active' : ''}`}
                  onClick={() => setCurrent(i)}
                >
                  <img src={im} alt={`Vista ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-tags">
            <span className="brand-badge-static" style={{ background: color, color: badgeText }}>{producto.marcaNombre}</span>
            <span className="categoria-static">{producto.categoria}</span>
          </div>
          <h1>{producto.nombre}</h1>
          <div className="detail-meta">
            {producto.codigo && <span>Código: <strong>{producto.codigo}</strong></span>}
            {producto.modelo && <span>Modelo: <strong>{producto.modelo}</strong></span>}
          </div>
          {producto.descripcion && <p className="detail-desc">{producto.descripcion}</p>}

          <a
            className="detail-wa"
            href={whatsappUrl(productWhatsappMessage(producto))}
            target="_blank"
            rel="noreferrer"
          >
            Consultar a WhatsApp
          </a>
        </div>
      </div>

      <div className="detail-sections">
        {specs.length > 0 && (
          <section className="detail-section">
            <h2>Especificaciones</h2>
            <ul className="spec-list">
              {specs.map((s) => {
                const [k, ...rest] = s.split(':')
                const value = rest.join(':').trim()
                return value ? (
                  <li key={s}>
                    <span className="spec-key">{k.replace(/^\./, '').trim()}:</span>
                    <span>{value}</span>
                  </li>
                ) : (
                  <li key={s}><span>{s}</span></li>
                )
              })}
            </ul>
          </section>
        )}

        {producto.accesorios && (
          <section className="detail-section">
            <h2>Accesorios incluidos</h2>
            <p className="accesorios-text">{producto.accesorios}</p>
          </section>
        )}
      </div>
    </div>
  )
}

export default DetailInfo