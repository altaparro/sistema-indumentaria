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

export default function Proveedores() {
  return <ContenidoProveedores />
}

function ContenidoProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch('/api/proveedores')
      setProveedores(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDatos()
  }, [])

  async function guardarProveedor(e) {
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
        direccion: direccion.trim() || null,
        notas: notas.trim() || null
      }
      await apiFetch('/api/proveedores', {
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

  async function eliminarProveedor(id) {
    try {
      await apiFetch(`/api/proveedores?id=${id}`, { method: 'DELETE' })
      await obtenerDatos()
    } catch (err) {
      setError(err.message)
    }
  }

  function editarProveedor(prov) {
    setEditandoId(prov.id)
    setNombre(prov.nombre || '')
    setTelefono(prov.telefono || '')
    setEmail(prov.email || '')
    setDireccion(prov.direccion || '')
    setNotas(prov.notas || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre('')
    setTelefono('')
    setEmail('')
    setDireccion('')
    setNotas('')
  }

  const proveedoresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return proveedores
    return proveedores.filter((p) =>
      coincideBusqueda(busqueda, [
        p.nombre?.toLowerCase() ?? '',
        p.email?.toLowerCase() ?? '',
        p.telefono?.toLowerCase() ?? ''
      ])
    )
  }, [proveedores, busqueda])

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Proveedores</h1>
            <p className="text-sm text-slate-500">Administrá tus proveedores</p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Proveedores</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{proveedores.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Con email</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {proveedores.filter((p) => p.email).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Con teléfono</p>
            <p className="mt-1 text-xl font-bold text-stone-900">
              {proveedores.filter((p) => p.telefono).length}
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
              placeholder="Buscar por nombre, email o teléfono..."
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

        <form onSubmit={guardarProveedor} className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            {editandoId ? `Editando proveedor #${editandoId}` : 'Nuevo proveedor'}
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
                placeholder="Ej: Indumentaria López"
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
                placeholder="Ej: contacto@lopez.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={claseInput}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={claseLabel}>Dirección</label>
              <input
                placeholder="Ej: Av. Corrientes 1234, CABA"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={claseInput}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={claseLabel}>Notas</label>
              <input
                placeholder="Información adicional sobre el proveedor"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
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
                <th className="px-4 py-3">Teléfono</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 lg:table-cell">Dirección</th>
                <th className="hidden px-4 py-3 xl:table-cell">Notas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="font-medium text-slate-600">
                      {proveedores.length === 0
                        ? 'No hay proveedores cargados.'
                        : 'No se encontraron proveedores con esa búsqueda.'}
                    </p>
                    {proveedores.length > 0 && (
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
                proveedoresFiltrados.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{p.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{p.telefono || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{p.email || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{p.direccion || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">{p.notas || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editarProveedor(p)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-crema-300 hover:bg-crema-50 hover:text-stone-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarProveedor(p.id)}
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
          {proveedoresFiltrados.length} de {proveedores.length} proveedores
        </footer>
      </div>
    </div>
  )
}
