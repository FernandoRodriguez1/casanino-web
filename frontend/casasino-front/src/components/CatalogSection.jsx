import ProductCard from './ProductCard'

function CatalogSection({
  categoriaMeta,
  activeBrand,
  marcas,
  filtered,
  search,
  headingColor,
  onClearCategoria,
  onOpen,
  onClearSearch,
  loadedCount,
  totalCount,
  isFullCatalog,
  onLoadFull,
}) {
  const isAll = activeBrand === 'all'

  return (
    <section className="catalog">
      <section className="heading">
        <h1 style={{ color: headingColor }}>
          {categoriaMeta
            ? categoriaMeta.nombre
            : isAll
              ? 'Catálogo completo'
              : activeBrand}
        </h1>
        <p>
          {categoriaMeta
            ? `${categoriaMeta.count} productos en esta categoría`
            : isAll
              ? `Todos los productos de las ${marcas.length} marcas`
              : `Productos de la marca ${activeBrand}`}
          {search.trim() && (
            <span className="filter-note"> — buscando: “{search.trim()}”</span>
          )}
          <span className="filter-note strong">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </p>
        {categoriaMeta && (
          <p>
            <button type="button" className="clear-cat" onClick={onClearCategoria}>
              Quitar filtro de categoría
            </button>
          </p>
        )}
        {isAll && !isFullCatalog && (
          <button type="button" className="load-full" onClick={onLoadFull}>
            <span className="load-full-text">Cargar catálogo completo</span>
            <span className="load-full-sub">
              Mostrando {loadedCount} de {totalCount} productos
            </span>
          </button>
        )}
      </section>

      {!categoriaMeta && (
        <section
          className="band"
          style={{
            backgroundImage: 'url(/img/band-1200.png)',
          }}
        >
          <div className="band-overlay">
            <span className="hero-kicker">Herramientas a batería</span>
            <strong>Tecnología y potencia en cada trabajo</strong>
          </div>
        </section>
      )}

      {filtered.length ? (
        <section className="grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} producto={p} onOpen={onOpen} />
          ))}
        </section>
      ) : (
        <section className="empty">
          <h2>Sin resultados</h2>
          <p>No encontramos productos que coincidan con tu búsqueda.</p>
          <button type="button" onClick={onClearSearch}>
            Limpiar búsqueda
          </button>
        </section>
      )}
    </section>
  )
}

export default CatalogSection