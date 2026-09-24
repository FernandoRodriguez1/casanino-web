import { getBrandColor, initials, isLightColor } from '../utils/brand'

function qualityLine(producto) {
  if (producto.especificaciones) {
    const first = producto.especificaciones.split('.')[0].trim()
    if (first) return first
  }
  if (producto.categoria) return producto.categoria
  return producto.marcaNombre
}

function ProductCard({ producto, onOpen }) {
  const color = getBrandColor(producto.marcaNombre)
  const img = producto.imagenes?.find(Boolean)
  const thumbText = isLightColor(color) ? '#000' : '#fff'

  return (
    <article className="card" tabIndex={-1} onClick={() => onOpen(producto.id)}>
      <div className="thumb" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: thumbText }}>
        {img ? (
          <img src={img} alt={producto.nombre} loading="lazy" decoding="async" />
        ) : (
          <span className="thumb-fallback">{initials(producto.marcaNombre)}</span>
        )}
        <span className="brand-badge" style={{ background: color, color: thumbText }}>{producto.marcaNombre}</span>
      </div>
      <div className="card-body">
        <h3>{producto.nombre}</h3>
        <p className="quality">{qualityLine(producto)}</p>
        <div className="card-foot">
          <span className="card-code">
            {producto.codigo ? `Código ${producto.codigo}` : 'Sin código'}
          </span>
          <span className="card-link">Ver detalle →</span>
        </div>
      </div>
    </article>
  )
}

export default ProductCard