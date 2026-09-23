function StatusBox({ status }) {
  if (status === 'loading') {
    return (
      <section className="status-box">
        <h2>Cargando catálogo...</h2>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="status-box">
        <h2>No se pudieron cargar los productos</h2>
        <p>Verificá la conexión con la API o intentá de nuevo en unos segundos.</p>
      </section>
    )
  }

  return null
}

export default StatusBox