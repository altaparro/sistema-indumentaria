import { useEffect, useState } from 'react'
import Nav from './Nav'
import { useAuth } from '../lib/auth'
import { apiFetch } from '../lib/api'

export default function Configuracion() {
  return <ContenidoConfiguracion />
}

function ContenidoConfiguracion() {
  const { usuario } = useAuth()

  const [usuarios, setUsuarios] = useState([])
  const [nuevoUsuario, setNuevoUsuario] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [guardandoUsuario, setGuardandoUsuario] = useState(false)
  const [error, setError] = useState('')

  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveNueva2, setClaveNueva2] = useState('')
  const [guardandoClave, setGuardandoClave] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [medios, setMedios] = useState([])
  const [guardandoMedios, setGuardandoMedios] = useState(false)

  async function obtenerUsuarios() {
    try {
      const data = await apiFetch('/api/usuarios')
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function obtenerMedios() {
    try {
      const data = await apiFetch('/api/medios-pago')
      setMedios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    obtenerUsuarios()
    obtenerMedios()
  }, [])

  async function crearUsuario(e) {
    e.preventDefault()
    try {
      setGuardandoUsuario(true)
      setError('')
      await apiFetch('/api/usuarios', {
        method: 'POST',
        body: { username: nuevoUsuario.trim(), password: nuevaClave }
      })
      setNuevoUsuario('')
      setNuevaClave('')
      await obtenerUsuarios()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoUsuario(false)
    }
  }

  async function eliminarUsuario(id) {
    try {
      setError('')
      await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' })
      await obtenerUsuarios()
    } catch (err) {
      setError(err.message)
    }
  }

  async function cambiarClave(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    if (claveNueva !== claveNueva2) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    try {
      setGuardandoClave(true)
      await apiFetch('/api/config/cambiar-password', {
        method: 'POST',
        body: { current_password: claveActual, new_password: claveNueva }
      })
      setClaveActual('')
      setClaveNueva('')
      setClaveNueva2('')
      setMensaje('Contraseña actualizada correctamente')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoClave(false)
    }
  }

  function cambiarInteres(id, valor) {
    setMedios((ms) => ms.map((m) => (m.id === id ? { ...m, interes: valor } : m)))
  }

  async function guardarIntereses(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    try {
      setGuardandoMedios(true)
      const items = medios.map((m) => ({
        id: m.id,
        interes: m.interes === '' ? 0 : Number(m.interes)
      }))
      const data = await apiFetch('/api/medios-pago', { method: 'PUT', body: { items } })
      setMedios(Array.isArray(data) ? data : [])
      setMensaje('Intereses guardados correctamente')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoMedios(false)
    }
  }

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h1>
            <p className="text-sm text-slate-500">
              Gestioná usuarios, contraseña y los intereses de los medios de pago
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">Usuarios</h2>

            <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {usuarios.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    {u.username}
                    {u.username === usuario && (
                      <span className="ml-2 rounded-full bg-crema-100 px-2 py-0.5 text-xs font-medium text-stone-800">
                        vos
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarUsuario(u.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={crearUsuario} className="space-y-3">
              <div>
                <label className={claseLabel}>Nuevo usuario</label>
                <input
                  placeholder="Nombre de usuario"
                  value={nuevoUsuario}
                  onChange={(e) => setNuevoUsuario(e.target.value)}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  className={claseInput}
                />
              </div>
              <button
                type="submit"
                disabled={guardandoUsuario || !nuevoUsuario.trim() || !nuevaClave}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
              >
                {guardandoUsuario ? 'Guardando...' : 'Agregar usuario'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
              Cambiar mi contraseña
            </h2>

            <form onSubmit={cambiarClave} className="space-y-3">
              <div>
                <label className={claseLabel}>Contraseña actual</label>
                <input
                  type="password"
                  value={claveActual}
                  onChange={(e) => setClaveActual(e.target.value)}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Nueva contraseña</label>
                <input
                  type="password"
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Repetir nueva contraseña</label>
                <input
                  type="password"
                  value={claveNueva2}
                  onChange={(e) => setClaveNueva2(e.target.value)}
                  className={claseInput}
                />
              </div>
              <button
                type="submit"
                disabled={guardandoClave || !claveActual || !claveNueva}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
              >
                {guardandoClave ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Datos del sistema</p>
              <p>Los datos se guardan localmente en una base SQLite dentro de esta computadora.</p>
              <p className="mt-1">
                Usuario actual: <span className="font-mono">{usuario}</span>
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
            Intereses de medios de pago
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            El porcentaje se suma al total de la venta al cobrar. Un valor negativo aplica un
            descuento (por ejemplo, -20 en efectivo). Efectivo, transferencia y débito suelen
            quedar en 0%.
          </p>

          {medios.length === 0 ? (
            <p className="text-sm text-slate-500">Cargando medios de pago...</p>
          ) : (
            <form onSubmit={guardarIntereses}>
              <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {medios.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="-100"
                        max="1000"
                        step="0.1"
                        value={m.interes}
                        onChange={(e) => cambiarInteres(m.id, e.target.value)}
                        aria-label={`Interés de ${m.nombre} en porcentaje`}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm text-slate-800 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                disabled={guardandoMedios}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
              >
                {guardandoMedios ? 'Guardando...' : 'Guardar intereses'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
