import { brandMeta, isLightColor } from '../utils/brand'

function Navbar({ marcas, activeBrand, onSelectBrand, search, onSearch, counts, loading, showAdmin, onAdmin }) {
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

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => onSelectBrand('all')}>
          <img className="brand-logo" src="/img/logo_casa_nino.png" alt="Casa Nino" />
          <div className="brand-text">
            <strong>Casa Nino</strong>
            <small>Catálogo de herramientas</small>
          </div>
        </div>

        <nav className="brand-tabs" aria-label="Marcas">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`brand-tab${activeBrand === tab.key ? ' active' : ''}`}
              style={tabStyle(tab.key, activeBrand === tab.key)}
              onClick={() => onSelectBrand(tab.key)}
              disabled={loading}
            >
              <span>{tab.label}</span>
              <span className="count">{loading ? '…' : (counts[tab.key] ?? 0)}</span>
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
      </div>
    </header>
  )
}

export default Navbar