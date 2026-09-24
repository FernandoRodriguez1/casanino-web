import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import HomeView from './components/HomeView'
import StatusBox from './components/StatusBox'
import { useCatalog } from './hooks/useCatalog'
import { useAuth } from './hooks/useAuth'
import './App.css'

const AdminLogin = lazy(() => import('./components/AdminLogin'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))

function App() {
  const { token, isAuthed, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [editTarget, setEditTarget] = useState(null)

  const {
    activeBrand,
    activeCategoria,
    search,
    setSearch,
    setSearchProduct,
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const highlightTimer = useRef(null)

  const focusFirstResult = () => {
    const card = document.querySelector('.catalog .grid .card')
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card.focus({ preventScroll: true })
  }

  const highlightFirstResult = (raw = search) => {
    if (!String(raw ?? '').trim()) return
    const card = document.querySelector('.catalog .grid .card')
    if (!card) return
    const prev = document.querySelector('.card.card-highlight')
    if (prev && prev !== card) prev.classList.remove('card-highlight')
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card.classList.add('card-highlight')
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => card.classList.remove('card-highlight'), 1200)
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthed ? (
            <Navigate to="/admin" replace />
          ) : (
            <Suspense fallback={<StatusBox status="loading" />}>
              <AdminLogin
                onLogin={async (nombre, password) => {
                  await login(nombre, password)
                  navigate('/admin')
                }}
                onBack={() => navigate('/')}
              />
            </Suspense>
          )
        }
      />

      <Route
        path="/admin"
        element={
          isAuthed ? (
            <Suspense fallback={<StatusBox status="loading" />}>
              <AdminPanel
                token={token}
                onBack={() => navigate('/')}
                onLogout={() => {
                  logout()
                  navigate('/')
                }}
              />
            </Suspense>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="*"
        element={
          <HomeView
            activeBrand={activeBrand}
            activeCategoria={activeCategoria}
            search={search}
            setSearch={setSearch}
            setSearchProduct={setSearchProduct}
            status={status}
            marcas={marcas}
            counts={counts}
            visibleCategorias={visibleCategorias}
            categorias={categorias}
            categoriaMeta={categoriaMeta}
            filtered={filtered}
            selected={selected}
            loadedCount={loadedCount}
            totalCount={totalCount}
            isFullCatalog={isFullCatalog}
            loadFullCatalog={loadFullCatalog}
            applyProductUpdate={applyProductUpdate}
            setBrand={setBrand}
            selectCategoria={selectCategoria}
            openDetail={openDetail}
            closeDetail={closeDetail}
            clearCategoria={clearCategoria}
            isAuthed={isAuthed}
            token={token}
            editTarget={editTarget}
            setEditTarget={setEditTarget}
            onAdmin={() => navigate('/admin')}
            onSearchSubmit={focusFirstResult}
            onSearchTyping={highlightFirstResult}
          />
        }
      />
    </Routes>
  )
}

export default App