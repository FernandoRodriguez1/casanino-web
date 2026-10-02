// Backfill de categoria.marca_id.
//
// Deduce la marca de cada categoria a partir de las marcas de sus productos y
// la persiste con un PUT a /api/Categorias. Solo toca las categorias cuyos
// productos son de UNA sola marca: las que no tienen productos o cuyos
// productos mezclan marcas necesitan criterio humano y quedan sin tocar.
//
// Uso (desde la raiz del repo):
//   $env:CASA_NINO_ADMIN_USER = "nombre"
//   $env:CASA_NINO_ADMIN_PASS = "clave"
//   node scripts/backfill-categorias-marca.mjs            # simulacro, no escribe
//   node scripts/backfill-categorias-marca.mjs --apply    # escribe de verdad
//
// Opcional: $env:CASA_NINO_API = "https://..." para otro destino.

const BASE = (process.env.CASA_NINO_API ?? 'https://casanino-web.onrender.com').replace(/\/+$/, '')
const APPLY = process.argv.includes('--apply')
const PAUSA_MS = Number(process.env.CASA_NINO_PAUSA_MS ?? 250)

const usuario = process.env.CASA_NINO_ADMIN_USER
const clave = process.env.CASA_NINO_ADMIN_PASS

if (!usuario || !clave) {
  console.error('Faltan CASA_NINO_ADMIN_USER y CASA_NINO_ADMIN_PASS.')
  console.error('Ejemplo PowerShell:')
  console.error('  $env:CASA_NINO_ADMIN_USER = "nombre"')
  console.error('  $env:CASA_NINO_ADMIN_PASS = "clave"')
  process.exit(1)
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(path, { method = 'GET', token, body, json } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (body) {
    payload = body
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(json)
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  const texto = await res.text()
  let datos = null
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = texto
    }
  }
  if (!res.ok) {
    const msg = datos && typeof datos === 'object' && typeof datos.message === 'string'
      ? datos.message
      : `Error ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return datos
}

function agruparPorCategoria(productos) {
  // categoriaId -> Set de marcaId
  const mapa = new Map()
  for (const p of productos) {
    const k = String(p.categoriaId)
    if (!mapa.has(k)) mapa.set(k, new Set())
    mapa.get(k).add(String(p.marcaId))
  }
  return mapa
}

function repartoPorMarca(productos, categoriaId) {
  const cuenta = new Map()
  for (const p of productos) {
    if (String(p.categoriaId) !== String(categoriaId)) continue
    const k = String(p.marcaId)
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1)
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
}

async function main() {
  console.log(`Destino:  ${BASE}`)
  console.log(`Modo:     ${APPLY ? 'APLICAR (escribe)' : 'SIMULACRO (no escribe)'}`)
  console.log('')

  const { token } = await pedir('/api/Auth/login', {
    method: 'POST',
    json: { nombre: usuario, password: clave },
  })
  if (!token) throw new Error('El login no devolvio un token')
  console.log('Login OK')

  const [categorias, productos, marcas] = await Promise.all([
    pedir('/api/Categorias', { token }),
    pedir('/api/Productos', { token }),
    pedir('/api/Marcas', { token }),
  ])

  const nombreMarca = new Map(marcas.map((m) => [String(m.id), m.nombre]))
  console.log(`Categorias: ${categorias.length}  Productos: ${productos.length}  Marcas: ${marcas.length}`)
  console.log('')

  const marcasPorCategoria = agruparPorCategoria(productos)

  const aAsignar = []
  const yaTenian = []
  const sinProductos = []
  const mezcladas = []

  for (const c of categorias) {
    if (c.marcaId !== null && c.marcaId !== undefined) {
      yaTenian.push(c)
      continue
    }
    const set = marcasPorCategoria.get(String(c.id))
    if (!set || set.size === 0) {
      sinProductos.push(c)
      continue
    }
    if (set.size > 1) {
      mezcladas.push(c)
      continue
    }
    aAsignar.push({ categoria: c, marcaId: Number([...set][0]) })
  }

  console.log('---------- SE ASIGNAN ----------')
  const porMarca = new Map()
  for (const it of aAsignar) {
    const k = String(it.marcaId)
    porMarca.set(k, (porMarca.get(k) ?? 0) + 1)
  }
  for (const [id, n] of [...porMarca.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(nombreMarca.get(id) ?? `id ${id}`).padEnd(14)} ${String(n).padStart(3)} categorias`)
  }
  console.log(`  ${'TOTAL'.padEnd(14)} ${String(aAsignar.length).padStart(3)}`)
  console.log('')

  if (mezcladas.length) {
    console.log('---------- MEZCLA DE MARCAS: quedan sin tocar ----------')
    for (const c of mezcladas) {
      const detalle = repartoPorMarca(productos, c.id)
        .map(([mid, n]) => `${nombreMarca.get(mid) ?? mid}=${n}`)
        .join(' + ')
      console.log(`  id ${String(c.id).padEnd(4)} ${c.nombre}  ->  ${detalle}`)
    }
    console.log('')
  }

  if (sinProductos.length) {
    console.log('---------- SIN PRODUCTOS: quedan sin tocar ----------')
    for (const c of sinProductos) console.log(`  id ${String(c.id).padEnd(4)} ${c.nombre}`)
    console.log('')
  }

  if (yaTenian.length) {
    console.log(`---------- YA TENIAN MARCA: ${yaTenian.length}, se omiten ----------`)
    console.log('')
  }

  if (!APPLY) {
    console.log('SIMULACRO: no se hizo ningun PUT.')
    console.log('Si el listado te cierra bien, corré de nuevo con --apply.')
    return 0
  }

  console.log(`--------- PUT a ${aAsignar.length} categorias ---------`)
  const fallidas = []
  for (const [i, { categoria, marcaId }] of aAsignar.entries()) {
    // Se manda nombre porque el PUT lo exige, y NO se manda Imagen para no
    // pisar el logo: el controller reutiliza el valor actual si viene vacio.
    const fd = new FormData()
    fd.append('nombre', categoria.nombre)
    fd.append('MarcaId', String(marcaId))
    try {
      await pedir(`/api/Categorias/${categoria.id}`, { method: 'PUT', token, body: fd })
      process.stdout.write(`  [${i + 1}/${aAsignar.length}] ok ${categoria.nombre}\n`)
    } catch (err) {
      fallidas.push({ categoria, error: err.message })
      console.error(`  [${i + 1}/${aAsignar.length}] FALLO ${categoria.nombre}: ${err.message}`)
      if (err.status === 401) {
        console.error('Token vencido. Corré el login de nuevo.')
        break
      }
    }
    await dormir(PAUSA_MS)
  }

  console.log('')
  console.log(`Listo. Asignadas: ${aAsignar.length - fallidas.length}  Fallidas: ${fallidas.length}`)
  if (fallidas.length) {
    for (const f of fallidas) console.error(`  id ${f.categoria.id} ${f.categoria.nombre}: ${f.error}`)
    return 1
  }
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
