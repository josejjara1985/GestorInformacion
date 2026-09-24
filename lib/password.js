'use strict'

const ESPECIALES = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const RE_ESPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/
const SECUENCIAS = [
  '012345', '123456', '234567', '345678', '456789', '567890', '678901',
  '987654', '876543', '765432', '654321', '543210', '098765',
  'qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty', 'password', 'contrasena',
  'abcdef', 'fedcba', 'admin12', 'pass12', 'qazwsx', '1q2w3e'
]
const FILAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'abcdefghijklmnopqrstuvwxyz', '0123456789']

function extraerPersonales(datos) {
  const out = []
  const seen = new Set()
  function add(v) {
    const s = String(v || '').trim().toLowerCase()
    if (!s) return
    const partes = s.split(/[\s@._-]+/).filter((p) => p.length >= 3)
    for (const p of partes.concat([s.replace(/\s+/g, '')])) {
      if (p.length < 3) continue
      if (seen.has(p)) continue
      seen.add(p)
      out.push(p)
    }
  }
  const d = datos || {}
  add(d.username)
  add(d.nombre)
  add(d.nombre_completo)
  return out
}

function tieneSecuencia(password) {
  const p = String(password || '').toLowerCase()
  if (SECUENCIAS.some((s) => p.includes(s))) return true
  for (const fila of FILAS) {
    const rev = fila.split('').reverse().join('')
    for (let n = 4; n <= 6; n++) {
      for (let i = 0; i <= fila.length - n; i++) {
        if (p.includes(fila.slice(i, i + n)) || p.includes(rev.slice(i, i + n))) return true
      }
    }
  }
  return false
}

function requisitosDe(password, datos) {
  const p = String(password == null ? '' : password)
  const personales = extraerPersonales(datos)
  const lower = p.toLowerCase()
  return {
    longitud: p.length >= 6,
    mayuscula: /[A-Z]/.test(p),
    minuscula: /[a-z]/.test(p),
    numero: /[0-9]/.test(p),
    especial: RE_ESPECIAL.test(p),
    sinEspacios: p.length > 0 && !/\s/.test(p),
    sinSecuencia: p.length > 0 && !tieneSecuencia(p),
    sinPersonales: p.length > 0 && !personales.some((d) => d && lower.includes(d))
  }
}

function validarClaveSegura(password, datos) {
  const r = requisitosDe(password, datos)
  const errores = []
  if (!r.longitud) errores.push('La clave debe tener al menos 6 caracteres.')
  if (!r.sinEspacios) errores.push('No se permiten espacios.')
  if (!r.mayuscula) errores.push('Debe incluir al menos 1 letra mayúscula (A-Z).')
  if (!r.minuscula) errores.push('Debe incluir al menos 1 letra minúscula (a-z).')
  if (!r.numero) errores.push('Debe incluir al menos 1 número (0-9).')
  if (!r.especial) errores.push('Debe incluir al menos 1 carácter especial (' + ESPECIALES + ').')
  if (!r.sinSecuencia) errores.push('No se permiten secuencias (123456, qwerty) ni claves obvias.')
  if (!r.sinPersonales) errores.push('No se permiten datos personales en la clave.')
  return { ok: errores.length === 0, errores, requisitos: r }
}

function mensajeError(resultado) {
  return (resultado && resultado.errores && resultado.errores[0]) || 'La clave no cumple la especificación de clave segura.'
}

module.exports = {
  ESPECIALES,
  requisitosDe,
  validarClaveSegura,
  extraerPersonales,
  mensajeError
}
