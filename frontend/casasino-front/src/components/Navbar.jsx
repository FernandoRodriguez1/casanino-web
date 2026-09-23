import { useEffect, useRef, useState } from 'react'
import { brandMeta, isLightColor } from '../utils/brand'

function Navbar({ marcas, activeBrand, onSelectBrand, search, onSearch, counts, loading, showAdmin, onAdmin }) {
  const [open, setOpen] = useState(false)
  const innerRef = useRef(null)

  const tabs = [
    { key: 'all', label: 'Todos' },
    ...marcas.map((m) => ({ key: m.nombre, label: m.nombre })),
  ]

  const tabStyle = (key, active) => {
    if (!active) return undefined
    const color = brandMeta[key]?.color ?? '#0f172a'
    return {
      ['--tab-color']: color,
      ['--tab-text']: isLightColor(color) ? '#000' : '#fff',
    }
  }

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (innerRef.current && !innerRef.current.contains(e.target)) close()
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  const pick = (fn, arg) => {
    close()
    fn(arg)
  }

  return (
    <header className={`navbar${open ? ' nav-open' : ''}`}>
      <div className="navbar-inner" ref={innerRef}>
        <div className="brand" onClick={() => pick(onSelectBrand, 'all')}>
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
              className={`brand-tab${activeBrand === tab.key ? ' active' : ''}`}
              style={tabStyle(tab.key, activeBrand === tab.key)}
              onClick={() => pick(onSelectBrand, tab.key)}
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
          className="nav-burger"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-menu${open ? ' open' : ''}`}>
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

          <div className="nav-menu-list">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`nav-menu-btn${activeBrand === tab.key ? ' active' : ''}`}
                style={tabStyle(tab.key, activeBrand === tab.key)}
                onClick={() => pick(onSelectBrand, tab.key)}
                disabled={loading}
              >
                <span>{tab.label}</span>
                <span className="count">{loading ? '…' : (counts[tab.key] ?? 0)}</span>
              </button>
            ))}
            {showAdmin && (
              <button
                type="button"
                className="nav-menu-btn nav-menu-cta"
                onClick={pick(onAdmin)}
              >
                <span>Panel de administración</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar