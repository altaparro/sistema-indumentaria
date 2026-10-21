import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from './Nav'
import { fmtPrecio } from '../lib/format'
import { apiFetch } from '../lib/api'

export default function Inicio() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function obtener() {
    try {
      setLoading(true)
      setError('')
      setDatos(await apiFetch('/api/dashboard'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtener()
  }, [])

  const tarjetas = [
    { label: 'Productos', valor: datos?.productos, color: 'text-stone-900' },
    { label: 'Unidades en stock', valor: datos?.unidades, color: 'text-emerald-600' },
    { label: 'Valor inventario', valor: datos ? fmtPrecio.format(datos.valor) : '—', color: 'text-stone-900' },
    { label: 'Ganancia estimada', valor: datos ? fmtPrecio.format(datos.ganancia) : '—', color: 'text-stone-900' },
    { label: 'Stock bajo (≤5)', valor: datos?.bajoStock, color: 'text-amber-600' },
    { label: 'Ventas de hoy', valor: datos?.ventasHoy, color: 'text-emerald-600' },
    { label: 'Facturación de hoy', valor: datos ? fmtPrecio.format(datos.totalHoy) : '—', color: 'text-stone-900' },
    { label: 'Ventas del mes', valor: datos?.ventasMes, color: 'text-emerald-600' },
    { label: 'Facturación del mes', valor: datos ? fmtPrecio.format(datos.totalMes) : '—', color: 'text-stone-900' }
  ]

  return (
    <div className="min-h-screen bg-crema-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Nav />
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo NAZCA"
              className="h-12 w-12 rounded-full object-cover shadow-sm ring-1 ring-crema-300"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inicio</h1>
              <p className="text-sm text-slate-500">Resumen de tu negocio</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {tarjetas.map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</p>
              <p className={`mt-1 truncate text-xl font-bold ${t.color}`}>
                {loading ? '—' : t.valor ?? '—'}
              </p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/ventas"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-crema-300 hover:shadow"
          >
            <h2 className="text-lg font-bold text-slate-900">Nueva venta</h2>
            <p className="mt-1 text-sm text-slate-500">
              Registrá una venta, seleccioná productos y medio de pago.
            </p>
            <span className="mt-4 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
              Ir a ventas
            </span>
          </Link>

          <Link
            to="/productos"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-crema-300 hover:shadow"
          >
            <h2 className="text-lg font-bold text-slate-900">Productos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Administrá el inventario con talle, color, stock y precios.
            </p>
            <span className="mt-4 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
              Ir a productos
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
