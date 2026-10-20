const TOKEN_KEY = 'indumentaria_token'

let baseUrl = ''

export function setBaseUrl(url) {
  baseUrl = url || ''
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function apiUrl(ruta) {
  if (!ruta) return ''
  if (/^(https?:|blob:|data:)/.test(ruta)) return ruta
  return `${baseUrl}${ruta}`
}

async function manejarRespuesta(res) {
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`)
    error.status = res.status
    throw error
  }

  return data
}

export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken()

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  return manejarRespuesta(res)
}

export async function apiUpload(path, file) {
  const token = getToken()

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: file
  })

  return manejarRespuesta(res)
}
