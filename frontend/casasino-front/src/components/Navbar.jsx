import { useEffect, useRef, useState } from 'react'
import { brandMeta, isLightColor } from '../utils/brand'

function Navbar({ marcas, activeBrand, onSelectBrand, search, onSearch, counts, loading, showAdmin, onAdmin, onSearchSubmit, onSearchTyping }) {
  const [open, setOpen] = useState(false)
  const [brandsOpen, setBrandsOpen] = useState(false)
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

  const close = () => {
    setOpen(false)
    setBrandsOpen(false)
  }

  useEffect(() => {
    if (!open && !brandsOpen) return undefined
    const onDoc = (e) => {
      if (innerRef.current && !innerRef.current.contains(e.target)) close()
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open, brandsOpen])

  useEffect(() => {
    if (!open && !brandsOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, brandsOpen])

  const pick = (fn, arg) => {
    close()
    fn(arg)
  }

  return (
    <header className={`navbar${open ? ' nav-open' : ''}`}>
      <div className="navbar-inner" ref={innerRef}>
        <div className="brand" onClick={() => pick(onSelectBrand, 'all')}>
          <img
            className="brand-logo"
            src="/img/logo_casa_nino.webp"
            alt="Casa Nino"
            width="463"
            height="448"
            fetchPriority="high"
            decoding="async"
          />
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
            onClick={() => pick(onSelectBrand, 'all')}
            disabled={loading}
          >
            <span>Todos</span>
            <span className="count">{loading ? '…' : (counts.all ?? 0)}</span>
          </button>

          {marcas.length > 0 && (
            <button
              type="button"
              className={`brand-tab nav-brands-trigger${brandsOpen ? ' open' : ''}`}
              aria-expanded={brandsOpen}
              aria-controls="nav-brands-panel"
              onClick={() => setBrandsOpen((v) => !v)}
              disabled={loading}
            >
              <span>Todas nuestras marcas</span>
              <span className="nav-brands-caret" aria-hidden="true">
                ▾
              </span>
            </button>
          )}

          {brandsOpen && marcas.length > 0 && (
            <div
              className="nav-brands-panel"
              id="nav-brands-panel"
              role="group"
              aria-label="Todas nuestras marcas"
            >
              <div className="nav-brands-list">
                {marcas.map((m) => (
                  <button
                    key={m.nombre}
                    type="button"
                    className={`brand-tab${activeBrand === m.nombre ? ' active' : ''}`}
                    style={tabStyle(m.nombre, activeBrand === m.nombre)}
                    onClick={() => pick(onSelectBrand, m.nombre)}
                    disabled={loading}
                  >
                    <span>{m.nombre}</span>
                    <span className="count">{loading ? '…' : (counts[m.nombre] ?? 0)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="search">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => {
              onSearch(e.target.value)
              onSearchTyping?.(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearchSubmit?.()
              }
            }}
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
              onChange={(e) => {
                onSearch(e.target.value)
                onSearchTyping?.(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSearchSubmit?.()
                  close()
                }
              }}
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
                onClick={() => pick(onAdmin)}
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