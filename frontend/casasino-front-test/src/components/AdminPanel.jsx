import { useMemo, useState } from 'react'
import * as adminApi from '../services/admin'
import SimpleCrud from './SimpleCrud'
import AdminProducts from './AdminProducts'

const TABS = [
  { key: 'productos', label: 'Productos' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'marcas', label: 'Marcas' },
  { key: 'admins', label: 'Administradores' },
]

function AdminPanel({ token, onLogout }) {
  const [tab, setTab] = useState('productos')

  const categoriaApi = useMemo(
    () => ({
      fetchList: () => adminApi.getCategorias(token),
      create: (v) => adminApi.createCategoria(token, v.nombre),
      update: (id, v) => adminApi.updateCategoria(token, id, v.nombre),
      remove: (id) => adminApi.deleteCategoria(token, id),
    }),
    [token]
  )

  const marcaApi = useMemo(
    () => ({
      fetchList: () => adminApi.getMarcas(token),
      create: (v) => adminApi.createMarca(token, v.nombre),
      update: (id, v) => adminApi.updateMarca(token, id, v.nombre),
      remove: (id) => adminApi.deleteMarca(token, id),
    }),
    [token]
  )

  const adminApiCfg = useMemo(
    () => ({
      fetchList: () => adminApi.getAdministradores(token),
      create: (v) => adminApi.createAdministrador(token, v.nombre, v.password),
      update: (id, v) => adminApi.updateAdministrador(token, id, v.nombre, v.password),
      remove: (id) => adminApi.deleteAdministrador(token, id),
    }),
    [token]
  )

  return (
    <div className="admin-panel">
      <header className="admin-head">
        <div className="admin-head-inner">
          <div>
            <strong>Casa Nino · Panel de administración</strong>
            <span className="ac-muted">Gestión de catálogo</span>
          </div>
          <button type="button" className="ac-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`admin-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {tab === 'productos' && <AdminProducts token={token} />}
        {tab === 'categorias' && (
          <SimpleCrud
            title="Categorías"
            entityLabel="categoría"
            api={categoriaApi}
            fields={[{ name: 'nombre', label: 'Nombre', required: true }]}
          />
        )}
        {tab === 'marcas' && (
          <SimpleCrud
            title="Marcas"
            entityLabel="marca"
            api={marcaApi}
            fields={[{ name: 'nombre', label: 'Nombre', required: true }]}
          />
        )}
        {tab === 'admins' && (
          <SimpleCrud
            title="Administradores"
            entityLabel="administrador"
            api={adminApiCfg}
            fields={[
              { name: 'nombre', label: 'Usuario', required: true },
              { name: 'password', label: 'Contraseña', type: 'password', required: true, placeholder: 'Dejalo en blanco para no cambiarla' },
            ]}
          />
        )}
      </div>
    </div>
  )
}

export default AdminPanel