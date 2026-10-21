import { useEffect, useMemo, useState } from 'react'
import Nav from './Nav'
import { fmtPrecio } from '../lib/format'
import { apiFetch } from '../lib/api'

const ETIQUETAS = {
  semana: 'Semana',
  mes: 'Mes',
  anio: 'Año'
}

function inicioSemana(fecha) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  const dia = d.getDay() || 7
  d.setDate(d.getDate() - dia + 1)
  return d
}

function calculoRango(periodo, offset) {
  const ahora = new Date()
  let desde, hasta

  if (periodo === 'semana') {
    desde = inicioSemana(ahora)
    desde.setDate(desde.getDate() + offset * 7)
    hasta = new Date(desde)
    hasta.setDate(hasta.getDate() + 6)
    hasta.setHours(23, 59, 59, 999)
  } else if (periodo === 'mes') {
    desde = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1)
    hasta = new Date(ahora.getFullYear(), ahora.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  } else {
    desde = new Date(ahora.getFullYear() + offset, 0, 1)
    hasta = new Date(ahora.getFullYear() + offset, 11, 31, 23, 59, 59, 999)
  }

  return { desde, hasta, etiqueta: etiquetaPeriodo(periodo, desde, hasta) }
}

function etiquetaPeriodo(periodo, desde, hasta) {
  if (periodo === 'semana') {
    const desdeStr = desde.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    const hastaStr = hasta.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    return `${desdeStr} – ${hastaStr}`
  }
  if (periodo === 'mes') {
    return desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }
  return String(desde.getFullYear())
}

export default function Contaduria() {
  return <ContenidoContaduria />
}

function ContenidoContaduria() {
  const [periodo, setPeriodo] = useState('semana')
  const [offset, setOffset] = useState(0)
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rango = useMemo(() => calculoRango(periodo, offset), [periodo, offset])

  async function obtenerDatos() {
    try {
      setLoading(true)
      setError('')
      const desde = rango.desde.toISOString()
      const hasta = rango.hasta.toISOString()
      const data = await apiFetch(
        `/api/reportes?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
      )
      setVentas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerDatos()
  }, [rango.desde, rango.hasta, rango.etiqueta])

  const stats = useMemo(() => {
    let facturacion = 0
    let subtotal = 0
    let interes = 0
    let descuento = 0
    let ganancia = 0
    let unidades = 0

    ventas.forEach((v) => {
      const descMonto = ((Number(v.total_base) || 0) * (Number(v.descuento_pct) || 0)) / 100
      facturacion += Number(v.total || 0)
      subtotal += Number(v.total_base || 0)
      interes += Number(v.total || 0) - Number(v.total_base || 0) + descMonto
      descuento += descMonto
      ;(v.detalle ?? []).forEach((d) => {
        unidades += Number(d.cantidad || 0)
        const costo = (Number(d.costo_unitario) || 0) * Number(d.cantidad || 0)
        ganancia += Number(d.subtotal || 0) - costo
      })
      ganancia -= descMonto
    })

    const margen = subtotal > 0 ? (ganancia / subtotal) * 100 : 0

    return { ventas: ventas.length, unidades, facturacion, subtotal, interes, descuento, ganancia, margen }
  }, [ventas])

  return (
    <div className="min-h-screen bg-crema-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Nav />
        <header className="mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contaduría</h1>
            <p className="text-sm text-slate-500">Ventas, facturación y ganancia del período seleccionado</p>
          </div>
        </header>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Período
              </label>
              <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {Object.entries(ETIQUETAS).map(([clave, etiqueta]) => (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => {
                      setPeriodo(clave)
                      setOffset(0)
                    }}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      periodo === clave
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              aria-label="Período anterior"
            >
              ← Anterior
            </button>

            <div className="min-w-40 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm">
              <p className="text-sm font-bold capitalize text-slate-800">{rango.etiqueta}</p>
              {offset !== 0 && (
                <button
                  type="button"
                  onClick={() => setOffset(0)}
                  className="text-xs font-medium text-stone-900 hover:text-stone-700"
                >
                  Volver al actual
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              disabled={offset >= 0}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              aria-label="Período siguiente"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ventas totales</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-stone-900">
              {loading ? '—' : stats.ventas}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {loading ? '' : `${stats.unidades} unidades vendidas`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Facturación total</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">
              {loading ? '—' : fmtPrecio.format(stats.facturacion)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {loading
                ? ''
                : `${fmtPrecio.format(stats.subtotal)} base${stats.descuento > 0 ? ` − ${fmtPrecio.format(stats.descuento)} descuento` : ''} ${stats.interes < 0 ? '−' : '+'} ${fmtPrecio.format(Math.abs(stats.interes))} interés`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ganancia neta</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-stone-900">
              {loading ? '—' : fmtPrecio.format(stats.ganancia)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {loading ? '' : `Margen ${stats.margen.toFixed(1)}%`}
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">
            Ventas del período ({ventas.length})
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">Ganancia</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center font-medium text-slate-500">
                      No hay ventas en este período.
                    </td>
                  </tr>
                ) : (
                  ventas.map((v) => {
                    const ganancia = (v.detalle ?? []).reduce(
                      (acc, d) => acc + (Number(d.subtotal || 0) - (Number(d.costo_unitario) || 0) * Number(d.cantidad || 0)),
                      0
                    )
                    const fecha = new Date(v.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short'
                    })

                    return (
                      <tr key={v.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          #{v.id}
                          <span className="ml-2 text-xs text-slate-400">{fecha}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                            {v.medio?.nombre ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {fmtPrecio.format(v.total_base || 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                          {fmtPrecio.format(ganancia)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                          {fmtPrecio.format(v.total || 0)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
