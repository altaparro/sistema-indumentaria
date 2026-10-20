import { useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { fmtPrecio } from '../lib/format'
import { coincideBusqueda } from '../lib/busqueda'
import { apiFetch, apiUpload, apiUrl } from '../lib/api'

function IconoBuscar() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

const TALLES = ['S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44', 'Único']

export default function Productos() {
  return <ContenidoProductos />
}

function ContenidoProductos() {
  const [productos, setProductos] = useState([])
  const [tipos, setTipos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState('')
  const [talleFiltro, setTalleFiltro] = useState('')

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [marca, setMarca] = useState('')
  const [stock, setStock] = useState('')
  const [precio, setPrecio] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [talle, setTalle] = useState('')
  const [color, setColor] = useState('')
  const [imagen, setImagen] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [imagenAbierta, setImagenAbierta] = useState(null)

  const [nuevoTipoVisible, setNuevoTipoVisible] = useState(false)
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState('')
  const [guardandoTipo, setGuardandoTipo] = useState(false)

  const [editandoId, setEditandoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')

      const [dataProd, dataTipos, dataProveedores] = await Promise.all([
        apiFetch('/api/productos'),
        apiFetch('/api/tipos'),
        apiFetch('/api/proveedores')
      ])

      setProductos(Array.isArray(dataProd) ? dataProd : [])
      setTipos(Array.isArray(dataTipos) ? dataTipos : [])
      setProveedores(Array.isArray(dataProveedores) ? dataProveedores : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDatos()
  }, [])

  useEffect(() => {
    if (!imagenAbierta) return
    function onKey(e) {
      if (e.key === 'Escape') setImagenAbierta(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imagenAbierta])

  async function guardarTipo(e) {
    e.preventDefault()
    if (guardandoTipo) return
    const nombreTipo = nuevoTipoNombre.trim()
    if (!nombreTipo) return

    try {
      setGuardandoTipo(true)
      const creado = await apiFetch('/api/tipos', { method: 'POST', body: { nombre: nombreTipo } })
      setTipos((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setTipoId(creado.id)
      setNuevoTipoNombre('')
      setNuevoTipoVisible(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoTipo(false)
    }
  }

  async function guardarProducto(e) {
    e.preventDefault()
    try {
      setGuardando(true)
      setError('')

      if (!nombre || !codigo) {
        setError('Nombre y código son obligatorios')
        return
      }

      const body = {
        nombre,
        codigo,
        marca: marca || null,
        stock: Number(stock || 0),
        precio_venta: Number(precio || 0),
        precio_compra: Number(precioCompra || 0),
        tipo_producto_id: tipoId || null,
        proveedor_id: proveedorId || null,
        talle: talle || null,
        color: color || null,
        imagen: imagen || null
      }

      await apiFetch('/api/productos', {
        method: editandoId ? 'PUT' : 'POST',
        body: editandoId ? { id: editandoId, ...body } : body
      })

      limpiarFormulario()
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarProducto(id) {
    try {
      await apiFetch(`/api/productos?id=${id}`, { method: 'DELETE' })
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    }
  }

  async function seleccionarImagen(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      setError('')
      setSubiendoImagen(true)
      const data = await apiUpload('/api/productos/imagen', archivo)
      setImagen(data.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendoImagen(false)
    }
  }

  function editarProducto(producto) {
    setEditandoId(producto.id)
    setNombre(producto.nombre)
    setCodigo(producto.codigo)
    setMarca(producto.marca || '')
    setStock(producto.stock)
    setPrecio(producto.precio_venta)
    setPrecioCompra(producto.precio_compra || '')
    setTipoId(producto.tipo_producto_id || '')
    setProveedorId(producto.proveedor_id || '')
    setTalle(producto.talle || '')
    setColor(producto.color || '')
    setImagen(producto.imagen || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre('')
    setCodigo('')
    setMarca('')
    setStock('')
    setPrecio('')
    setPrecioCompra('')
    setTipoId('')
    setProveedorId('')
    setTalle('')
    setColor('')
    setImagen('')
    setNuevoTipoVisible(false)
    setNuevoTipoNombre('')
  }

  const marcas = useMemo(() => {
    const set = new Set()
    productos.forEach((p) => p.marca && set.add(p.marca.trim()))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [productos])

  const talles = useMemo(() => {
    const set = new Set()
    productos.forEach((p) => p.talle && set.add(p.talle.trim()))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [productos])

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (marcaFiltro && p.marca?.trim() !== marcaFiltro) return false
      if (talleFiltro && p.talle?.trim() !== talleFiltro) return false
      if (!busqueda.trim()) return true
      return coincideBusqueda(busqueda, [
        p.nombre?.toLowerCase() ?? '',
        p.codigo?.toLowerCase() ?? '',
        p.tipo?.nombre?.toLowerCase() ?? '',
        p.marca?.toLowerCase() ?? '',
        p.talle?.toLowerCase() ?? '',
        p.color?.toLowerCase() ?? '',
        p.proveedor?.nombre?.toLowerCase() ?? ''
      ])
    })
  }, [productos, busqueda, marcaFiltro, talleFiltro])

  const stats = useMemo(() => {
    return {
      total: productos.length,
      unidades: productos.reduce((acc, p) => acc + (p.stock || 0), 0),
      valor: productos.reduce((acc, p) => acc + (p.stock || 0) * (p.precio_venta || 0), 0),
      ganancia: productos.reduce(
        (acc, p) => acc + (p.stock || 0) * ((p.precio_venta || 0) - (p.precio_compra || 0)),
        0
      ),
      bajoStock: productos.filter((p) => (p.stock || 0) <= 5).length
    }
  }, [productos])

  const claseInput =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200'
  const claseLabel =
    'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <div className="min-h-screen bg-crema-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <Nav />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Productos</h1>
            <p className="text-sm text-slate-500">Administrá tu inventario de forma simple</p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: 'Productos', value: stats.total, color: 'text-stone-900' },
            { label: 'Unidades en stock', value: stats.unidades, color: 'text-emerald-600' },
            { label: 'Valor inventario', value: fmtPrecio.format(stats.valor), color: 'text-stone-900' },
            { label: 'Ganancia estimada', value: fmtPrecio.format(stats.ganancia), color: 'text-stone-900' },
            { label: 'Stock bajo (≤5)', value: stats.bajoStock, color: 'text-amber-600' }
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={`mt-1 truncate text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <IconoBuscar />
            </span>
            <input
              type="search"
              placeholder="Buscar por nombre, código, tipo, marca, talle o color..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={marcaFiltro}
              onChange={(e) => setMarcaFiltro(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={talleFiltro}
              onChange={(e) => setTalleFiltro(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
            >
              <option value="">Todos los talles</option>
              {talles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {(marcaFiltro || talleFiltro) && (
              <button
                type="button"
                onClick={() => {
                  setMarcaFiltro('')
                  setTalleFiltro('')
                }}
                className="hidden whitespace-nowrap rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:block"
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <form onSubmit={guardarProducto} className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            {editandoId ? `Editando producto #${editandoId}` : 'Nuevo producto'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={claseLabel}>Marca</label>
              <input
                list="lista-marcas"
                placeholder="Elegí o escribí una marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className={claseInput}
              />
              <datalist id="lista-marcas">
                {marcas.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={claseLabel}>Imagen</label>
              <div className="flex items-center gap-3">
                {imagen ? (
                  <img
                    src={apiUrl(imagen)}
                    alt="Vista previa"
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  </div>
                )}
                <label
                  className={`cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 ${
                    subiendoImagen ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  {subiendoImagen ? 'Subiendo...' : imagen ? 'Cambiar' : 'Elegir archivo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={subiendoImagen}
                    onChange={seleccionarImagen}
                  />
                </label>
                {imagen && !subiendoImagen && (
                  <button
                    type="button"
                    onClick={() => setImagen('')}
                    className="text-xs font-medium text-slate-400 transition hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={claseLabel}>Nombre *</label>
              <input
                placeholder="Ej: Remera algodón"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Código *</label>
              <input
                placeholder="Ej: REM-001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Talle</label>
              <input
                list="lista-talles"
                placeholder="S, M, L, 40..."
                value={talle}
                onChange={(e) => setTalle(e.target.value)}
                className={claseInput}
              />
              <datalist id="lista-talles">
                {TALLES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={claseLabel}>Color</label>
              <input
                placeholder="Ej: Negro"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Tipo</label>
              <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} className={claseInput}>
                <option value="">Sin tipo</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={claseLabel}>Proveedor</label>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={claseInput}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={claseLabel}>Stock</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Precio venta</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Precio compra</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                className={claseInput}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
            >
              {editandoId ? 'Actualizar' : guardando ? 'Guardando...' : 'Agregar'}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}

            {!nuevoTipoVisible ? (
              <button
                type="button"
                onClick={() => setNuevoTipoVisible(true)}
                className="ml-auto text-sm font-medium text-stone-900 transition hover:text-stone-700"
              >
                + Crear nuevo tipo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  placeholder="Nombre del tipo"
                  value={nuevoTipoNombre}
                  onChange={(e) => setNuevoTipoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && guardarTipo(e)}
                  autoFocus
                  className="w-48 rounded-lg border border-crema-300 bg-crema-50 px-3 py-1.5 text-sm outline-none focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
                />
                <button
                  type="button"
                  onClick={guardarTipo}
                  disabled={guardandoTipo}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {guardandoTipo ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoTipoVisible(false)
                    setNuevoTipoNombre('')
                  }}
                  className="text-sm text-slate-500 transition hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Imagen</th>
                <th className="px-3 py-3">Marca</th>
                <th className="px-3 py-3">Nombre</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Talle</th>
                <th className="px-3 py-3">Color</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="hidden px-3 py-3 xl:table-cell">Proveedor</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="hidden px-3 py-3 text-right xl:table-cell">P. Compra</th>
                <th className="px-3 py-3 text-right">P. Venta</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">Ganancia</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 14 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <p className="font-medium text-slate-600">
                      {productos.length === 0
                        ? 'No hay productos cargados.'
                        : 'No se encontraron productos con esa búsqueda.'}
                    </p>
                    {productos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusqueda('')
                          setMarcaFiltro('')
                          setTalleFiltro('')
                        }}
                        className="mt-2 text-sm font-medium text-stone-900 hover:text-stone-700"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const stockBajo = (p.stock || 0) <= 5
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="px-3 py-3 text-slate-400">{p.id}</td>
                      <td className="px-3 py-3">
                        {p.imagen ? (
                          <button
                            type="button"
                            onClick={() => setImagenAbierta({ url: apiUrl(p.imagen), nombre: p.nombre })}
                            title="Ver imagen grande"
                            className="block cursor-zoom-in"
                          >
                            <img src={apiUrl(p.imagen)} alt={p.nombre} className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200 transition hover:ring-2 hover:ring-stone-900" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {p.marca ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                            {p.marca}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">{p.nombre}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {p.codigo}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {p.talle ? (
                          <span className="inline-flex rounded-md bg-crema-200 px-2 py-0.5 text-xs font-semibold text-stone-700">
                            {p.talle}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{p.color || '—'}</td>
                      <td className="px-3 py-3">
                        {p.tipo ? (
                          <span className="inline-flex rounded-full bg-crema-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 ring-1 ring-inset ring-crema-300">
                            {p.tipo.nombre}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 xl:table-cell">
                        {p.proveedor ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                            {p.proveedor.nombre}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 font-semibold ${
                            p.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : stockBajo
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums text-slate-600 xl:table-cell">
                        {fmtPrecio.format(p.precio_compra || 0)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-800">
                        {fmtPrecio.format(p.precio_venta || 0)}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                        <span
                          className={
                            (p.precio_venta || 0) - (p.precio_compra || 0) >= 0
                              ? 'font-semibold text-emerald-600'
                              : 'font-semibold text-red-600'
                          }
                        >
                          {fmtPrecio.format((p.precio_venta || 0) - (p.precio_compra || 0))}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => editarProducto(p)}
                            className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-crema-300 hover:bg-crema-50 hover:text-stone-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(p.id)}
                            className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          {productosFiltrados.length} de {productos.length} productos
        </footer>
      </div>

      {imagenAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
          onClick={() => setImagenAbierta(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen de ${imagenAbierta.nombre}`}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagenAbierta.url}
              alt={imagenAbierta.nombre}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl bg-white object-contain shadow-xl"
            />
            <p className="mt-3 text-center text-sm font-semibold text-white drop-shadow">
              {imagenAbierta.nombre}
            </p>
            <button
              type="button"
              onClick={() => setImagenAbierta(null)}
              aria-label="Cerrar"
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-base text-slate-500 shadow-lg transition hover:text-slate-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
