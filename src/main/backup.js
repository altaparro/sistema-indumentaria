import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

function selloTiempo(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`
}

function escaparValor(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number' || typeof v === 'bigint') return String(v)
  if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

function listarTablas(db) {
  return db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY rowid`
    )
    .all()
    .map((t) => t.name)
}

function generarDumpSQL(db) {
  const lineas = [
    '-- Backup de Indumentaria',
    `-- Generado: ${new Date().toISOString()}`,
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;'
  ]

  const objetos = db
    .prepare(
      `SELECT type, name, sql FROM sqlite_master
       WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL
       ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid`
    )
    .all()

  for (const obj of objetos) {
    lineas.push(obj.sql + ';')
    if (obj.type !== 'table') continue
    const filas = db.prepare(`SELECT * FROM "${obj.name}"`).all()
    for (const f of filas) {
      const cols = Object.keys(f)
      lineas.push(
        `INSERT INTO "${obj.name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols
          .map((c) => escaparValor(f[c]))
          .join(', ')});`
      )
    }
  }

  lineas.push('COMMIT;')
  return lineas.join('\n')
}

function nombreHoja(tabla) {
  return tabla.replace(/[[\]:*?/\\]/g, '_').slice(0, 31)
}

function generarExcel(db, ruta) {
  const tablas = listarTablas(db)
  const wb = XLSX.utils.book_new()

  for (const tabla of tablas) {
    const columnas = db.pragma(`table_info("${tabla}")`).map((c) => c.name)
    const filas = db.prepare(`SELECT * FROM "${tabla}"`).all()
    const hoja =
      filas.length > 0
        ? XLSX.utils.json_to_sheet(filas, { header: columnas })
        : XLSX.utils.aoa_to_sheet([columnas])
    XLSX.utils.book_append_sheet(wb, hoja, nombreHoja(tabla))
  }

  const libro = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(ruta, libro)
  return tablas
}

export function generarBackup({ db, destino }) {
  fs.mkdirSync(destino, { recursive: true })

  const base = path.join(destino, `backup-indumentaria-${selloTiempo()}`)

  const rutaSql = base + '.sql'
  fs.writeFileSync(rutaSql, generarDumpSQL(db), 'utf8')

  const rutaExcel = base + '.xlsx'
  const tablas = generarExcel(db, rutaExcel)

  let filas = 0
  for (const tabla of tablas) {
    filas += db.prepare(`SELECT COUNT(*) AS n FROM "${tabla}"`).get().n
  }

  return { rutaSql, rutaExcel, tablas: tablas.length, filas }
}
