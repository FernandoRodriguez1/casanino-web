import { lazy, Suspense } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import ProductDetail from './ProductDetail'
import CategoriesSection from './CategoriesSection'
import StatusBox from './StatusBox'
import Hero from './Hero'
import CatalogSection from './CatalogSection'
import { getBrandColor, readableBrandColor } from '../utils/brand'

const ProductEditModal = lazy(() => import('./ProductEditModal'))

function HomeView({
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
  isAuthed,
  token,
  editTarget,
  setEditTarget,
  onAdmin,
  onSearchSubmit,
}) {
  const headingColor = activeBrand !== 'all' ? readableBrandColor(activeBrand) : '#0f172a'
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

        <Footer marcas={marcas} onSelectBrand={setBrand} />
      </>
    )
  }

  return (
    <>
      <Navbar
        marcas={marcas}
        activeBrand={activeBrand}
        activeCategoria={activeCategoria}
        categorias={categorias}
        onSelectBrand={setBrand}
        onSelectCat={selectCategoria}
        search={search}
        onSearch={setSearchProduct}
        counts={counts}
        loading={status !== 'ready'}
        showAdmin={isAuthed}
        onAdmin={onAdmin}
        onSearchSubmit={onSearchSubmit}
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

export default HomeView