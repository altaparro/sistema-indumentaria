import { useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { coincideBusqueda } from '../lib/busqueda'
import { apiFetch } from '../lib/api'

function IconoBuscar() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

export default function Clientes() {
  return <ContenidoClientes />
}

function ContenidoClientes() {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [documentoTipo, setDocumentoTipo] = useState('DNI')
  const [documentoNumero, setDocumentoNumero] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch('/api/clientes')
      setClientes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDatos()
  }, [])

  async function guardarCliente(e) {
    e.preventDefault()
    try {
      setGuardando(true)
      setError('')
      if (!nombre.trim()) {
        setError('El nombre es obligatorio')
        return
      }
      const body = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        documento_tipo: documentoTipo || null,
        documento_numero: documentoNumero.trim() || null
      }
      await apiFetch('/api/clientes', {
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

  async function eliminarCliente(id) {
    try {
      await apiFetch(`/api/clientes?id=${id}`, { method: 'DELETE' })
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    }
  }

  function editarCliente(cl) {
    setEditandoId(cl.id)
    setNombre(cl.nombre || '')
    setTelefono(cl.telefono || '')
    setEmail(cl.email || '')
    setDocumentoTipo(cl.documento_tipo || 'DNI')
    setDocumentoNumero(cl.documento_numero || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre('')
    setTelefono('')
    setEmail('')
    setDocumentoTipo('DNI')
    setDocumentoNumero('')
  }

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    return clientes.filter((c) =>
      coincideBusqueda(busqueda, [
        c.nombre?.toLowerCase() ?? '',
        c.email?.toLowerCase() ?? '',
        c.telefono?.toLowerCase() ?? '',
        c.documento_numero?.toLowerCase() ?? ''
      ])
    )
  }, [clientes, busqueda])

  const claseInput =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200'
  const claseLabel =
    'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <div className="min-h-screen bg-crema-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Nav />
        <header className="mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
            <p className="text-sm text-slate-500">Administra tus clientes</p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Clientes</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{clientes.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Con email</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {clientes.filter((c) => c.email).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Con teléfono</p>
            <p className="mt-1 text-xl font-bold text-stone-900">
              {clientes.filter((c) => c.telefono).length}
            </p>
          </div>
        </section>

        <div className="mb-6">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <IconoBuscar />
            </span>
            <input
              type="search"
              placeholder="Buscar por nombre, teléfono, email o documento..."
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
        </div>

        <form onSubmit={guardarCliente} className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            {editandoId ? `Editando cliente #${editandoId}` : 'Nuevo cliente'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={claseLabel}>Nombre *</label>
              <input
                placeholder="Ej: Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Teléfono</label>
              <input
                placeholder="Ej: 11-1234-5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Email</label>
              <input
                type="email"
                placeholder="Ej: juan@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={claseInput}
              />
            </div>

            <div>
              <label className={claseLabel}>Tipo de documento</label>
              <select
                value={documentoTipo}
                onChange={(e) => setDocumentoTipo(e.target.value)}
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
              <label className={claseLabel}>N° de documento</label>
              <input
                inputMode="numeric"
                placeholder="Documento"
                value={documentoNumero}
                onChange={(e) => setDocumentoNumero(e.target.value)}
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
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="font-medium text-slate-600">
                      {clientes.length === 0
                        ? 'No hay clientes cargados.'
                        : 'No se encontraron clientes con esa búsqueda.'}
                    </p>
                    {clientes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBusqueda('')}
                        className="mt-2 text-sm font-medium text-stone-900 hover:text-stone-700"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-700">
                        {c.documento_numero ? `${c.documento_tipo || 'DNI'} ${c.documento_numero}` : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.telefono || '--'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{c.email || '--'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editarCliente(c)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-crema-300 hover:bg-crema-50 hover:text-stone-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarCliente(c.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          {clientesFiltrados.length} de {clientes.length} clientes
        </footer>
      </div>
    </div>
  )
}
