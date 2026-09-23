import { useRef, useState } from 'react'
import { isLightColor } from '../utils/brand'
import brandBta from '../assets/brands/bta.png'
import brandDp from '../assets/brands/dp.png'
import brandCrossmaster from '../assets/brands/crossmaster.png'

const BRAND_IMAGES = {
  'Dowen Pagio': brandDp,
  Crossmaster: brandCrossmaster,
  'BTA Tools': brandBta,
}

const ArrowRightSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ArrowLeftSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

function maskLineClamp(text) {
  const words = text.split(' ')
  const first = words[0]
  const rest = words.slice(1).join(' ')
  return rest ? (
    <>
      {first}
      <br />
      {rest}
    </>
  ) : (
    first
  )
}

function CategoriesSection({ mode, categorias, marcas, counts, active, accent, onSelectCat, onSelectBrand, onClearCat }) {
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)
  const sliderRef = useRef(null)

  if (mode === 'all') {
    return (
      <section className="cats-marcas">
        <div className="cats-marcas-inner">
          <h2 className="cats-marcas-title">Elegí una marca</h2>
          <div className="cats-grid">
            {marcas.map((m) => (
              <button
                key={m.id}
                type="button"
                className="cat-card"
                onClick={() => onSelectBrand(m.nombre)}
              >
                {BRAND_IMAGES[m.nombre] && (
                  <span className="cat-brand-img">
                    <img src={BRAND_IMAGES[m.nombre]} alt={m.nombre} loading="lazy" />
                  </span>
                )}
                <span className="cat-name">{m.nombre}</span>
                <span className="cat-count">{counts[m.nombre] ?? 0} productos</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const updateArrows = () => {
    const el = sliderRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const scrollBy = (dir) => {
    const el = sliderRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.8, 200)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section
      className="swipper"
      style={{
        ['--swipper-accent']: accent,
        ['--swipper-arrow-text']: isLightColor(accent) ? '#000' : '#fff',
      }}
    >
      <div className="swipper-container">
        <div className="swipper-offseted">
          <div className="swipper-left-subtitle">
            <div className="swipper-subtitle">
              <div className="text-h3-primary">¿Qué estás buscando?</div>
            </div>
            {active && (
              <div className="swipper-button">
                <button
                  type="button"
                  className="link-default link-black"
                  onClick={onClearCat}
                >
                  <div>Todas las categorías</div>
                  <div className="link-icon">
                    <ArrowRightSvg />
                  </div>
                </button>
              </div>
            )}
          </div>
          <div className="swipper-offset-slider-wrap">
            <button
              type="button"
              className={`swiper-arrow swiper-arrow-prev${canLeft ? '' : ' disabled'}`}
              aria-label="Anterior"
              onClick={() => scrollBy(-1)}
            >
              <ArrowLeftSvg />
            </button>
            <div
              ref={sliderRef}
              className="collection-segmentos-list"
              onScroll={updateArrows}
            >
              {categorias.map((cat) => (
                <div key={cat.slug} className={`collection-segmentos-item${cat.marca === 'Crossmaster' ? ' crossmaster' : ''}`}>
                  <button
                    type="button"
                    className={`card-2-link${active === cat.slug ? ' active' : ''}`}
                    onClick={() => onSelectCat(cat.slug)}
                  >
                    <div className="card-2-container">
                      <div className="card-2-img-overlay">
                        {cat.imagen ? (
                          <img src={cat.imagen} alt={cat.nombre} loading="eager" className="card-2-img" />
                        ) : (
                          <div className="card-2-img card-2-img-fallback" />
                        )}
                        <div className="card-2-opacity-layer" />
                      </div>
                      <div className="card-2-info">
                        <h3 className="card-2-title">{maskLineClamp(cat.nombre)}</h3>
                        <span className="card-2-count">{cat.count} productos</span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`swiper-arrow swiper-arrow-next${canRight ? '' : ' disabled'}`}
              aria-label="Siguiente"
              onClick={() => scrollBy(1)}
            >
              <ArrowRightSvg />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CategoriesSection