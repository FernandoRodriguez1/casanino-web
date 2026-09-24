import { useState } from 'react'

function AdminLogin({ onLogin, onBack, notice }) {
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!nombre.trim() || !password) {
      setError('Ingresá el nombre de usuario y la contraseña')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onLogin(nombre.trim(), password)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-login">
      <div className="admin-login-card">
        <h1>Panel de administración</h1>
        <p className="admin-login-sub">Ingresá con tus credenciales de administrador</p>

        <form className="ac-form" onSubmit={submit}>
          <label className="ac-field">
            <span>Usuario</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="ac-field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="ac-error">{error}</p>}
          {notice && <p className="ac-notice">{notice}</p>}

          <button type="submit" className="ac-btn ac-btn-primary" disabled={busy}>
            {busy ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <button type="button" className="ac-link" onClick={onBack}>
          ← Volver al catálogo
        </button>
      </div>
    </section>
  )
}

export default AdminLogin