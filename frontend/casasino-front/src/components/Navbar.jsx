import { useState } from 'react'
import { brandMeta, isLightColor } from '../utils/brand'

function Navbar({
  marcas,
  activeBrand,
  activeCategoria,
  categorias,
  onSelectBrand,
  onSelectCat,
  search,
  onSearch,
  counts,
  loading,
  showAdmin,
  onAdmin,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openBrand, setOpenBrand] = useState(null)

  const tabStyle = (key, active) => {
    if (!active) return undefined
    const color = brandMeta[key]?.color ?? '#0f172a'
    return {
      ['--tab-color']: color,
      ['--tab-text']: isLightColor(color) ? '#000' : '#fff',
    }
  }

  const closeMenu = () => setMenuOpen(false)

  const selectAll = () => {
    setMenuOpen(false)
    onSelectBrand('all')
  }

  const selectBrand = (key) => {
    onSelectBrand(key)
    setOpenBrand(key)
  }

  const toggleBrandCats = (key) => {
    setOpenBrand((v) => (v === key ? null : key))
  }

  const selectCategory = (slug) => {
    setMenuOpen(false)
    onSelectCat(slug)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={selectAll}>
          <img className="brand-logo" src="/img/logo_casa_nino.png" alt="Casa Nino" />
          <div className="brand-text">
            <strong>Casa Nino</strong>
            <small>Catálogo de herramientas</small>
          </div>
        </div>

        <nav className="brand-tabs" aria-label="Marcas">
          <button
            type="button"
            className={`brand-tab${activeBrand === 'all' ? ' active' : ''}`}
            style={tabStyle('all', activeBrand === 'all')}
            onClick={() => onSelectBrand('all')}
            disabled={loading}
          >
            <span>Todos</span>
            <span className="count">{loading ? '…' : (counts.all ?? 0)}</span>
          </button>
          {marcas.map((m) => (
            <button
              key={m.nombre}
              type="button"
              className={`brand-tab${activeBrand === m.nombre ? ' active' : ''}`}
              style={tabStyle(m.nombre, activeBrand === m.nombre)}
              onClick={() => onSelectBrand(m.nombre)}
              disabled={loading}
            >
              <span>{m.nombre}</span>
              <span className="count">{loading ? '…' : (counts[m.nombre] ?? 0)}</span>
            </button>
          ))}
        </nav>

        <div className="search">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Buscar productos"
            disabled={loading}
          />
          {search && (
            <button type="button" className="clear" onClick={() => onSearch('')}>
              x
            </button>
          )}
        </div>

        {showAdmin && (
          <button type="button" className="brand-tab admin-link" onClick={onAdmin}>
            <span>Panel</span>
          </button>
        )}

        <button
          type="button"
          className={`nav-burger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-menu${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="nav-menu-inner">
          <div className="search">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Buscar productos"
              disabled={loading}
            />
            {search && (
              <button type="button" className="clear" onClick={() => onSearch('')}>
                x
              </button>
            )}
          </div>

          <nav className="nav-menu-nav" aria-label="Marcas y categorías">
            <button
              type="button"
              className={`brand-tab nav-menu-all${activeBrand === 'all' && !activeCategoria ? ' active' : ''}`}
              onClick={selectAll}
              disabled={loading}
            >
              <span>Todos los productos</span>
              <span className="count">{loading ? '…' : (counts.all ?? 0)}</span>
            </button>

            {marcas.map((m) => {
              const cats = categorias.filter((c) => c.marca === m.nombre)
              const brandActive = activeBrand === m.nombre
              return (
                <div className="nav-menu-group" key={m.nombre}>
                  <div className="nav-menu-brand-row">
                    <button
                      type="button"
                      className={`brand-tab nav-menu-brand${brandActive ? ' active' : ''}`}
                      style={tabStyle(m.nombre, brandActive)}
                      onClick={() => selectBrand(m.nombre)}
                      disabled={loading}
                    >
                      <span>{m.nombre}</span>
                      <span className="count">{loading ? '…' : (counts[m.nombre] ?? 0)}</span>
                    </button>
                    {cats.length > 0 && (
                      <button
                        type="button"
                        className={`nav-chevron${openBrand === m.nombre ? ' open' : ''}`}
                        onClick={() => toggleBrandCats(m.nombre)}
                        aria-label={`Categorías de ${m.nombre}`}
                        aria-expanded={openBrand === m.nombre}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {openBrand === m.nombre && cats.length > 0 && (
                    <div className={`nav-menu-cats${openBrand === m.nombre ? ' open' : ''}`}>
                      {cats.map((c) => {
                        const catActive = brandActive && activeCategoria === c.slug
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            className={`brand-tab nav-menu-cat${catActive ? ' active' : ''}`}
                            style={tabStyle(m.nombre, catActive)}
                            onClick={() => selectCategory(c.slug)}
                          >
                            <span>{c.nombre}</span>
                            <span className="count">{c.count ?? 0}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {showAdmin && (
            <button
              type="button"
              className="brand-tab admin-link nav-menu-admin"
              onClick={() => {
                setMenuOpen(false)
                onAdmin()
              }}
            >
              <span>Panel</span>
            </button>
          )}

          <button type="button" className="nav-menu-close" onClick={closeMenu}>
            Cerrar
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar