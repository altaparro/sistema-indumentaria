import Database from 'better-sqlite3'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tipo_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  codigo TEXT,
  marca TEXT,
  tipo_producto_id INTEGER REFERENCES tipo_producto(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  talle TEXT,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  precio_venta REAL NOT NULL DEFAULT 0,
  precio_compra REAL NOT NULL DEFAULT 0,
  imagen TEXT,
  imagen_url_publica TEXT,
  wa_sincronizado INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS productos_marca_idx ON productos(marca);
CREATE INDEX IF NOT EXISTS productos_talle_idx ON productos(talle);
CREATE INDEX IF NOT EXISTS productos_tipo_idx ON productos(tipo_producto_id);
CREATE INDEX IF NOT EXISTS productos_proveedor_idx ON productos(proveedor_id);

CREATE TABLE IF NOT EXISTS medio_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  interes REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  documento_tipo TEXT,
  documento_numero TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS clientes_nombre_idx ON clientes(nombre);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  medio_pago_id INTEGER REFERENCES medio_pago(id) ON DELETE SET NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  total_base REAL NOT NULL DEFAULT 0,
  descuento_pct REAL NOT NULL DEFAULT 0,
  interes_pct REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ventas_created_at_idx ON ventas(created_at DESC);
CREATE INDEX IF NOT EXISTS ventas_cliente_idx ON ventas(cliente_id);

CREATE TABLE IF NOT EXISTS venta_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  codigo_producto TEXT,
  talle TEXT,
  color TEXT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario REAL NOT NULL,
  costo_unitario REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS venta_detalle_venta_idx ON venta_detalle(venta_id);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE IF NOT EXISTS sync_cola (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('CREATE','UPDATE','DELETE')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','listo','error')),
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS sync_cola_estado_idx ON sync_cola(estado);
`

const TIPOS_INICIALES = [
  'Remeras',
  'Pantalones',
  'Camperas',
  'Buzos',
  'Camisas',
  'Calzado',
  'Lencería',
  'Accesorios',
  'Abrigo',
  'Deportivo'
]

const MEDIOS_INICIALES = [
  ['Efectivo', 0],
  ['Transferencia', 0],
  ['Débito', 0],
  ['Crédito 1 cuota', 5],
  ['Crédito 3 cuotas', 12],
  ['Crédito 6 cuotas', 22]
]

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function initDb(dbPath) {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(ESQUEMA)

  const columnas = db.prepare('PRAGMA table_info(productos)').all().map((c) => c.name)
  if (!columnas.includes('imagen_url_publica')) {
    db.exec('ALTER TABLE productos ADD COLUMN imagen_url_publica TEXT')
  }
  if (!columnas.includes('wa_sincronizado')) {
    db.exec('ALTER TABLE productos ADD COLUMN wa_sincronizado INTEGER NOT NULL DEFAULT 0')
  }

  const columnasVentas = db.prepare('PRAGMA table_info(ventas)').all().map((c) => c.name)
  if (!columnasVentas.includes('descuento_pct')) {
    db.exec('ALTER TABLE ventas ADD COLUMN descuento_pct REAL NOT NULL DEFAULT 0')
  }

  const seed = db.transaction(() => {
    const tipos = db.prepare('SELECT COUNT(*) AS c FROM tipo_producto').get().c
    if (tipos === 0) {
      const insertTipo = db.prepare('INSERT INTO tipo_producto (nombre) VALUES (?)')
      TIPOS_INICIALES.forEach((nombre) => insertTipo.run(nombre))
    }

    const medios = db.prepare('SELECT COUNT(*) AS c FROM medio_pago').get().c
    if (medios === 0) {
      const insertMedio = db.prepare('INSERT INTO medio_pago (nombre, interes) VALUES (?, ?)')
      MEDIOS_INICIALES.forEach(([nombre, interes]) => insertMedio.run(nombre, interes))
    }

    const usuarios = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c
    if (usuarios === 0) {
      db.prepare('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)').run(
        'admin',
        hashPassword('admin123')
      )
    }

    db.prepare(
      'INSERT INTO settings (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO NOTHING'
    ).run('nombre_negocio', 'Casa de Indumentaria')
  })

  seed()

  return db
}
