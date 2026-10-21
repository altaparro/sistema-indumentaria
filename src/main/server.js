import express from 'express'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { hashPassword, verifyPassword } from './db.js'
import { crearSincronizador } from './metaCatalog.js'

const SESIONES = new Map()
const DURACION_SESION_MS = 12 * 60 * 60 * 1000

const EXTENSIONES_IMAGEN = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
}

function borrarImagenSubida(dirImagenes, url) {
  if (!url || !url.startsWith('/imagenes/')) return
  const destino = path.join(dirImagenes, path.basename(url))
  if (!destino.startsWith(dirImagenes + path.sep)) return
  try {
    if (fs.existsSync(destino)) fs.unlinkSync(destino)
  } catch {
    /* ignorar */
  }
}

function crearToken(username) {
  const token = randomBytes(32).toString('hex')
  SESIONES.set(token, { username, expira: Date.now() + DURACION_SESION_MS })
  return token
}

function requerido(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const sesion = token ? SESIONES.get(token) : null

  if (!sesion) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' })
  }

  if (sesion.expira < Date.now()) {
    SESIONES.delete(token)
    return res.status(401).json({ error: 'Sesión expirada' })
  }

  req.usuario = sesion.username
  next()
}

function respuestaError(res, err, estado = 400) {
  console.error(err)
  res.status(estado).json({ error: err.message || 'Error inesperado' })
}

function normalizarDoc(numero) {
  return String(numero || '').replace(/\D/g, '') || null
}

// ---------- Lógica de ventas ----------

function registrarVenta(db, { medio_pago_id, cliente_id, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La venta debe tener al menos un producto')
  }

  const medio = db.prepare('SELECT * FROM medio_pago WHERE id = ?').get(medio_pago_id)
  if (!medio) throw new Error('Medio de pago inválido')

  if (cliente_id != null && !db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id)) {
    throw new Error('Cliente inválido')
  }

  const itemsNorm = items.map((i) => ({
    producto_id: Number(i.producto_id),
    cantidad: Number(i.cantidad)
  }))

  for (const it of itemsNorm) {
    if (!Number.isInteger(it.producto_id) || !Number.isInteger(it.cantidad) || it.cantidad <= 0) {
      throw new Error('Datos de la venta inválidos')
    }
  }

  let totalBase = 0
  for (const it of itemsNorm) {
    const p = db.prepare('SELECT * FROM productos WHERE id = ?').get(it.producto_id)
    if (!p) throw new Error(`El producto ${it.producto_id} no existe`)
    if ((p.stock || 0) < it.cantidad) {
      throw new Error(`Stock insuficiente para ${p.nombre}`)
    }
    totalBase += (p.precio_venta || 0) * it.cantidad
  }

  const interes = Number(medio.interes) || 0
  const total = Math.round(totalBase * (1 + interes / 100) * 100) / 100

  const ejecutar = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO ventas (medio_pago_id, cliente_id, total_base, interes_pct, total) VALUES (?, ?, ?, ?, ?)'
      )
      .run(medio_pago_id, cliente_id ?? null, totalBase, interes, total)

    const ventaId = info.lastInsertRowid
    const insertarDetalle = db.prepare(
      `INSERT INTO venta_detalle
        (venta_id, producto_id, nombre_producto, codigo_producto, talle, color, cantidad, precio_unitario, costo_unitario, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const descontar = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?')

    for (const it of itemsNorm) {
      const p = db.prepare('SELECT * FROM productos WHERE id = ?').get(it.producto_id)
      insertarDetalle.run(
        ventaId,
        p.id,
        p.nombre,
        p.codigo,
        p.talle,
        p.color,
        it.cantidad,
        p.precio_venta,
        p.precio_compra,
        (p.precio_venta || 0) * it.cantidad
      )
      descontar.run(it.cantidad, p.id)
    }

    return ventaId
  })

  const ventaId = ejecutar()

  return { venta_id: ventaId, total_base: totalBase, interes_pct: interes, total }
}

function editarVenta(db, { venta_id, medio_pago_id, cliente_id, items }) {
  const ejecutar = db.transaction(() => {
    const venta = db.prepare('SELECT id FROM ventas WHERE id = ?').get(venta_id)
    if (!venta) throw new Error('La venta no existe')

    const detalle = db
      .prepare('SELECT producto_id, cantidad FROM venta_detalle WHERE venta_id = ? AND producto_id IS NOT NULL')
      .all(venta_id)
    const restaurar = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?')
    for (const d of detalle) restaurar.run(d.cantidad, d.producto_id)

    db.prepare('DELETE FROM ventas WHERE id = ?').run(venta_id)

    return registrarVenta(db, { medio_pago_id, cliente_id, items })
  })

  return ejecutar()
}

function eliminarVenta(db, ventaId) {
  const ejecutar = db.transaction(() => {
    const venta = db.prepare('SELECT id FROM ventas WHERE id = ?').get(ventaId)
    if (!venta) throw new Error('La venta no existe')

    const detalle = db
      .prepare('SELECT producto_id, cantidad FROM venta_detalle WHERE venta_id = ? AND producto_id IS NOT NULL')
      .all(ventaId)
    const restaurar = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?')
    for (const d of detalle) restaurar.run(d.cantidad, d.producto_id)

    db.prepare('DELETE FROM ventas WHERE id = ?').run(ventaId)
  })

  ejecutar()
}

// ---------- Consultas ----------

function mapearVenta(row, detalle) {
  return {
    ...row,
    medio: row.medio_nombre ? { nombre: row.medio_nombre } : null,
    cliente: row.cliente_nombre ? { nombre: row.cliente_nombre } : null,
    detalle: detalle.filter((d) => d.venta_id === row.id)
  }
}

function listarVentas(db, { desde, hasta, limite = 200 } = {}) {
  let sql = `
    SELECT v.*, m.nombre AS medio_nombre, c.nombre AS cliente_nombre
    FROM ventas v
    LEFT JOIN medio_pago m ON m.id = v.medio_pago_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
  `
  const params = []
  const condiciones = []
  if (desde) {
    condiciones.push('v.created_at >= ?')
    params.push(desde)
  }
  if (hasta) {
    condiciones.push('v.created_at <= ?')
    params.push(hasta)
  }
  if (condiciones.length) sql += ` WHERE ${condiciones.join(' AND ')}`
  sql += ' ORDER BY v.created_at DESC, v.id DESC LIMIT ?'
  params.push(limite)

  const ventas = db.prepare(sql).all(...params)
  const ids = ventas.map((v) => v.id)
  const detalle =
    ids.length === 0
      ? []
      : db
          .prepare(`SELECT * FROM venta_detalle WHERE venta_id IN (${ids.map(() => '?').join(',')})`)
          .all(...ids)

  return ventas.map((v) => mapearVenta(v, detalle))
}

// ---------- App ----------

export function createServer({ db, staticDir, imagenesDir }) {
  const app = express()
  const dirImagenes = imagenesDir || path.join(os.tmpdir(), 'sistema-indumentaria-imagenes')
  fs.mkdirSync(dirImagenes, { recursive: true })
  const whatsapp = crearSincronizador({ db, dirImagenes })
  setTimeout(() => {
    whatsapp.procesarCola().catch((err) => console.error('[whatsapp] cola inicial:', err))
  }, 5000)
  app.use('/imagenes', express.static(dirImagenes))
  app.use(express.json({ limit: '10mb' }))

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // Autenticación
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
    }
    const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(String(username).trim())
    if (!usuario || !verifyPassword(String(password), usuario.password_hash)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const token = crearToken(usuario.username)
    res.json({ token, username: usuario.username })
  })

  app.post('/api/auth/logout', requerido, (req, res) => {
    const token = req.headers.authorization.slice(7)
    SESIONES.delete(token)
    res.json({ ok: true })
  })

  app.get('/api/auth/me', requerido, (req, res) => {
    res.json({ username: req.usuario })
  })

  // Usuarios
  app.get('/api/usuarios', requerido, (_req, res) => {
    res.json(db.prepare('SELECT id, username, created_at FROM usuarios ORDER BY username').all())
  })

  app.post('/api/usuarios', requerido, (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
    }
    try {
      const info = db
        .prepare('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)')
        .run(String(username).trim(), hashPassword(String(password)))
      res.status(201).json(db.prepare('SELECT id, username, created_at FROM usuarios WHERE id = ?').get(info.lastInsertRowid))
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ese usuario ya existe' })
      }
      respuestaError(res, err, 500)
    }
  })

  app.post('/api/usuarios/:id/password', requerido, (req, res) => {
    const id = Number(req.params.id)
    const { password } = req.body || {}
    if (!password) return res.status(400).json({ error: 'La nueva contraseña es obligatoria' })
    const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hashPassword(String(password)), id)
    res.json({ ok: true })
  })

  app.delete('/api/usuarios/:id', requerido, (req, res) => {
    const id = Number(req.params.id)
    const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    const total = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c
    if (total <= 1) return res.status(400).json({ error: 'No se puede eliminar el último usuario' })
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)
    res.json({ ok: true })
  })

  app.post('/api/config/cambiar-password', requerido, (req, res) => {
    const { current_password, new_password } = req.body || {}
    const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(req.usuario)
    if (!verifyPassword(String(current_password || ''), usuario.password_hash)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' })
    }
    if (!new_password || String(new_password).length < 4) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' })
    }
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(
      hashPassword(String(new_password)),
      usuario.id
    )
    res.json({ ok: true })
  })

  // Productos
  app.post(
    '/api/productos/imagen',
    requerido,
    express.raw({ type: Object.keys(EXTENSIONES_IMAGEN), limit: '8mb' }),
    (req, res) => {
      const tipo = req.headers['content-type']
      const extension = EXTENSIONES_IMAGEN[tipo]
      if (!extension || !req.body?.length) {
        return res
          .status(400)
          .json({ error: 'Formato de imagen no válido (usá JPG, PNG, WebP o GIF, máximo 8 MB)' })
      }
      const nombre = `${randomBytes(12).toString('hex')}${extension}`
      fs.writeFileSync(path.join(dirImagenes, nombre), req.body)
      res.status(201).json({ url: `/imagenes/${nombre}` })
    }
  )

  app.delete('/api/productos/imagen', requerido, (req, res) => {
    borrarImagenSubida(dirImagenes, String(req.query.url || ''))
    res.json({ ok: true })
  })

  app.get('/api/productos', requerido, (_req, res) => {
    const data = db
      .prepare(
        `SELECT p.*, t.id AS tipo_id, t.nombre AS tipo_nombre, pr.id AS proveedor_id, pr.nombre AS proveedor_nombre
         FROM productos p
         LEFT JOIN tipo_producto t ON t.id = p.tipo_producto_id
         LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
         ORDER BY p.id`
      )
      .all()
    res.json(
      data.map((p) => ({
        ...p,
        tipo: p.tipo_id ? { id: p.tipo_id, nombre: p.tipo_nombre } : null,
        proveedor: p.proveedor_id ? { id: p.proveedor_id, nombre: p.proveedor_nombre } : null
      }))
    )
  })

  app.post('/api/productos', requerido, (req, res) => {
    try {
      const b = req.body || {}
      if (!b.nombre || !String(b.nombre).trim()) {
        return res.status(400).json({ error: 'El nombre es obligatorio' })
      }
      const info = db
        .prepare(
          `INSERT INTO productos (nombre, codigo, marca, tipo_producto_id, proveedor_id, talle, color, stock, precio_venta, precio_compra, imagen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          String(b.nombre).trim(),
          b.codigo || null,
          b.marca || null,
          b.tipo_producto_id || null,
          b.proveedor_id || null,
          b.talle || null,
          b.color || null,
          Number(b.stock || 0),
          Number(b.precio_venta || 0),
          Number(b.precio_compra || 0),
          b.imagen || null
        )
      whatsapp.encolar(Number(info.lastInsertRowid), 'CREATE')
      res.status(201).json(db.prepare('SELECT * FROM productos WHERE id = ?').get(info.lastInsertRowid))
    } catch (err) {
      respuestaError(res, err, 500)
    }
  })

  app.put('/api/productos', requerido, (req, res) => {
    try {
      const b = req.body || {}
      if (!b.id) return res.status(400).json({ error: 'Falta el ID del producto' })
      const anterior = db.prepare('SELECT imagen FROM productos WHERE id = ?').get(b.id)
      const info = db.prepare(
        `UPDATE productos SET nombre = ?, codigo = ?, marca = ?, tipo_producto_id = ?, proveedor_id = ?, talle = ?, color = ?, stock = ?, precio_venta = ?, precio_compra = ?, imagen = ?
         WHERE id = ?`
      ).run(
        String(b.nombre ?? '').trim(),
        b.codigo || null,
        b.marca || null,
        b.tipo_producto_id || null,
        b.proveedor_id || null,
        b.talle || null,
        b.color || null,
        Number(b.stock || 0),
        Number(b.precio_venta || 0),
        Number(b.precio_compra || 0),
        b.imagen || null,
        b.id
      )
      const imagenNueva = b.imagen || null
      if (anterior?.imagen && anterior.imagen !== imagenNueva) {
        borrarImagenSubida(dirImagenes, anterior.imagen)
      }
      if (anterior && anterior.imagen !== imagenNueva) {
        db.prepare('UPDATE productos SET imagen_url_publica = NULL WHERE id = ?').run(b.id)
      }
      if (info.changes > 0) {
        whatsapp.encolar(Number(b.id), 'UPDATE')
      }
      res.json(db.prepare('SELECT * FROM productos WHERE id = ?').get(b.id))
    } catch (err) {
      respuestaError(res, err, 500)
    }
  })

  app.delete('/api/productos', requerido, (req, res) => {
    const id = Number(req.query.id)
    const producto = db.prepare('SELECT imagen, wa_sincronizado FROM productos WHERE id = ?').get(id)
    if (producto) whatsapp.encolar(id, 'DELETE')
    db.prepare('DELETE FROM productos WHERE id = ?').run(id)
    if (producto?.imagen) borrarImagenSubida(dirImagenes, producto.imagen)
    res.json({ ok: true })
  })

  // Tipos de producto
  app.get('/api/tipos', requerido, (_req, res) => {
    res.json(db.prepare('SELECT * FROM tipo_producto ORDER BY nombre').all())
  })

  app.post('/api/tipos', requerido, (req, res) => {
    const nombre = String(req.body?.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'El nombre del tipo es obligatorio' })
    try {
      const info = db.prepare('INSERT INTO tipo_producto (nombre) VALUES (?)').run(nombre)
      res.status(201).json(db.prepare('SELECT * FROM tipo_producto WHERE id = ?').get(info.lastInsertRowid))
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ese tipo ya existe' })
      }
      respuestaError(res, err, 500)
    }
  })

  // Proveedores
  app.get('/api/proveedores', requerido, (_req, res) => {
    res.json(db.prepare('SELECT * FROM proveedores ORDER BY nombre').all())
  })

  app.post('/api/proveedores', requerido, (req, res) => {
    const b = req.body || {}
    if (!b.nombre || !String(b.nombre).trim()) {
      return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' })
    }
    try {
      const info = db
        .prepare('INSERT INTO proveedores (nombre, telefono, email, direccion, notas) VALUES (?, ?, ?, ?, ?)')
        .run(String(b.nombre).trim(), b.telefono || null, b.email || null, b.direccion || null, b.notas || null)
      res.status(201).json(db.prepare('SELECT * FROM proveedores WHERE id = ?').get(info.lastInsertRowid))
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ya existe un proveedor con ese nombre' })
      }
      respuestaError(res, err, 500)
    }
  })

  app.put('/api/proveedores', requerido, (req, res) => {
    const b = req.body || {}
    if (!b.id) return res.status(400).json({ error: 'Falta el ID del proveedor' })
    try {
      db.prepare('UPDATE proveedores SET nombre = ?, telefono = ?, email = ?, direccion = ?, notas = ? WHERE id = ?').run(
        String(b.nombre ?? '').trim(),
        b.telefono || null,
        b.email || null,
        b.direccion || null,
        b.notas || null,
        b.id
      )
      res.json(db.prepare('SELECT * FROM proveedores WHERE id = ?').get(b.id))
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ya existe un proveedor con ese nombre' })
      }
      respuestaError(res, err, 500)
    }
  })

  app.delete('/api/proveedores', requerido, (req, res) => {
    db.prepare('DELETE FROM proveedores WHERE id = ?').run(Number(req.query.id))
    res.json({ ok: true })
  })

  // Clientes
  app.get('/api/clientes', requerido, (_req, res) => {
    res.json(db.prepare('SELECT * FROM clientes ORDER BY nombre').all())
  })

  app.post('/api/clientes', requerido, (req, res) => {
    const b = req.body || {}
    if (!b.nombre || !String(b.nombre).trim()) {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio' })
    }
    const info = db
      .prepare('INSERT INTO clientes (nombre, telefono, email, documento_tipo, documento_numero) VALUES (?, ?, ?, ?, ?)')
      .run(
        String(b.nombre).trim(),
        b.telefono || null,
        b.email || null,
        b.documento_tipo || null,
        normalizarDoc(b.documento_numero)
      )
    res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid))
  })

  app.put('/api/clientes', requerido, (req, res) => {
    const b = req.body || {}
    if (!b.id) return res.status(400).json({ error: 'Falta el ID del cliente' })
    db.prepare('UPDATE clientes SET nombre = ?, telefono = ?, email = ?, documento_tipo = ?, documento_numero = ? WHERE id = ?').run(
      String(b.nombre ?? '').trim(),
      b.telefono || null,
      b.email || null,
      b.documento_tipo || null,
      normalizarDoc(b.documento_numero),
      b.id
    )
    res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(b.id))
  })

  app.delete('/api/clientes', requerido, (req, res) => {
    db.prepare('DELETE FROM clientes WHERE id = ?').run(Number(req.query.id))
    res.json({ ok: true })
  })

  // Medios de pago
  app.get('/api/medios-pago', requerido, (_req, res) => {
    res.json(db.prepare('SELECT * FROM medio_pago ORDER BY interes, nombre').all())
  })

  app.put('/api/medios-pago', requerido, (req, res) => {
    const b = req.body || {}
    const items = Array.isArray(b.items) ? b.items : [b]
    if (items.length === 0) {
      return res.status(400).json({ error: 'No hay intereses para guardar' })
    }

    const existe = db.prepare('SELECT id FROM medio_pago WHERE id = ?')
    const actualizar = db.prepare('UPDATE medio_pago SET interes = ? WHERE id = ?')

    try {
      const guardarTodo = db.transaction((lista) => {
        for (const item of lista) {
          const id = Number(item.id)
          const interes = Number(item.interes)
          if (!Number.isInteger(id) || !existe.get(id)) {
            throw new Error('Medio de pago inválido')
          }
          if (!Number.isFinite(interes) || interes < -100 || interes > 1000) {
            throw new Error('El interés debe ser un número entre -100 y 1000')
          }
          actualizar.run(interes, id)
        }
      })
      guardarTodo(items)
    } catch (err) {
      return respuestaError(res, err, 400)
    }

    res.json(db.prepare('SELECT * FROM medio_pago ORDER BY interes, nombre').all())
  })

  // Ventas
  app.get('/api/ventas', requerido, (_req, res) => {
    res.json(listarVentas(db))
  })

  app.post('/api/ventas', requerido, (req, res) => {
    try {
      const b = req.body || {}
      const medioPagoId = Number(b.medio_pago_id)
      const clienteId = b.cliente_id ? Number(b.cliente_id) : null

      if (b.editar) {
        const ventaId = Number(b.venta_id)
        if (!Number.isInteger(ventaId)) return res.status(400).json({ error: 'ID de venta inválido' })
        const data = editarVenta(db, {
          venta_id: ventaId,
          medio_pago_id: medioPagoId,
          cliente_id: clienteId,
          items: b.items
        })
        return res.json(data)
      }

      const data = registrarVenta(db, {
        medio_pago_id: medioPagoId,
        cliente_id: clienteId,
        items: b.items
      })
      res.status(201).json(data)
    } catch (err) {
      respuestaError(res, err, 400)
    }
  })

  app.delete('/api/ventas', requerido, (req, res) => {
    const id = Number(req.query.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID de venta inválido' })
    try {
      eliminarVenta(db, id)
      res.json({ ok: true })
    } catch (err) {
      respuestaError(res, err, 400)
    }
  })

  // Reportes / contaduría
  app.get('/api/reportes', requerido, (req, res) => {
    const desde = req.query.desde || null
    const hasta = req.query.hasta || null
    res.json(listarVentas(db, { desde, hasta, limite: 5000 }))
  })

  // Dashboard
  app.get('/api/dashboard', requerido, (_req, res) => {
    const productos = db.prepare('SELECT COUNT(*) AS c, COALESCE(SUM(stock),0) AS unidades, COALESCE(SUM(stock * precio_venta),0) AS valor, COALESCE(SUM(stock * (precio_venta - precio_compra)),0) AS ganancia FROM productos').get()
    const bajoStock = db.prepare('SELECT COUNT(*) AS c FROM productos WHERE stock <= 5').get().c

    const ahora = new Date()
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

    const ventasHoy = db
      .prepare('SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total FROM ventas WHERE created_at >= ?')
      .get(inicioHoy)

    const ventasMes = db
      .prepare('SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total FROM ventas WHERE created_at >= ?')
      .get(inicioMes)

    res.json({
      productos: productos.c,
      unidades: productos.unidades,
      valor: productos.valor,
      ganancia: productos.ganancia,
      bajoStock,
      ventasHoy: ventasHoy.c,
      totalHoy: ventasHoy.total,
      ventasMes: ventasMes.c,
      totalMes: ventasMes.total
    })
  })

  // Sincronización con catálogo de WhatsApp (Meta)
  app.get('/api/whatsapp/config', requerido, (_req, res) => {
    res.json(whatsapp.obtenerConfig())
  })

  app.put('/api/whatsapp/config', requerido, (req, res) => {
    const b = req.body || {}
    whatsapp.setSetting('wa_token', String(b.token ?? '').trim())
    whatsapp.setSetting('wa_catalog_id', String(b.catalog_id ?? '').trim())
    whatsapp.setSetting('wa_imgbb_key', String(b.imgbb_key ?? '').trim())
    whatsapp.setSetting('wa_sync_auto', b.sync_auto ? '1' : '0')
    res.json(whatsapp.obtenerConfig())
  })

  app.post('/api/whatsapp/test', requerido, async (req, res) => {
    try {
      const cfg = whatsapp.obtenerConfig()
      const token = String(req.body?.token ?? '').trim() || cfg.token
      const catalogId = String(req.body?.catalog_id ?? '').trim() || cfg.catalog_id
      const catalogo = await whatsapp.probarConexion(token, catalogId)
      res.json({ ok: true, catalogo })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/whatsapp/status', requerido, (_req, res) => {
    res.json(whatsapp.estadoCola())
  })

  app.post('/api/whatsapp/sync-all', requerido, (_req, res) => {
    try {
      const encolados = whatsapp.sincronizarTodo()
      res.json({ ok: true, encolados })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  app.post('/api/whatsapp/retry', requerido, (_req, res) => {
    const reintentados = whatsapp.reintentarErrores()
    res.json({ ok: true, reintentados })
  })

  // Settings
  app.get('/api/settings', requerido, (_req, res) => {
    const filas = db.prepare('SELECT clave, valor FROM settings').all()
    res.json(Object.fromEntries(filas.map((f) => [f.clave, f.valor])))
  })

  app.put('/api/settings', requerido, (req, res) => {
    const b = req.body || {}
    const upsert = db.prepare('INSERT INTO settings (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor')
    Object.entries(b).forEach(([clave, valor]) => upsert.run(clave, String(valor ?? '')))
    res.json({ ok: true })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'sistema-indumentaria' })
  })

  // Archivos estáticos (build de producción)
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  return app
}
