import { getBrandColor } from '../utils/brand'
import heroBg from '../assets/casaninofoto.jpg'

const ArrowRightSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

function sealText(brand) {
  const words = (brand ?? '').split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [words[0] ?? '', '']
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function Hero({ activeBrand, counts, accent, onCta }) {
  const isAll = activeBrand === 'all'
  const [sealTop, sealBottom] = isAll ? ['3 MARCAS', 'PREMIUM'] : sealText(activeBrand)

  return (
    <section
      className={`hero ${isAll ? 'hero-full' : 'hero-brand'}`}
      style={{ ['--hero-accent']: accent, ['--hero-accent-soft']: getBrandColor(activeBrand) }}
    >
      <div className="hero-bg" style={{ backgroundImage: `url(${heroBg})` }} />
      <div className="hero-overlay" />

      <div className="hero-max-width">
        <div className="hero-content">
          <div className="hero-label-set" aria-hidden="true">
            <div className="hero-seal">
              {sealTop && <span>{sealTop}</span>}
              {sealBottom && <span className="hero-seal-sub">{sealBottom}</span>}
            </div>
          </div>

          <div className="hero-slide-flex hero-info">
            <div className="hero-top-info">
              <span className="hero-subtitle-top">
                {isAll ? 'Herramientas profesionales' : 'Marca seleccionada'}
              </span>
            </div>

            <div className="hero-title-wrap">
              <h1 className="hero-title">
                {isAll ? 'Casa Nino' : activeBrand}
              </h1>
            </div>

            <p className="hero-subtitle-bottom">
              {isAll ? (
                <a
                  className="hero-subtitle-link"
                  href="https://maps.app.goo.gl/QFrn3GYUFp7rLis57"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tortugas Santa Fe
                </a>
              ) : (
                `${counts[activeBrand] ?? 0} productos disponibles`
              )}
            </p>

            <div className="hero-btn-wrap">
              <button type="button" className="hero-btn" onClick={onCta}>
                <div>{isAll ? 'Ver catálogo' : 'Ver productos'}</div>
                <span className="hero-btn-icon">
                  <ArrowRightSvg />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero