import { lazy, Suspense, useState } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProductDetail from './components/ProductDetail'
import CategoriesSection from './components/CategoriesSection'
import StatusBox from './components/StatusBox'
import Hero from './components/Hero'
import CatalogSection from './components/CatalogSection'
import { getBrandColor, readableBrandColor } from './utils/brand'
import { useCatalog } from './hooks/useCatalog'
import { useAuth } from './hooks/useAuth'
import './App.css'

const AdminLogin = lazy(() => import('./components/AdminLogin'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))
const ProductEditModal = lazy(() => import('./components/ProductEditModal'))

function App() {
  const { token, isAuthed, login, logout } = useAuth()
  const [view, setViewState] = useState(() => {
    const clean = window.location.pathname.replace(/\/+$/, '') || '/'
    if (clean === '/login') return 'login'
    if (clean === '/') {
      const saved = localStorage.getItem('casanino_view')
      if (saved === 'admin' || saved === 'login') return saved
    }
    return 'catalog'
  })
  const [editTarget, setEditTarget] = useState(null)

  const changeView = (next) => {
    try {
      localStorage.setItem('casanino_view', next)
    } catch {}
    const clean = window.location.pathname.replace(/\/+$/, '') || '/'
    if (next !== 'login' && clean !== '/') {
      window.history.replaceState(null, '', '/')
    }
setViewState(next)
  }

  const {
    activeBrand,
    activeCategoria,
    search,
    setSearch,
    status,
    marcas,
    counts,
    visibleCategorias,
    categorias,
    categoriaMeta,
    filtered,
    selected,
    loadedCount,
    totalCount,
    isFullCatalog,
    loadFullCatalog,
    applyProductUpdate,
    setBrand,
    selectCategoria,
    openDetail,
    closeDetail,
    clearCategoria,
  } = useCatalog()

  const needLogin = view === 'login' || (view === 'admin' && !isAuthed)

  if (needLogin) {
    return (
      <Suspense fallback={<StatusBox status="loading" />}>
        <AdminLogin
          onLogin={async (nombre, password) => {
            await login(nombre, password)
            history.replaceState(null, '', '/')
            changeView('admin')
          }}
          onBack={() => {
            history.replaceState(null, '', '/')
            changeView('catalog')
          }}
        />
      </Suspense>
    )
  }

  if (view === 'admin') {
    return (
      <Suspense fallback={<StatusBox status="loading" />}>
        <AdminPanel
          token={token}
          onLogout={() => {
            logout()
            changeView('catalog')
          }}
        />
      </Suspense>
    )
  }

  const headingColor =
    activeBrand !== 'all' ? readableBrandColor(activeBrand) : '#0f172a'

const heroAccent = activeBrand !== 'all' ? getBrandColor(activeBrand) : '#fc4c02'

const scrollToCatalog = () => {
  document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' })
}

if (selected) {
  return (
    <>
      <ProductDetail
        key={selected.id}
        producto={selected}
        onBack={closeDetail}
        onEdit={isAuthed ? () => setEditTarget(selected) : undefined}
      />
      {editTarget && isAuthed && (
        <Suspense fallback={null}>
          <ProductEditModal
            key={editTarget.id}
            token={token}
            producto={editTarget}
            marcas={marcas}
            categorias={categorias}
            onClose={() => setEditTarget(null)}
            onSaved={(saved, id) => {
              applyProductUpdate(saved, id)
              setEditTarget(null)
            }}
          />
        </Suspense>
      )}
    </>
  )
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
      showAdmin={isAuthed}
      onAdmin={() => changeView('admin')}
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

      <Footer marcas={marcas} onSelectBrand={setBrand} />
    </>
  )
}

export default App