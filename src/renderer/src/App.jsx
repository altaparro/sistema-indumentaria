import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { setBaseUrl } from './lib/api'
import Auth from './components/Auth'
import Inicio from './components/Inicio'
import Productos from './components/Productos'
import Ventas from './components/Ventas'
import Clientes from './components/Clientes'
import Proveedores from './components/Proveedores'
import Contaduria from './components/Contaduria'
import Configuracion from './components/Configuracion'

function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-crema-100">
      <p className="text-sm font-medium text-slate-500">Cargando...</p>
    </div>
  )
}

function Rutas() {
  const { usuario, cargando } = useAuth()

  if (cargando) return <Cargando />

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={usuario ? <Inicio /> : <Navigate to="/login" replace />} />
      <Route path="/productos" element={usuario ? <Productos /> : <Navigate to="/login" replace />} />
      <Route path="/ventas" element={usuario ? <Ventas /> : <Navigate to="/login" replace />} />
      <Route path="/clientes" element={usuario ? <Clientes /> : <Navigate to="/login" replace />} />
      <Route path="/proveedores" element={usuario ? <Proveedores /> : <Navigate to="/login" replace />} />
      <Route path="/contaduria" element={usuario ? <Contaduria /> : <Navigate to="/login" replace />} />
      <Route path="/configuracion" element={usuario ? <Configuracion /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  if (window.indumentaria?.getApiBaseUrl) {
    setBaseUrl(window.indumentaria.getApiBaseUrl())
  }

  return (
    <AuthProvider>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </AuthProvider>
  )
}
