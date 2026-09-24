import { WHATSAPP_NUMBER, INSTAGRAM_URL, MAPS_URL } from '../utils/contact'

const CONTACT = {
  whatsapp: {
    label: '+54 9 3471 505442',
    url: `https://wa.me/${WHATSAPP_NUMBER}`,
  },
  instagram: {
    label: '@casaninotortugas',
    url: INSTAGRAM_URL,
  },
  direccion: 'Blvd. Juarez Celman 751, S2512 Tortugas, Santa Fe',
  ubicacion: 'Tortugas - Santa Fe',
}

const WhatsAppSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14 0-.31-.01-.48-.01-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
  </svg>
)

const InstagramSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const MapPinSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const HouseSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)

function Footer({ marcas, onSelectBrand }) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <span className="footer-logo">
            <img src="/img/logo_casa_nino.png" alt="Casa Nino" />
          </span>
          <strong className="footer-title">Casa Nino</strong>
          <p className="footer-subtitle">Catálogo de herramientas</p>
          <p className="footer-desc">
            Herramientas y accesorios de las mejores marcas. Encontralos en
            Tortugas, Santa Fe.
          </p>
        </div>

        <div className="footer-col">
          <strong className="footer-title">Marcas</strong>
          <ul className="footer-links">
            <li>
              <button type="button" onClick={() => onSelectBrand('all')}>
                Todos los productos
              </button>
            </li>
            {marcas.map((m) => (
              <li key={m.nombre}>
                <button type="button" onClick={() => onSelectBrand(m.nombre)}>
                  {m.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <strong className="footer-title">Contacto</strong>
          <ul className="footer-links footer-contact">
            <li>
              <a
                className="footer-link-icon"
                href={CONTACT.whatsapp.url}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppSvg />
                <span>
                  <small>WhatsApp</small>
                  <strong>{CONTACT.whatsapp.label}</strong>
                </span>
              </a>
            </li>
            <li>
              <a
                className="footer-link-icon"
                href={CONTACT.instagram.url}
                target="_blank"
                rel="noreferrer"
              >
                <InstagramSvg />
                <span>
                  <small>Instagram</small>
                  <strong>{CONTACT.instagram.label}</strong>
                </span>
              </a>
            </li>
            <li>
              <a
                className="footer-link-icon"
                href={MAPS_URL}
                target="_blank"
                rel="noreferrer"
              >
                <MapPinSvg />
                <span>{CONTACT.direccion}</span>
              </a>
            </li>
            <li>
              <a
                className="footer-link-icon"
                href={MAPS_URL}
                target="_blank"
                rel="noreferrer"
              >
                <HouseSvg />
                <span>{CONTACT.ubicacion}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Casa Nino · {CONTACT.ubicacion}</p>
        <p>Elaborado por Looktechweb © 2026</p>
      </div>
    </footer>
  )
}

export default Footer