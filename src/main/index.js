import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initDb } from './db.js'
import { createServer } from './server.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let apiBaseUrl = ''
let db = null

async function iniciarServidor() {
  const userData = app.getPath('userData')
  fs.mkdirSync(userData, { recursive: true })

  const dbPath = process.env.INDUMENTARIA_DB || path.join(userData, 'indumentaria.db')
  db = initDb(dbPath)

  const staticDir = path.join(__dirname, '../renderer')
  const imagenesDir = path.join(userData, 'imagenes')
  fs.mkdirSync(imagenesDir, { recursive: true })
  const server = createServer({
    db,
    staticDir,
    imagenesDir,
    escritorioDir: app.getPath('desktop')
  })

  const baseUrl = await new Promise((resolve, reject) => {
    const srv = server.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      resolve(`http://127.0.0.1:${port}`)
    })
    srv.on('error', reject)
  })

  return baseUrl
}

function resolverPreload() {
  const base = path.join(__dirname, '../preload')
  for (const nombre of ['index.cjs', 'index.mjs', 'index.js']) {
    const candidato = path.join(base, nombre)
    if (fs.existsSync(candidato)) return candidato
  }
  return path.join(base, 'index.cjs')
}

function resolverIcono() {
  const candidatos = [
    path.join(__dirname, '../renderer/logo.png'),
    path.join(__dirname, '../../src/renderer/public/logo.png'),
    path.join(__dirname, '../../build/icon.ico')
  ]
  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) return candidato
  }
  return undefined
}

function crearVentana() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'NAZCA',
    icon: resolverIcono(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolverPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadURL(apiBaseUrl)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    apiBaseUrl = await iniciarServidor()
    process.env.API_BASE_URL = apiBaseUrl
    crearVentana()
  } catch (err) {
    console.error('No se pudo iniciar el sistema', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) crearVentana()
})

app.on('before-quit', () => {
  if (db) {
    try {
      db.close()
    } catch {
      /* ignorar */
    }
  }
})
