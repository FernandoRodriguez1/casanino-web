// Backfill de categoria.marca_id.
//
// Deduce la marca de cada categoria a partir de las marcas de sus productos y
// la persiste con un PUT a /api/Categorias. Solo toca las categorias cuyos
// productos son de UNA sola marca, mas las que estan en OVERRIDES (decisiones
// tomadas a mano). Las que no tienen productos o cuyos productos mezclan marcas
// necesitan criterio humano y quedan sin tocar.
//
// Uso (desde la raiz del repo):
//   $env:CASA_NINO_ADMIN_USER = "nombre"
//   $env:CASA_NINO_ADMIN_PASS = "clave"
//   node scripts/backfill-categorias-marca.mjs            # simulacro, no escribe
//   node scripts/backfill-categorias-marca.mjs --apply    # escribe de verdad
//
// Opcional: $env:CASA_NINO_API = "https://..." para otro destino.
//
// NUNCA dejar credenciales reales en este archivo: se commitea al repo.

const BASE = (
  process.env.CASA_NINO_API ?? "https://casanino-web.onrender.com"
).replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");
const PAUSA_MS = Number(process.env.CASA_NINO_PAUSA_MS ?? 250);

const usuario = process.env.CASA_NINO_ADMIN_USER;
const clave = process.env.CASA_NINO_ADMIN_PASS;

if (!usuario || !clave) {
  console.error("Faltan CASA_NINO_ADMIN_USER y CASA_NINO_ADMIN_PASS.");
  console.error("Ejemplo PowerShell:");
  console.error('  $env:CASA_NINO_ADMIN_USER = "nombre"');
  console.error('  $env:CASA_NINO_ADMIN_PASS = "clave"');
  process.exit(1);
}

// Asignaciones que NO se pueden deducir de los productos y se decidieron a mano.
// La clave es el id de categoria y el valor el NOMBRE de la marca: se resuelve
// por nombre y no por id para no depender del seed de la base.
//
// 15 Accesorios Para Hidrolavadoras -> BTA Tools, con tres fuentes que coinciden:
//   1) El public/data/categorias.json borrado en fce6e6c lo lista como
//      "[BTA Tools] Accesorios para hidrolavadoras", con count 0.
//   2) Su imagen vivia en public/categorias/bta-tools/accesorios-para-hidrolavadoras.webp.
//   3) El archivo que esta hoy en R2 conserva ese nombre base y el logo es el de BTA.
// Es la unica de las categorias sin productos que tiene logo; las otras 17 nunca lo tuvieron.
const OVERRIDES = {
  15: "BTA Tools",
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(path, { method = "GET", token, body, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body) {
    payload = body;
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(json);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const texto = await res.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }
  if (!res.ok) {
    const msg =
      datos && typeof datos === "object" && typeof datos.message === "string"
        ? datos.message
        : `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return datos;
}

function agruparPorCategoria(productos) {
  // categoriaId -> Set de marcaId
  const mapa = new Map();
  for (const p of productos) {
    const k = String(p.categoriaId);
    if (!mapa.has(k)) mapa.set(k, new Set());
    mapa.get(k).add(String(p.marcaId));
  }
  return mapa;
}

function repartoPorMarca(productos, categoriaId) {
  const cuenta = new Map();
  for (const p of productos) {
    if (String(p.categoriaId) !== String(categoriaId)) continue;
    const k = String(p.marcaId);
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  console.log(`Destino:  ${BASE}`);
  console.log(
    `Modo:     ${APPLY ? "APLICAR (escribe)" : "SIMULACRO (no escribe)"}`,
  );
  console.log("");

  const { token } = await pedir("/api/Auth/login", {
    method: "POST",
    json: { nombre: usuario, password: clave },
  });
  if (!token) throw new Error("El login no devolvio un token");
  console.log("Login OK");

  const [categorias, productos, marcas] = await Promise.all([
    pedir("/api/Categorias", { token }),
    pedir("/api/Productos", { token }),
    pedir("/api/Marcas", { token }),
  ]);

  const nombreMarca = new Map(marcas.map((m) => [String(m.id), m.nombre]));
  // Normalizado para que el nombre escrito en OVERRIDES no dependa de mayusculas.
  const idMarca = new Map(
    marcas.map((m) => [String(m.nombre).trim().toLowerCase(), Number(m.id)]),
  );

  // Validar los overrides contra el catalogo real ANTES de escribir nada, para
  // que un id o un nombre mal escritos aborten y no falle a mitad del recorrido.
  for (const [cid, nombre] of Object.entries(OVERRIDES)) {
    if (!categorias.some((c) => String(c.id) === String(cid))) {
      throw new Error(`OVERRIDES: la categoria id ${cid} no existe en el catalogo`);
    }
    if (!idMarca.has(String(nombre).trim().toLowerCase())) {
      throw new Error(
        `OVERRIDES: la marca "${nombre}" no existe. Marcas actuales: ` +
          marcas.map((m) => m.nombre).join(", "),
      );
    }
  }

  console.log(
    `Categorias: ${categorias.length}  Productos: ${productos.length}  Marcas: ${marcas.length}`,
  );
  console.log("");

  const marcasPorCategoria = agruparPorCategoria(productos);

  const aAsignar = [];
  const yaTenian = [];
  const sinProductos = [];
  const mezcladas = [];

  for (const c of categorias) {
    if (c.marcaId !== null && c.marcaId !== undefined) {
      yaTenian.push(c);
      continue;
    }
    // Un override manda sobre la deduccion: es una decision tomada a mano.
    const forzado = OVERRIDES[String(c.id)];
    if (forzado) {
      aAsignar.push({
        categoria: c,
        marcaId: idMarca.get(String(forzado).trim().toLowerCase()),
        origen: "override",
      });
      continue;
    }
    const set = marcasPorCategoria.get(String(c.id));
    if (!set || set.size === 0) {
      sinProductos.push(c);
      continue;
    }
    if (set.size > 1) {
      mezcladas.push(c);
      continue;
    }
    aAsignar.push({
      categoria: c,
      marcaId: Number([...set][0]),
      origen: "deducida",
    });
  }

  const deducidas = aAsignar.filter((it) => it.origen === "deducida");
  const decididas = aAsignar.filter((it) => it.origen === "override");

  if (deducidas.length) {
    console.log("---------- DEDUCIDAS DE SUS PRODUCTOS ----------");
    const porMarca = new Map();
    for (const it of deducidas) {
      const k = String(it.marcaId);
      porMarca.set(k, (porMarca.get(k) ?? 0) + 1);
    }
    for (const [id, n] of [...porMarca.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(
        `  ${String(nombreMarca.get(id) ?? `id ${id}`).padEnd(14)} ${String(n).padStart(3)} categorias`,
      );
    }
    console.log(`  ${"SUBTOTAL".padEnd(14)} ${String(deducidas.length).padStart(3)}`);
    console.log("");
  }

  if (decididas.length) {
    console.log("---------- ASIGNADAS A MANO (OVERRIDES) ----------");
    for (const it of decididas) {
      console.log(
        `  id ${String(it.categoria.id).padEnd(4)} ${it.categoria.nombre}  ->  ${nombreMarca.get(String(it.marcaId))}`,
      );
    }
    console.log("");
  }

  console.log(
    `---------- TOTAL A ASIGNAR: ${aAsignar.length} ----------`,
  );
  console.log("");

  if (mezcladas.length) {
    console.log("---------- MEZCLA DE MARCAS: quedan sin tocar ----------");
    for (const c of mezcladas) {
      const detalle = repartoPorMarca(productos, c.id)
        .map(([mid, n]) => `${nombreMarca.get(mid) ?? mid}=${n}`)
        .join(" + ");
      console.log(`  id ${String(c.id).padEnd(4)} ${c.nombre}  ->  ${detalle}`);
    }
    console.log("");
  }

  if (sinProductos.length) {
    console.log("---------- SIN PRODUCTOS: quedan sin tocar ----------");
    for (const c of sinProductos)
      console.log(`  id ${String(c.id).padEnd(4)} ${c.nombre}`);
    console.log("");
  }

  if (yaTenian.length) {
    console.log(
      `---------- YA TENIAN MARCA: ${yaTenian.length}, se omiten ----------`,
    );
    console.log("");
  }

  if (!APPLY) {
    console.log("SIMULACRO: no se hizo ningun PUT.");
    console.log("Si el listado te cierra bien, corré de nuevo con --apply.");
    return 0;
  }

  console.log(`--------- PUT a ${aAsignar.length} categorias ---------`);
  const fallidas = [];
  for (const [i, { categoria, marcaId, origen }] of aAsignar.entries()) {
    // Se manda nombre porque el PUT lo exige, y NO se manda Imagen para no
    // pisar el logo: el controller reutiliza el valor actual si viene vacio.
    const fd = new FormData();
    fd.append("nombre", categoria.nombre);
    fd.append("MarcaId", String(marcaId));
    const marca = origen === "override" ? " [a mano]" : "";
    try {
      await pedir(`/api/Categorias/${categoria.id}`, {
        method: "PUT",
        token,
        body: fd,
      });
      process.stdout.write(
        `  [${i + 1}/${aAsignar.length}] ok ${categoria.nombre}${marca}\n`,
      );
    } catch (err) {
      fallidas.push({ categoria, error: err.message });
      console.error(
        `  [${i + 1}/${aAsignar.length}] FALLO ${categoria.nombre}: ${err.message}`,
      );
      if (err.status === 401) {
        console.error("Token vencido. Corré el login de nuevo.");
        break;
      }
    }
    await dormir(PAUSA_MS);
  }

  console.log("");
  console.log(
    `Listo. Asignadas: ${aAsignar.length - fallidas.length}  Fallidas: ${fallidas.length}`,
  );
  if (fallidas.length) {
    for (const f of fallidas)
      console.error(`  id ${f.categoria.id} ${f.categoria.nombre}: ${f.error}`);
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
