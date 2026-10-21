import { Fragment, useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { fmtPrecio, fmtFecha } from '../lib/format'
import { coincideBusqueda } from '../lib/busqueda'
import { apiFetch } from '../lib/api'

function IconoBuscar() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

export default function Ventas() {
  return <ContenidoVentas />
}

function ContenidoVentas() {
  const [productos, setProductos] = useState([])
  const [medios, setMedios] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [medioPagoId, setMedioPagoId] = useState('')
  const [descuento, setDescuento] = useState('0')
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [ventaExitosa, setVentaExitosa] = useState(null)
  const [ventaAbierta, setVentaAbierta] = useState(null)
  const [busquedaVentas, setBusquedaVentas] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('')
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState('')
  const [nuevoClienteDocTipo, setNuevoClienteDocTipo] = useState('DNI')
  const [nuevoClienteDocNumero, setNuevoClienteDocNumero] = useState('')
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [ventaEditando, setVentaEditando] = useState(null)
  const [editCarrito, setEditCarrito] = useState([])
  const [editMedioPagoId, setEditMedioPagoId] = useState('')
  const [editDescuento, setEditDescuento] = useState('0')
  const [editClienteId, setEditClienteId] = useState('')
  const [editBusqueda, setEditBusqueda] = useState('')
  const [editProductoId, setEditProductoId] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [modalEliminarId, setModalEliminarId] = useState(null)
  const [procesandoEliminar, setProcesandoEliminar] = useState(false)

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')

      const [dataProd, dataMedios, dataVentas, dataClientes] = await Promise.all([
        apiFetch('/api/productos'),
        apiFetch('/api/medios-pago'),
        apiFetch('/api/ventas'),
        apiFetch('/api/clientes')
      ])

      setProductos(Array.isArray(dataProd) ? dataProd : [])
      setMedios(Array.isArray(dataMedios) ? dataMedios : [])
      setClientes(Array.isArray(dataClientes) ? dataClientes : [])
      setVentas(Array.isArray(dataVentas) ? dataVentas : [])

      setMedioPagoId((prev) => prev || (dataMedios?.[0]?.id ? String(dataMedios[0].id) : ''))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDatos()
  }, [])

  function agregarAlCarrito(producto) {
    setVentaExitosa(null)
    setCarrito((prev) => {
      const existente = prev.find((i) => i.id === producto.id)
      if (existente) {
        if (existente.cantidad >= (producto.stock || 0)) return prev
        return prev.map((i) => (i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      if ((producto.stock || 0) <= 0) return prev
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  function cambiarCantidad(id, delta) {
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const nueva = Math.min(Math.max(i.cantidad + delta, 1), i.stock || 1)
        return { ...i, cantidad: nueva }
      })
    )
  }

  function quitarDelCarrito(id) {
    setCarrito((prev) => prev.filter((i) => i.id !== id))
  }

  async function guardarClienteDesdeModal(e) {
    e.preventDefault()
    try {
      setGuardandoCliente(true)
      setError('')
      if (!nuevoClienteNombre.trim()) {
        setError('El nombre del cliente es obligatorio')
        return
      }
      const creado = await apiFetch('/api/clientes', {
        method: 'POST',
        body: {
          nombre: nuevoClienteNombre.trim(),
          telefono: nuevoClienteTelefono.trim() || null,
          email: nuevoClienteEmail.trim() || null,
          documento_tipo: nuevoClienteDocTipo || null,
          documento_numero: nuevoClienteDocNumero.trim() || null
        }
      })
      await obtenerDatos()
      setClienteId(String(creado.id))
      setModalClienteAbierto(false)
      setNuevoClienteNombre('')
      setNuevoClienteTelefono('')
      setNuevoClienteEmail('')
      setNuevoClienteDocTipo('DNI')
      setNuevoClienteDocNumero('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoCliente(false)
    }
  }

  function cerrarModalCliente() {
    setModalClienteAbierto(false)
    setError('')
  }

  async function finalizarVenta() {
    try {
      setProcesando(true)
      setError('')
      setVentaExitosa(null)

      if (carrito.length === 0) return

      const data = await apiFetch('/api/ventas', {
        method: 'POST',
        body: {
          medio_pago_id: Number(medioPagoId),
          cliente_id: clienteId ? Number(clienteId) : null,
          descuento_pct: descuentoPct,
          items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad }))
        }
      })

      setCarrito([])
      setClienteId('')
      setDescuento('0')
      setVentaExitosa(data)
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  function abrirEditar(v) {
    setVentaEditando(v)
    setEditCarrito(
      (v.detalle ?? []).map((d) => ({
        producto_id: d.producto_id,
        nombre_producto: d.nombre_producto,
        codigo_producto: d.codigo_producto,
        talle: d.talle,
        color: d.color,
        cantidad: d.cantidad,
        precio_unitario: Number(d.precio_unitario) || 0
      }))
    )
    setEditMedioPagoId(v.medio_pago_id ? String(v.medio_pago_id) : '')
    setEditDescuento(String(Number(v.descuento_pct) || 0))
    setEditClienteId(v.cliente_id ? String(v.cliente_id) : '')
    setEditBusqueda('')
    setEditProductoId('')
    setError('')
  }

  function cerrarEditar() {
    setVentaEditando(null)
    setEditCarrito([])
    setEditMedioPagoId('')
    setEditDescuento('0')
    setEditClienteId('')
    setEditBusqueda('')
    setEditProductoId('')
    setError('')
  }

  function cambiarCantidadEdit(id, delta) {
    setEditCarrito((prev) =>
      prev.map((i) => {
        if (i.producto_id !== id) return i
        const prod = productos.find((p) => p.id === id)
        const max = Math.max(prod?.stock || 0, i.cantidad)
        const nueva = Math.min(Math.max(i.cantidad + delta, 1), max)
        return { ...i, cantidad: nueva }
      })
    )
  }

  function quitarEditItem(id) {
    setEditCarrito((prev) => prev.filter((i) => i.producto_id !== id))
  }

  function agregarProductoEdit() {
    if (!editProductoId) return
    const prod = productos.find((p) => String(p.id) === String(editProductoId))
    if (!prod) return

    setEditCarrito((prev) => {
      const existente = prev.find((i) => i.producto_id === prod.id)
      if (existente) {
        const max = Math.max(prod.stock || 0, existente.cantidad)
        if (existente.cantidad >= max) return prev
        return prev.map((i) =>
          i.producto_id === prod.id
            ? { ...i, cantidad: i.cantidad + 1, precio_unitario: prod.precio_venta || 0 }
            : i
        )
      }
      if ((prod.stock || 0) <= 0) return prev
      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre_producto: prod.nombre,
          codigo_producto: prod.codigo,
          talle: prod.talle,
          color: prod.color,
          cantidad: 1,
          precio_unitario: prod.precio_venta || 0
        }
      ]
    })
    setEditProductoId('')
  }

  const editProductosFiltrados = useMemo(() => {
    if (!editBusqueda.trim()) return productos
    return productos.filter((p) =>
      coincideBusqueda(editBusqueda, [
        p.nombre?.toLowerCase() ?? '',
        p.codigo?.toLowerCase() ?? '',
        p.marca?.toLowerCase() ?? ''
      ])
    )
  }, [productos, editBusqueda])

  const editSubtotal = useMemo(
    () => editCarrito.reduce((acc, i) => acc + (i.precio_unitario || 0) * i.cantidad, 0),
    [editCarrito]
  )

  const editMedioSeleccionado = medios.find((m) => String(m.id) === String(editMedioPagoId))
  const editInteresPct = Number(editMedioSeleccionado?.interes || 0)
  const editDescuentoPct = Math.min(Math.max(Number(editDescuento) || 0, 0), 100)
  const editMontoDescuento = (editSubtotal * editDescuentoPct) / 100
  const editBaseDescuento = editSubtotal - editMontoDescuento
  const editMontoInteres = (editBaseDescuento * editInteresPct) / 100
  const editTotal = editBaseDescuento + editMontoInteres

  async function guardarEdicion() {
    try {
      setGuardandoEdicion(true)
      setError('')

      if (editCarrito.length === 0) return

      const data = await apiFetch('/api/ventas', {
        method: 'POST',
        body: {
          editar: true,
          venta_id: Number(ventaEditando.id),
          medio_pago_id: Number(editMedioPagoId),
          cliente_id: editClienteId ? Number(editClienteId) : null,
          descuento_pct: editDescuentoPct,
          items: editCarrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
        }
      })

      setVentaExitosa(data)
      cerrarEditar()
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoEdicion(false)
    }
  }

  async function confirmarEliminar() {
    try {
      setProcesandoEliminar(true)
      setError('')
      await apiFetch(`/api/ventas?id=${modalEliminarId}`, { method: 'DELETE' })
      setModalEliminarId(null)
      setVentaAbierta(null)
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoEliminar(false)
    }
  }

  const tiposDisponibles = useMemo(() => {
    const map = new Map()
    productos.forEach((p) => p.tipo && map.set(p.tipo.id, p.tipo.nombre))
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productos])

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (tipoFiltro && String(p.tipo?.id) !== String(tipoFiltro)) return false
      if (!busqueda.trim()) return true
      return coincideBusqueda(busqueda, [
        p.nombre?.toLowerCase() ?? '',
        p.codigo?.toLowerCase() ?? '',
        p.tipo?.nombre?.toLowerCase() ?? '',
        p.marca?.toLowerCase() ?? '',
        p.talle?.toLowerCase() ?? ''
      ])
    })
  }, [productos, busqueda, tipoFiltro])

  const subtotal = useMemo(
    () => carrito.reduce((acc, i) => acc + (i.precio_venta || 0) * i.cantidad, 0),
    [carrito]
  )

  const medioSeleccionado = medios.find((m) => String(m.id) === String(medioPagoId))
  const interesPct = Number(medioSeleccionado?.interes || 0)
  const descuentoPct = Math.min(Math.max(Number(descuento) || 0, 0), 100)
  const montoDescuento = (subtotal * descuentoPct) / 100
  const baseDescuento = subtotal - montoDescuento
  const montoInteres = (baseDescuento * interesPct) / 100
  const total = baseDescuento + montoInteres

  const ventasFiltradas = useMemo(() => {
    if (!busquedaVentas.trim()) return ventas
    return ventas.filter((v) =>
      coincideBusqueda(busquedaVentas, [
        v.cliente?.nombre?.toLowerCase() ?? '',
        v.medio?.nombre?.toLowerCase() ?? '',
        fmtFecha(v.created_at).toLowerCase(),
        String(v.id)
      ])
    )
  }, [ventas, busquedaVentas])

  const claseInput =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200'

  return (
    <div className="min-h-screen bg-crema-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Nav />
        <header className="mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva venta</h1>
            <p className="text-sm text-slate-500">Seleccioná productos, medio de pago y finalizá la venta</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {ventaExitosa && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Venta <strong>#{ventaExitosa.venta_id}</strong> registrada por{' '}
              <strong>{fmtPrecio.format(ventaExitosa.total)}</strong>. Stock actualizado.
            </span>
            <button
              type="button"
              onClick={() => setVentaExitosa(null)}
              className="shrink-0 text-emerald-600 hover:text-emerald-800"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <IconoBuscar />
                </span>
                <input
                  type="search"
                  placeholder="Buscar por nombre, código, tipo, marca o talle..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
                />
              </div>

              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
              >
                <option value="">Todos los tipos</option>
                {tiposDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))
              ) : productosFiltrados.length === 0 ? (
                <p className="py-12 text-center text-sm font-medium text-slate-500">
                  No se encontraron productos.
                </p>
              ) : (
                productosFiltrados.map((p) => {
                  const sinStock = (p.stock || 0) <= 0
                  const enCarrito = carrito.find((i) => i.id === p.id)

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                        enCarrito
                          ? 'border-crema-300 bg-crema-50'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {p.marca && <span className="text-stone-800">{p.marca} </span>}
                          {p.nombre}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{p.codigo}</span>
                          {p.talle && (
                            <span className="rounded bg-crema-200 px-1.5 py-0.5 font-semibold text-stone-700">
                              {p.talle}
                            </span>
                          )}
                          {p.color && <span className="text-slate-500">{p.color}</span>}
                          {p.tipo && (
                            <span className="rounded-full bg-crema-100 px-2 py-0.5 text-stone-800 ring-1 ring-inset ring-crema-300">
                              {p.tipo.nombre}
                            </span>
                          )}
                          <span className={sinStock ? 'font-semibold text-red-600' : 'text-slate-500'}>
                            Stock: {p.stock}
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800">
                        {fmtPrecio.format(p.precio_venta || 0)}
                      </span>

                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(p)}
                        disabled={sinStock}
                        className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {sinStock ? 'Sin stock' : '+ Agregar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                Carrito ({carrito.length})
              </h2>

              {carrito.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Todavía no agregaste productos.</p>
              ) : (
                <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                  {carrito.map((i) => (
                    <li key={i.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {i.marca && <span className="text-stone-800">{i.marca} </span>}
                          {i.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {i.talle && <span className="mr-1 font-semibold text-stone-700">{i.talle}</span>}
                          {i.color && <span className="mr-1">{i.color}</span>}
                          {fmtPrecio.format(i.precio_venta || 0)} c/u
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.id, -1)}
                          className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(i.id, 1)}
                          disabled={i.cantidad >= (i.stock || 0)}
                          className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                        {fmtPrecio.format((i.precio_venta || 0) * i.cantidad)}
                      </span>

                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(i.id)}
                        className="shrink-0 text-slate-400 transition hover:text-red-600"
                        aria-label={`Quitar ${i.nombre}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente (opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalClienteAbierto(true)}
                    className="text-xs font-semibold text-stone-900 transition hover:text-stone-700"
                  >
                    + Nuevo cliente
                  </button>
                </div>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={claseInput}
                >
                  <option value="">Sin cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.telefono ? ` — ${c.telefono}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medio de pago
                </label>
                <select
                  value={medioPagoId}
                  onChange={(e) => setMedioPagoId(e.target.value)}
                  className={claseInput}
                >
                  {medios.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                      {Number(m.interes) !== 0 ? ` (${m.interes > 0 ? '+' : ''}${m.interes}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Descuento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="0"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    className={`${claseInput} pr-9`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <dl className="space-y-1.5 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Descuento {descuentoPct > 0 ? `(${descuentoPct}%)` : ''}</dt>
                  <dd className={`tabular-nums ${montoDescuento > 0 ? 'font-semibold text-red-600' : ''}`}>
                    {montoDescuento > 0 ? '−' : ''} {fmtPrecio.format(montoDescuento)}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Interés {medioSeleccionado ? `(${interesPct}%)` : ''}</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(montoInteres)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={finalizarVenta}
                disabled={carrito.length === 0 || procesando || !medioPagoId}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {procesando ? 'Procesando...' : 'Finalizar venta'}
              </button>
            </div>
          </section>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Ventas realizadas</h2>
            <div className="relative sm:w-72">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <IconoBuscar />
              </span>
              <input
                type="search"
                placeholder="Buscar por cliente, medio de pago o fecha..."
                value={busquedaVentas}
                onChange={(e) => setBusquedaVentas(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">Medio de pago</th>
                  <th className="hidden px-4 py-3 md:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Subtotal</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Descuento</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Interés</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center font-medium text-slate-500">
                      Todavía no hay ventas registradas.
                    </td>
                  </tr>
                ) : ventasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <p className="font-medium text-slate-600">No se encontraron ventas con esa búsqueda.</p>
                      <button
                        type="button"
                        onClick={() => setBusquedaVentas('')}
                        className="mt-2 text-sm font-medium text-stone-900 hover:text-stone-700"
                      >
                        Limpiar búsqueda
                      </button>
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((v) => {
                    const abierta = ventaAbierta === v.id
                    const descMonto =
                      Math.round(((v.total_base || 0) * (Number(v.descuento_pct) || 0)) / 100 * 100) / 100
                    return (
                      <Fragment key={v.id}>
                        <tr
                          onClick={() => setVentaAbierta(abierta ? null : v.id)}
                          className={`cursor-pointer transition ${abierta ? 'bg-crema-50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {fmtFecha(v.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            #{v.id}
                            <span className="ml-2 text-xs text-slate-400">
                              {v.detalle?.length ?? 0} ítems {abierta ? '▲' : '▼'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                              {v.medio?.nombre ?? '—'}
                              {Number(v.interes_pct) !== 0 ? ` ${v.interes_pct > 0 ? '+' : ''}${v.interes_pct}%` : ''}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                            {v.cliente?.nombre || '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
                            {fmtPrecio.format(v.total_base || 0)}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-red-600 sm:table-cell">
                            {descMonto > 0 ? `− ${fmtPrecio.format(descMonto)}` : '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-amber-600 sm:table-cell">
                            {fmtPrecio.format((v.total || 0) - (v.total_base || 0) + descMonto)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                            {fmtPrecio.format(v.total || 0)}
                          </td>
                        </tr>

                        {abierta && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="px-4 py-3">
                              {v.cliente?.nombre && (
                                <p className="mb-2 text-sm font-semibold text-slate-800">
                                  Cliente: <span className="font-medium text-stone-800">{v.cliente.nombre}</span>
                                </p>
                              )}
                              <ul className="space-y-1 text-sm text-slate-600">
                                {(v.detalle ?? []).map((d) => (
                                  <li key={d.id} className="flex justify-between gap-4">
                                    <span>
                                      <strong className="text-slate-800">{d.cantidad}×</strong>{' '}
                                      {d.nombre_producto}
                                      {d.codigo_producto && (
                                        <span className="ml-2 font-mono text-xs text-slate-400">{d.codigo_producto}</span>
                                      )}
                                      {d.talle && (
                                        <span className="ml-2 rounded bg-crema-200 px-1.5 py-0.5 text-xs font-semibold text-stone-700">
                                          {d.talle}
                                        </span>
                                      )}
                                      {d.color && (
                                        <span className="ml-2 text-xs text-slate-500">{d.color}</span>
                                      )}
                                    </span>
                                    <span className="tabular-nums">{fmtPrecio.format(d.subtotal || 0)}</span>
                                  </li>
                                ))}
                              </ul>

                              {descMonto > 0 && (
                                <p className="mt-2 text-right text-sm font-semibold text-red-600">
                                  Descuento ({v.descuento_pct}%): −{fmtPrecio.format(descMonto)}
                                </p>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => abrirEditar(v)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalEliminarId(v.id)
                                    setError('')
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalClienteAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Nuevo cliente</h3>
              <button
                type="button"
                onClick={cerrarModalCliente}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={guardarClienteDesdeModal} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  className={claseInput}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 11-1234-5678"
                  value={nuevoClienteTelefono}
                  onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                  className={claseInput}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  placeholder="Ej: juan@correo.com"
                  value={nuevoClienteEmail}
                  onChange={(e) => setNuevoClienteEmail(e.target.value)}
                  className={claseInput}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tipo de documento
                  </label>
                  <select
                    value={nuevoClienteDocTipo}
                    onChange={(e) => setNuevoClienteDocTipo(e.target.value)}
                    className={claseInput}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CUIT">CUIT</option>
                    <option value="CUIL">CUIL</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CI">CI / Ext</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    N° de documento
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Documento"
                    value={nuevoClienteDocNumero}
                    onChange={(e) => setNuevoClienteDocNumero(e.target.value)}
                    className={claseInput}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModalCliente}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCliente}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                >
                  {guardandoCliente ? 'Guardando...' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ventaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Editar venta #{ventaEditando.id}</h3>
                <p className="text-xs text-slate-500">El stock se ajusta automáticamente al guardar</p>
              </div>
              <button
                type="button"
                onClick={cerrarEditar}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Agregar producto
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <IconoBuscar />
                    </span>
                    <input
                      type="search"
                      placeholder="Buscar producto..."
                      value={editBusqueda}
                      onChange={(e) => setEditBusqueda(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
                    />
                  </div>
                  <select
                    value={editProductoId}
                    onChange={(e) => setEditProductoId(e.target.value)}
                    className="max-w-[45%] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
                  >
                    <option value="">Seleccionar...</option>
                    {editProductosFiltrados.map((p) => (
                      <option key={p.id} value={p.id} disabled={(p.stock || 0) <= 0}>
                        {p.nombre}
                        {p.codigo ? ` (${p.codigo})` : ''} — Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={agregarProductoEdit}
                    disabled={!editProductoId}
                    className="shrink-0 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {editCarrito.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">
                  No hay productos en esta venta.
                </p>
              ) : (
                <ul className="space-y-2">
                  {editCarrito.map((i) => {
                    const prod = productos.find((p) => p.id === i.producto_id)
                    const max = Math.max(prod?.stock || 0, i.cantidad)
                    const prodEliminado = !prod
                    return (
                      <li
                        key={i.producto_id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          prodEliminado ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{i.nombre_producto}</p>
                          <p className="text-xs text-slate-500">
                            {fmtPrecio.format(i.precio_unitario || 0)} c/u
                            {prod ? ` — Stock actual: ${prod.stock}` : ' — producto eliminado'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => cambiarCantidadEdit(i.producto_id, -1)}
                            className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => cambiarCantidadEdit(i.producto_id, 1)}
                            disabled={i.cantidad >= max}
                            className="px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                          {fmtPrecio.format((i.precio_unitario || 0) * i.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => quitarEditItem(i.producto_id)}
                          className="shrink-0 text-slate-400 transition hover:text-red-600"
                          aria-label={`Quitar ${i.nombre_producto}`}
                        >
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Medio de pago
                  </label>
                  <select
                    value={editMedioPagoId}
                    onChange={(e) => setEditMedioPagoId(e.target.value)}
                    className={claseInput}
                  >
                    {medios.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                        {Number(m.interes) !== 0 ? ` (${m.interes > 0 ? '+' : ''}${m.interes}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</label>
                  <select
                    value={editClienteId}
                    onChange={(e) => setEditClienteId(e.target.value)}
                    className={claseInput}
                  >
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.telefono ? ` — ${c.telefono}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Descuento %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0"
                      value={editDescuento}
                      onChange={(e) => setEditDescuento(e.target.value)}
                      className={`${claseInput} pr-9`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <dl className="mb-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(editSubtotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Descuento {editDescuentoPct > 0 ? `(${editDescuentoPct}%)` : ''}</dt>
                  <dd className={`tabular-nums ${editMontoDescuento > 0 ? 'font-semibold text-red-600' : ''}`}>
                    {editMontoDescuento > 0 ? '−' : ''} {fmtPrecio.format(editMontoDescuento)}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Interés {editMedioSeleccionado ? `(${editInteresPct}%)` : ''}</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(editMontoInteres)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{fmtPrecio.format(editTotal)}</dd>
                </div>
              </dl>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarEditar}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarEdicion}
                  disabled={editCarrito.length === 0 || guardandoEdicion || !editMedioPagoId}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEliminarId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Eliminar venta #{modalEliminarId}</h3>
              <button
                type="button"
                onClick={() => setModalEliminarId(null)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="text-sm text-slate-600">
              ¿Estás seguro de que querés eliminar esta venta? <strong>El stock de los productos se restablecerá</strong> y no
              se podrá deshacer.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalEliminarId(null)}
                disabled={procesandoEliminar}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={procesandoEliminar}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {procesandoEliminar ? 'Eliminando...' : 'Eliminar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
