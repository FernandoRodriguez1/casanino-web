import { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminApi from '../services/admin'
import { cacheStoreReference, notifyCatalogChanged } from '../services/catalog'
import SimpleCrud from './SimpleCrud'
import AdminProducts from './AdminProducts'

const TABS = [
  { key: 'productos', label: 'Productos' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'marcas', label: 'Marcas' },
  { key: 'admins', label: 'Administradores' },
]

const LOGO_HINT = 'PNG con transparencia ideal, ya recortado y sin márgenes blancos.'

function AdminPanel({ token, onLogout, onBack }) {
  const [tab, setTab] = useState('productos')
  // Las categorías necesitan las marcas para armar su select, así que el panel
  // las tiene a mano. SimpleCrud no expone la lista que ya descargó.
  const [marcas, setMarcas] = useState([])

  useEffect(() => {
    let vigente = true
    adminApi
      .getMarcas(token)
      .then((list) => {
        if (vigente) setMarcas(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [token])

  // Las marcas y categorías alimentan el catálogo público, así que al guardar
  // hay que refrescar la caché de referencia y avisarle a useCatalog.
  const syncReference = useCallback(async (key, list) => {
    await cacheStoreReference({ [key]: list })
    notifyCatalogChanged()
  }, [])

  const syncMarcas = useCallback(
    (list) => {
      // La lista que pasa SimpleCrud ya es autoritativa: reúsala para que una
      // marca recién creada aparezca en el select sin otro refetch.
      setMarcas(Array.isArray(list) ? list : [])
      return syncReference('marcas', list)
    },
    [syncReference]
  )
  const syncCategorias = useCallback((list) => syncReference('categorias', list), [syncReference])

  const marcaField = useMemo(
    () => ({
      name: 'marcaId',
      label: 'Marca',
      type: 'select',
      required: true,
      showInRow: true,
      emptyLabel: 'Sin marca',
      options: marcas.map((m) => ({ value: m.id, label: m.nombre })),
    }),
    [marcas]
  )

  // Memizado a propósito: SimpleCrud resiembra el formulario en un efecto que
  // depende de [editing, fields]. Con el array inline, cada render del panel
  // pisaría lo que el usuario ya escribió con el formulario abierto.
  const categoriaFields = useMemo(
    () => [
      { name: 'nombre', label: 'Nombre', required: true },
      marcaField,
      { name: 'imagen', label: 'Logo', type: 'file', accept: 'image/*', hint: LOGO_HINT },
    ],
    [marcaField]
  )

  const categoriaApi = useMemo(
    () => ({
      fetchList: () => adminApi.getCategorias(token),
      create: (v, file) => adminApi.createCategoria(token, v.nombre, file, v.marcaId),
      update: (id, v, file) => adminApi.updateCategoria(token, id, v.nombre, file, v.marcaId),
      remove: (id) => adminApi.deleteCategoria(token, id),
    }),
    [token]
  )

  const marcaApi = useMemo(
    () => ({
      fetchList: () => adminApi.getMarcas(token),
      create: (v, file) => adminApi.createMarca(token, v.nombre, file),
      update: (id, v, file) => adminApi.updateMarca(token, id, v.nombre, file),
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
          <div className="admin-head-side left">
            <button type="button" className="ac-btn" onClick={onBack}>
              ← Volver al catálogo
            </button>
          </div>
          <div className="admin-head-title">
            <strong>Casa Nino · Panel de administración</strong>
            <span className="ac-muted">Gestión de catálogo</span>
          </div>
          <div className="admin-head-side right">
            <button type="button" className="ac-btn" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
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
            onChange={syncCategorias}
            fields={categoriaFields}
          />
        )}
        {tab === 'marcas' && (
          <SimpleCrud
            title="Marcas"
            entityLabel="marca"
            api={marcaApi}
            onChange={syncMarcas}
            fields={[
              { name: 'nombre', label: 'Nombre', required: true },
              { name: 'imagen', label: 'Logo', type: 'file', accept: 'image/*', hint: LOGO_HINT },
            ]}
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