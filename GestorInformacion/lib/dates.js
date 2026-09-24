function pad(n) {
  return String(n).padStart(2, '0')
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseFecha(valor) {
  if (valor == null) return null
  const s = String(valor).trim()
  if (!s) return null
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (dmy) return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`
  const n = Number(s.replace(',', '.'))
  if (Number.isFinite(n) && n > 30000 && n < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30))
    d.setUTCDate(d.getUTCDate() + Math.floor(n))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  return null
}

function extraerFechaEnTexto(valor) {
  const todas = extraerFechasEnTexto(valor)
  return todas[0] || null
}

function extraerFechasEnTexto(valor) {
  if (valor == null) return []
  const s = String(valor)
  const out = []
  const seen = new Set()
  const re = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})|(\d{4})-(\d{2})-(\d{2})/g
  let m
  while ((m = re.exec(s))) {
    const iso = m[4] ? `${m[4]}-${m[5]}-${m[6]}` : `${m[3]}-${pad(m[2])}-${pad(m[1])}`
    if (!seen.has(iso)) {
      seen.add(iso)
      out.push(iso)
    }
  }
  return out
}

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

function fechaLarga(valor) {
  const iso = parseFecha(valor)
  if (!iso) return String(valor == null ? '' : valor).trim()
  const [y, m, d] = iso.split('-').map(Number)
  const dia = DIAS_ES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${dia}, ${d} de ${MESES_ES[m - 1]} de ${y}`
}

function enRango(fecha, desde, hasta) {
  const f = parseFecha(fecha)
  if (!f) return false
  if (desde && f < desde) return false
  if (hasta && f > hasta) return false
  return true
}

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function inicioMes(iso) {
  return iso.slice(0, 8) + '01'
}

function finMes(iso) {
  const [y, m] = iso.split('-').map(Number)
  const dt = new Date(y, m, 0)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

module.exports = {
  pad, hoyISO, parseFecha, extraerFechaEnTexto, extraerFechasEnTexto, fechaLarga, enRango, addDays, inicioMes, finMes,
  DIAS_ES, MESES_ES
}
