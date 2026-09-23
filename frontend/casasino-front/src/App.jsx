import { useState } from 'react'
import Navbar from './components/Navbar'
import ProductDetail from './components/ProductDetail'
import CategoriesSection from './components/CategoriesSection'
import StatusBox from './components/StatusBox'
import Hero from './components/Hero'
import CatalogSection from './components/CatalogSection'
import AdminLogin from './components/AdminLogin'
import AdminPanel from './components/AdminPanel'
import { getBrandColor, readableBrandColor } from './utils/brand'
import { useCatalog } from './hooks/useCatalog'
import { useAuth } from './hooks/useAuth'
import './App.css'

function App() {
  const { token, isAuthed, login, logout } = useAuth()
  const [view, setView] = useState('catalog')

  const {
    activeBrand,
    activeCategoria,
    search,
    setSearch,
    status,
    marcas,
    counts,
    visibleCategorias,
    categoriaMeta,
    filtered,
    selected,
    loadedCount,
    totalCount,
    isFullCatalog,
    loadFullCatalog,
    setBrand,
    selectCategoria,
    openDetail,
    closeDetail,
    clearCategoria,
  } = useCatalog()

  if (view === 'login') {
    return (
      <AdminLogin
        onLogin={async (nombre, password) => {
          await login(nombre, password)
          setView('admin')
        }}
        onBack={() => setView('catalog')}
      />
    )
  }

  if (view === 'admin') {
    return (
      <AdminPanel
        token={token}
        onLogout={() => {
          logout()
          setView('catalog')
        }}
      />
    )
  }

  const headingColor =
    activeBrand !== 'all' ? readableBrandColor(activeBrand) : '#0f172a'

const heroAccent = activeBrand !== 'all' ? getBrandColor(activeBrand) : '#fc4c02'

const scrollToCatalog = () => {
  document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' })
}

if (selected) {
  return <ProductDetail key={selected.id} producto={selected} onBack={closeDetail} />
}

return (
  <>
    <Navbar
      marcas={marcas}
      activeBrand={activeBrand}
      onSelectBrand={setBrand}
      search={search}
      onSearch={setSearch}
      counts={counts}
      loading={status !== 'ready'}
      adminLabel={isAuthed ? 'Panel' : 'Admin'}
      onAdmin={() => setView(isAuthed ? 'admin' : 'login')}
    />

    {status === 'ready' && (
      <Hero activeBrand={activeBrand} counts={counts} accent={heroAccent} onCta={scrollToCatalog} />
    )}

    <main>
        {status !== 'ready' ? (
          <StatusBox status={status} />
        ) : (
          <>
            <CategoriesSection
              mode={activeBrand === 'all' ? 'all' : 'brand'}
              categorias={visibleCategorias}
              marcas={marcas}
              counts={counts}
              active={activeCategoria}
              accent={heroAccent}
              onSelectCat={selectCategoria}
              onSelectBrand={setBrand}
              onClearCat={clearCategoria}
            />

            <CatalogSection
              categoriaMeta={categoriaMeta}
              activeBrand={activeBrand}
              marcas={marcas}
              filtered={filtered}
              search={search}
              headingColor={headingColor}
              loadedCount={loadedCount}
              totalCount={totalCount}
              isFullCatalog={isFullCatalog}
              onLoadFull={loadFullCatalog}
              onClearCategoria={clearCategoria}
              onOpen={openDetail}
              onClearSearch={() => setSearch('')}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>Casa Nino · Tortugas Santa Fe</p>
      </footer>
    </>
  )
}

export default App