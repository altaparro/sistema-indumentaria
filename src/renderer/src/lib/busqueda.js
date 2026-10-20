export function coincideBusqueda(query, campos) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return true

  return tokens.every((token) => campos.some((campo) => campo.includes(token)))
}
