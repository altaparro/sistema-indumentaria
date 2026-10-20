export const fmtPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS'
})

export function fmtFecha(fecha) {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function fmtFechaCorta(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
