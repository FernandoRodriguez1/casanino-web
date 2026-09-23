const CONTACT = {
  phone: '+54 9 11 0000-0000',
  whatsapp: 'https://wa.me/5491100000000',
  email: 'info@casanino.com.ar',
  address: 'Tortugas, Santa Fe, Argentina',
}

const SOCIAL = [
  { label: 'WhatsApp', href: 'https://wa.me/5491100000000' },
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
]

function Footer({ marcas, onSelectBrand }) {
  const year = new Date().getFullYear()

  const goBrand = (key) => {
    onSelectBrand(key)
    document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col footer-brand">
          <div className="brand" onClick={() => goBrand('all')}>
            <img className="brand-logo" src="/img/logo_casa_nino.png" alt="Casa Nino" />
            <div className="brand-text">
              <strong>Casa Nino</strong>
              <small>Catálogo de herramientas</small>
            </div>
          </div>
          <p className="footer-desc">
            Herramientas y ferretería industrial en Tortugas, Santa Fe. Consultá el catálogo completo de nuestras marcas.
          </p>
        </div>

        <div className="footer-col footer-marcas">
          <h4>Marcas</h4>
          <ul>
            <li>
              <button type="button" onClick={() => goBrand('all')}>
                Todos los productos
              </button>
            </li>
            {marcas.map((m) => (
              <li key={m.nombre}>
                <button type="button" onClick={() => goBrand(m.nombre)}>
                  {m.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col footer-contact">
          <h4>Contacto</h4>
          <ul>
            <li>
              <span>Teléfono / WhatsApp</span>
              <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}>{CONTACT.phone}</a>
            </li>
            <li>
              <span>Email</span>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
            <li>
              <span>Dirección</span>
              <p>{CONTACT.address}</p>
            </li>
          </ul>
        </div>

        <div className="footer-col footer-social">
          <h4>Seguinos</h4>
          <ul>
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {year} Casa Nino · Todos los derechos reservados</p>
      </div>
    </footer>
  )
}

export default Footer