import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const paginas = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/productos', label: 'Productos' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/contaduria', label: 'Contaduría' },
  { to: '/configuracion', label: 'Configuración' }
]

export default function Nav() {
  const { usuario, logout } = useAuth()

  return (
    <nav className="mb-8 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <NavLink
        to="/"
        end
        aria-label="Ir al inicio"
        className="flex items-center rounded-lg px-2 py-1 hover:bg-slate-100"
      >
        <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-full object-cover ring-1 ring-crema-300" />
      </NavLink>

      {paginas.map((p) => (
        <NavLink
          key={p.to}
          to={p.to}
          end={p.end}
          className={({ isActive }) =>
            `rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              isActive ? 'bg-stone-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          {p.label}
        </NavLink>
      ))}

      <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-2">
        <span className="hidden max-w-40 truncate text-xs text-slate-500 sm:block">
          {usuario}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Salir
        </button>
      </div>
    </nav>
  )
}
