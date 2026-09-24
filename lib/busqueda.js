const { parseFecha } = require('./dates')

const PARAMS_RESERVADOS = new Set([
  'page', 'perpage', 'q', 'desde', 'hasta', 'fecha_campo', 'campo_fecha',
  'todos', 'tipo', 'modulo', 'limite', 'movimiento', 'descargar'
])

function normTexto(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function esColumnaFecha(col) {
  if (!col) return false
  if (col.tipo === 'fecha') return true
  const n = String(col.nombre || '')
  if (/^(sentido_del_fallo|observaciones_sentencia|n_numero_sentencia)/.test(n)) return false
  return /^(fecha_|admision$|sentencia$|archivo$|cumplimiento$|devolucion|pruebas$|fallo$|lectura_)/.test(n)
}

function aliasFechaCampo(conf, fechaCampo) {
  const requested = String(fechaCampo || '').trim()
  if (!requested) return ''
  const nombres = new Set((conf.columnas || []).map((c) => c.nombre))
  if (nombres.has(requested)) return requested
  if (requested === 'fecha_ingreso' && nombres.has('fecha_de_ingreso')) return 'fecha_de_ingreso'
  if (requested === 'fecha_de_ingreso' && nombres.has('fecha_ingreso')) return 'fecha_ingreso'
  return requested
}

function campoFechaEfectivo(conf, fechaCampo) {
  const requested = aliasFechaCampo(conf, fechaCampo)
  const cols = columnasFecha(conf)
  if (requested && cols.some((c) => c.nombre === requested)) return requested
  if (requested && !(conf.columnas || []).some((c) => c.nombre === requested)) {
    return conf.fecha_entrada || (cols[0] && cols[0].nombre) || ''
  }
  return requested || conf.fecha_entrada || (cols[0] && cols[0].nombre) || ''
}

function columnasFecha(conf) {
  return (conf.columnas || []).filter(esColumnaFecha)
}

function normalizarRango(desde, hasta) {
  const d = parseFecha(desde)
  const h = parseFecha(hasta)
  if (d && !h) return { desde: d, hasta: d }
  if (!d && h) return { desde: h, hasta: h }
  if (d && h && d > h) return { desde: h, hasta: d }
  return { desde: d || '', hasta: h || '' }
}

function fechaEnRango(valor, desde, hasta) {
  const f = parseFecha(valor)
  if (!f) return false
  if (desde && f < desde) return false
  if (hasta && f > hasta) return false
  return true
}

function valorFechaDeFila(row, campo, conf) {
  if (campo) return row[campo]
  if (conf && conf.fecha_entrada) return row[conf.fecha_entrada]
  return null
}

function coincidirCampo(valor, criterio, col) {
  if (criterio == null || String(criterio).trim() === '') return true
  if (col && esColumnaFecha(col)) {
    const rango = normalizarRango(criterio, criterio)
    return fechaEnRango(valor, rango.desde, rango.hasta)
  }
  const v = normTexto(valor)
  const c = normTexto(criterio)
  if (!c) return true
  if (!v) return false
  const compactV = v.replace(/[\s.\-_/]/g, '')
  const compactC = c.replace(/[\s.\-_/]/g, '')
  if (col && /radicado|codigo|cedula|c_c|no$|numero|identific/.test(col.nombre || '')) {
    return compactV === compactC || compactV.includes(compactC)
  }
  return v.includes(c)
}

function palabrasClave(q) {
  return normTexto(q)
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean)
}

function coincidirPalabras(row, palabras, conf) {
  if (!palabras.length) return true
  const colsTexto = (conf.columnas || []).filter((c) => !esColumnaFecha(c))
  const blob = colsTexto.map((c) => normTexto(row[c.nombre])).join(' ')
  return palabras.every((p) => blob.includes(p))
}

function extraerFiltros(query, conf) {
  const cols = conf.columnas || []
  const byName = {}
  for (const c of cols) byName[c.nombre] = c
  const filtros = []
  for (const key of Object.keys(query || {})) {
    if (PARAMS_RESERVADOS.has(String(key).toLowerCase())) continue
    if (!byName[key]) continue
    const valor = String(query[key] == null ? '' : query[key]).trim()
    if (!valor) continue
    filtros.push({ campo: key, etiqueta: byName[key].etiqueta, valor, col: byName[key] })
  }
  return filtros
}

function filtrarRegistros(rows, conf, opts) {
  const { desde: d0, hasta: h0, fechaCampo, q, filtros } = opts
  const rango = normalizarRango(d0, h0)
  const campoFecha = campoFechaEfectivo(conf, fechaCampo)
  const colFecha = (conf.columnas || []).find((c) => c.nombre === campoFecha)
  const palabras = palabrasClave(q)
  const criterios = []
  if (rango.desde || rango.hasta) {
    criterios.push({
      tipo: 'fecha',
      campo: campoFecha,
      etiqueta: (colFecha && colFecha.etiqueta) || campoFecha || 'Fecha',
      desde: rango.desde,
      hasta: rango.hasta
    })
  }
  if (palabras.length) criterios.push({ tipo: 'palabras', valor: palabras.join(' ') })
  for (const f of filtros || []) criterios.push({ tipo: 'campo', campo: f.campo, etiqueta: f.etiqueta, valor: f.valor })

  const resultados = []
  for (const row of rows) {
    const motivos = []
    let ok = true

    if (rango.desde || rango.hasta) {
      const valorFecha = valorFechaDeFila(row, campoFecha, conf)
      if (!fechaEnRango(valorFecha, rango.desde, rango.hasta)) {
        ok = false
      } else {
        motivos.push({
          tipo: 'fecha',
          campo: campoFecha,
          etiqueta: (colFecha && colFecha.etiqueta) || 'Fecha',
          valor: parseFecha(valorFecha),
          detalle: 'Fecha ' + parseFecha(valorFecha) + ' dentro de ' + (rango.desde || '…') + ' a ' + (rango.hasta || '…')
        })
      }
    }

    if (ok && palabras.length) {
      if (!coincidirPalabras(row, palabras, conf)) ok = false
      else motivos.push({ tipo: 'palabras', valor: palabras.join(' '), detalle: 'Coincide con las palabras clave' })
    }

    if (ok) {
      for (const f of filtros || []) {
        if (!coincidirCampo(row[f.campo], f.valor, f.col)) {
          ok = false
          break
        }
        motivos.push({
          tipo: 'campo',
          campo: f.campo,
          etiqueta: f.etiqueta,
          valor: row[f.campo] == null ? '' : String(row[f.campo]),
          detalle: (f.etiqueta || f.campo) + ' coincide con «' + f.valor + '»'
        })
      }
    }

    if (ok) resultados.push({ row, motivos })
  }

  return { criterios, rango, campoFecha, resultados }
}

module.exports = {
  PARAMS_RESERVADOS,
  normTexto,
  esColumnaFecha,
  columnasFecha,
  campoFechaEfectivo,
  normalizarRango,
  fechaEnRango,
  coincidirCampo,
  extraerFiltros,
  filtrarRegistros
}
