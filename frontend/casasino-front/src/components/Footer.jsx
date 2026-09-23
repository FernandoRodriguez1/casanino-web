import { WHATSAPP_NUMBER, INSTAGRAM_URL } from '../utils/contact'

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

function Footer({ marcas, onSelectBrand }) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col">
          <strong className="footer-title">Casa Nino</strong>
          <p className="footer-subtitle">Catálogo de herramientas</p>
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
          <ul className="footer-links">
            <li>
              <a href={CONTACT.whatsapp.url} target="_blank" rel="noreferrer">
                WhatsApp: {CONTACT.whatsapp.label}
              </a>
            </li>
            <li>
              <a href={CONTACT.instagram.url} target="_blank" rel="noreferrer">
                Instagram: {CONTACT.instagram.label}
              </a>
            </li>
            <li>{CONTACT.direccion}</li>
            <li>{CONTACT.ubicacion}</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Casa Nino · {CONTACT.ubicacion}</p>
        <p>© {new Date().getFullYear()} Casa Nino</p>
      </div>
    </footer>
  )
}

export default Footer