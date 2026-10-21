import fs from 'node:fs'
import path from 'node:path'

const GRAPH = 'https://graph.facebook.com'
const VERSION = 'v25.0'
const IMGBB_UPLOAD = 'https://api.imgbb.com/1/upload'
const MAX_INTENTOS = 5
const LOTE = 20
const REINTENTO_MS = 30 * 1000

function retailerId(productoId) {
  return `prod-${productoId}`
}

function ahora() {
  return new Date().toISOString()
}

async function subirImagenImgBB(apiKey, ruta) {
  const buffer = fs.readFileSync(ruta)
  const body = new URLSearchParams()
  body.set('key', apiKey)
  body.set('image', buffer.toString('base64'))
  const res = await fetch(IMGBB_UPLOAD, { method: 'POST', body })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success) {
    throw new Error(data?.error?.message || 'No se pudo subir la imagen a ImgBB')
  }
  return data.data.url
}

async function pedirMeta(url) {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error?.message || `Error ${res.status} al consultar Meta`)
  }
  return data
}

export function crearSincronizador({ db, dirImagenes }) {
  let procesando = false
  let temporizador = null

  function getSetting(clave) {
    const fila = db.prepare('SELECT valor FROM settings WHERE clave = ?').get(clave)
    return fila?.valor ?? ''
  }

  function setSetting(clave, valor) {
    db.prepare(
      'INSERT INTO settings (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor'
    ).run(clave, String(valor ?? ''))
  }

  function obtenerConfig() {
    return {
      token: getSetting('wa_token'),
      catalog_id: getSetting('wa_catalog_id'),
      imgbb_key: getSetting('wa_imgbb_key'),
      sync_auto: getSetting('wa_sync_auto') === '1'
    }
  }

  function armarDatos(producto, imagenUrl) {
    const nombre = String(producto.nombre || '').trim().slice(0, 140)
    const variante = [producto.talle, producto.color].filter(Boolean).join(' ')
    const title = variante ? `${nombre} — ${variante}`.slice(0, 190) : nombre

    const partes = []
    if (producto.tipo_nombre) partes.push(producto.tipo_nombre)
    if (producto.talle) partes.push(`Talle ${producto.talle}`)
    if (producto.color) partes.push(`Color ${producto.color}`)
    if (producto.marca) partes.push(`Marca ${producto.marca}`)
    if (producto.codigo) partes.push(`Código ${producto.codigo}`)
    const description = (partes.join(' · ') || nombre).slice(0, 999)

    const marca = String(producto.marca || getSetting('nombre_negocio') || 'Indumentaria').slice(0, 99)
    const precio = Number(producto.precio_venta || 0)

    const datos = {
      id: retailerId(producto.id),
      title,
      description,
      brand: marca,
      price: `${precio.toFixed(2)} ARS`,
      availability: Number(producto.stock || 0) > 0 ? 'in stock' : 'out of stock',
      condition: 'new'
    }
    if (imagenUrl) datos.image_link = imagenUrl
    return datos
  }

  function encolar(productoId, accion) {
    const cfg = obtenerConfig()
    const ejecutar = db.transaction(() => {
      db.prepare("DELETE FROM sync_cola WHERE producto_id = ? AND estado IN ('pendiente','error')").run(productoId)
      if (!cfg.sync_auto) return
      if (accion === 'DELETE') {
        const sincronizado = db
          .prepare('SELECT wa_sincronizado FROM productos WHERE id = ?')
          .get(productoId)?.wa_sincronizado
        if (!sincronizado) return
      }
      db.prepare('INSERT INTO sync_cola (producto_id, accion) VALUES (?, ?)').run(productoId, accion)
    })
    ejecutar()
    agendarProcesamiento()
  }

  function agendarProcesamiento() {
    if (temporizador) clearTimeout(temporizador)
    temporizador = setTimeout(() => {
      temporizador = null
      procesarCola().catch((err) => console.error('[whatsapp] cola de sincronización:', err))
    }, 1000)
  }

  function agendarReintento() {
    if (temporizador) clearTimeout(temporizador)
    temporizador = setTimeout(() => {
      temporizador = null
      procesarCola().catch((err) => console.error('[whatsapp] reintento de sincronización:', err))
    }, REINTENTO_MS)
  }

  function marcarError(item, mensaje) {
    const intentos = item.intentos + 1
    const estado = intentos >= MAX_INTENTOS ? 'error' : 'pendiente'
    db.prepare(
      `UPDATE sync_cola SET estado = ?, intentos = ?, ultimo_error = ?, updated_at = ? WHERE id = ?`
    ).run(estado, intentos, String(mensaje || 'Error desconocido').slice(0, 500), ahora(), item.id)
  }

  async function itemsBatch(catalogId, token, requests) {
    const url = `${GRAPH}/${VERSION}/${catalogId}/items_batch?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow_upsert: true, item_type: 'PRODUCT_ITEM', requests })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error?.message || `Error ${res.status} de Meta`)
    }
    return data
  }

  async function procesarCola() {
    if (procesando) return
    procesando = true
    try {
      const cfg = obtenerConfig()
      if (!cfg.token || !cfg.catalog_id) return

      const pendientes = db
        .prepare(
          `SELECT * FROM sync_cola WHERE estado IN ('pendiente','error') AND intentos < ?
           ORDER BY id LIMIT ?`
        )
        .all(MAX_INTENTOS, LOTE)
      if (pendientes.length === 0) return

      const requests = []
      const listos = []

      for (const item of pendientes) {
        try {
          if (item.accion === 'DELETE') {
            requests.push({ method: 'DELETE', data: { id: retailerId(item.producto_id) } })
            listos.push({ colaId: item.id, productoId: item.producto_id, accion: 'DELETE' })
            continue
          }

          const producto = db
            .prepare(
              `SELECT p.*, tp.nombre AS tipo_nombre
               FROM productos p LEFT JOIN tipo_producto tp ON tp.id = p.tipo_producto_id
               WHERE p.id = ?`
            )
            .get(item.producto_id)

          if (!producto) {
            requests.push({ method: 'DELETE', data: { id: retailerId(item.producto_id) } })
            listos.push({ colaId: item.id, productoId: item.producto_id, accion: 'DELETE' })
            continue
          }

          let imagenUrl = producto.imagen_url_publica || ''
          if (producto.imagen && !imagenUrl) {
            if (!cfg.imgbb_key) throw new Error('Falta configurar la API key de ImgBB para subir la imagen')
            const ruta = path.join(dirImagenes, path.basename(producto.imagen))
            imagenUrl = await subirImagenImgBB(cfg.imgbb_key, ruta)
            db.prepare('UPDATE productos SET imagen_url_publica = ? WHERE id = ?').run(imagenUrl, producto.id)
          }

          requests.push({ method: 'UPDATE', data: armarDatos(producto, imagenUrl) })
          listos.push({ colaId: item.id, productoId: item.producto_id, accion: item.accion })
        } catch (err) {
          marcarError(item, err.message)
        }
      }

      if (requests.length === 0) return

      try {
        await itemsBatch(cfg.catalog_id, cfg.token, requests)
      } catch (err) {
        for (const item of pendientes) {
          const actual = db.prepare('SELECT intentos FROM sync_cola WHERE id = ?').get(item.id)
          if (actual && actual.intentos === item.intentos) marcarError(item, err.message)
        }
        const quedanTrasError = db
          .prepare(
            `SELECT COUNT(*) AS c FROM sync_cola
             WHERE estado = 'pendiente' OR (estado = 'error' AND intentos < ?)`
          )
          .get(MAX_INTENTOS).c
        if (quedanTrasError > 0) agendarReintento()
        return
      }

      const confirmar = db.transaction(() => {
        for (const l of listos) {
          db.prepare(
            `UPDATE sync_cola SET estado = 'listo', ultimo_error = NULL, updated_at = ? WHERE id = ?`
          ).run(ahora(), l.colaId)
          if (l.accion === 'DELETE') {
            db.prepare('UPDATE productos SET wa_sincronizado = 0 WHERE id = ?').run(l.productoId)
          } else {
            db.prepare('UPDATE productos SET wa_sincronizado = 1 WHERE id = ?').run(l.productoId)
          }
        }
      })
      confirmar()

      const quedan = db
        .prepare(
          `SELECT COUNT(*) AS c FROM sync_cola
           WHERE estado = 'pendiente' OR (estado = 'error' AND intentos < ?)`
        )
        .get(MAX_INTENTOS).c
      if (quedan > 0) agendarReintento()
    } finally {
      procesando = false
    }
  }

  async function probarConexion(token, catalogId) {
    const t = String(token || '').trim()
    const c = String(catalogId || '').trim()
    if (!t || !c) throw new Error('Falta el token de acceso o el ID del catálogo')
    return pedirMeta(`${GRAPH}/${VERSION}/${c}?fields=id,name&access_token=${encodeURIComponent(t)}`)
  }

  function sincronizarTodo() {
    const cfg = obtenerConfig()
    if (!cfg.token || !cfg.catalog_id) {
      throw new Error('Configurá primero el token de Meta y el ID del catálogo')
    }
    const encolarTodo = db.transaction(() => {
      db.prepare("DELETE FROM sync_cola WHERE estado = 'pendiente' AND accion != 'DELETE'").run()
      const productos = db.prepare('SELECT id FROM productos').all()
      const insertar = db.prepare(
        `INSERT INTO sync_cola (producto_id, accion) VALUES (?, 'UPDATE')`
      )
      for (const p of productos) insertar.run(p.id)
      return productos.length
    })
    const total = encolarTodo()
    agendarProcesamiento()
    return total
  }

  function reintentarErrores() {
    const info = db
      .prepare(`UPDATE sync_cola SET estado = 'pendiente', intentos = 0, updated_at = ? WHERE estado = 'error'`)
      .run(ahora())
    agendarProcesamiento()
    return info.changes
  }

  function estadoCola() {
    const cfg = obtenerConfig()
    const filas = db.prepare('SELECT estado, COUNT(*) AS c FROM sync_cola GROUP BY estado').all()
    const conteos = { pendiente: 0, listo: 0, error: 0 }
    for (const f of filas) conteos[f.estado] = f.c
    const ultimoError = db
      .prepare(
        `SELECT sc.ultimo_error, sc.updated_at, p.nombre AS producto
         FROM sync_cola sc LEFT JOIN productos p ON p.id = sc.producto_id
         WHERE sc.ultimo_error IS NOT NULL ORDER BY sc.updated_at DESC LIMIT 1`
      )
      .get()
    return {
      pendientes: conteos.pendiente,
      listos: conteos.listo,
      errores: conteos.error,
      total_productos: db.prepare('SELECT COUNT(*) AS c FROM productos').get().c,
      sincronizados: db.prepare('SELECT COUNT(*) AS c FROM productos WHERE wa_sincronizado = 1').get().c,
      ultimo_error: ultimoError || null,
      config: {
        token: Boolean(cfg.token),
        catalog_id: Boolean(cfg.catalog_id),
        imgbb_key: Boolean(cfg.imgbb_key),
        sync_auto: cfg.sync_auto
      }
    }
  }

  return {
    obtenerConfig,
    setSetting,
    encolar,
    procesarCola,
    probarConexion,
    sincronizarTodo,
    reintentarErrores,
    estadoCola
  }
}
