import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Auth() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-crema-100 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <img
              src="/logo.png"
              alt="Logo NAZCA"
              className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-md ring-4 ring-crema-200"
            />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              NAZCA
            </h1>
            <p className="mt-1 text-sm text-slate-500">Ingresá para continuar</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Usuario
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-crema-200"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Usuario inicial: <span className="font-mono">admin</span> /{' '}
            <span className="font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
