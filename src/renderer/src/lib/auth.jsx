import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setCargando(false)
      return
    }

    apiFetch('/api/auth/me')
      .then((data) => setUsuario(data.username))
      .catch(() => setToken(null))
      .finally(() => setCargando(false))
  }, [])

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      async login(username, password) {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        })
        setToken(data.token)
        setUsuario(data.username)
      },
      async logout() {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' })
        } catch {
          /* ignorar */
        }
        setToken(null)
        setUsuario(null)
      }
    }),
    [usuario, cargando]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
