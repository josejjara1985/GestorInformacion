const { parseFecha } = require('./dates')

const ORDEN_EXCEL = {
  procesos: [
    'fecha_ingreso', 'no_acta_reparto', 'ingreso', 'fecha_de_los_hechos', 'fecha_imputacion',
    'fecha_prescripcion', 'forma_de_ingreso', 'reparto_secretaria_audiencia', 'codigo_interno',
    'radicado', 'no', 'matriz', 'delito_estadistica', 'delitos_en_concurso', 'procesado_s', 'c_c',
    'detenido', 'carcel', 'direccion_detenido', 'procesados_detalle', 'celular', 'no_hombres',
    'no_mujeres', 'sexo', 'fiscalia', 'celular_fiscal', 'correo_fiscal',
    'direccion_fiscal', 'defensor', 'cedula_defensor', 'tarjeta_defensor',
    'celular_defensor', 'correo_defensor', 'direccion_defensor',
    'victima', 'celular_victima', 'correo_victima', 'direccion_victima',
    'rep_victima', 'celular_rep_victima', 'correo_rep_victima', 'direccion_rep_victima',
    'defensoria_min_publico', 'celular_min_publico', 'correo_min_publico', 'direccion_min_publico',
    'caja', 'no_carpetas', 'no_folios', 'no_cd',
    'audiencia', 'fecha_audiencia', 'hora', 'reparto_secretaria_audiencia_2', 'no_orden_verbal',
    'fecha_orden_verbal', 'observacion_orden_verbal', 'observacion', 'juzgado', 'fecha_acusacion',
    'fecha_preparatoria', 'auto_de_pruebas', 'fecha_juicio', 'sentido_del_fallo', 'fecha_preacuerdo',
    'fecha_individualizacion_447', 'fecha_preclusion', 'n_numero_sentencia_o_auto', 'pena_meses',
    'sancion_multa_smlv', 'pago_perjuicios_victima', 'fecha_ejecutoria_sentencia',
    'fecha_de_sentencia_auto', 'observaciones_sentencia',
    'a_otros_despachos_por_impedimentos_recusacion_competencia', 'otras_salidas', 'fecha_remision',
    'confirma', 'modifica', 'revoca', 'devolucion', 'no_acta_de_obligaciones',
    'no_boleta_domiciliaria', 'no_boleta_encarcela', 'no_boleta_de_libertad', 'no_orden_de_captura',
    'no_despacho_comisorio_remision_buchely', 'no_oficio_remite_cobro_coac',
    'fecha_envio_cobro_coactivo', 'fecha_cumplimiento', 'fecha_envio_centro_de_servicios',
    'n_numero_oficio', 'fecha_repato_archivo', 'encargado', 'radicado_interno', 'pena_cumplida',
    'fecha_de_archivo', 'envio_centro_de_servicios', 'no_oficio', 'no_carpetas_2', 'no_folios_2',
    'no_cd_2', 'observaciones', 'infromes_audiencias'
  ],
  tutelas: [
    'responable', 'fecha_ingreso', 'forma_de_ingreso', 'no_acta_reparto_centro_servicios',
    'radicado_interno_consecutivo_juzgado', 'accionante', 'accionado', 'derecho_estadistica', 'derecho_vulnerado',
    'tutela', 'incidente', 'habeas_corpus', 'admision', 'inadmision', 'pruebas', 'sentencia',
    'numero_s', 'tutela_2', 'improcedente', 'abstiene', 'niega_o_no_concede', 'hecho_superado',
    'sanciona', 'se_va_a_impugnacion_o_consulta', 'impugnacion_o_consulta', 'confirma',
    'revoca_o_nulidad', 'modifica', 'corte', 'archivo', 'otras_salidas', 'observaciones',
    'presentacion_proyecto'
  ],
  apelaciones: [
    'sustanciacion', 'fecha_ingreso', 'forma_de_ingreso', 'codigo_interno', 'spoa', 'no', 'matriz',
    'delito_estadistica', 'procesado_s', 'c_c', 'detenido', 'carcel', 'direccion_detenido',
    'celular', 'no_hombres', 'no_mujeres', 'juzgado_ejecucion_de_penas', 'defensor',
    'direccion_defensor', 'auto_apelado', 'no_carpetas', 'no_folios', 'no_cd', 'decision',
    'fecha', 'cumplimiento', 'devolucion_expediente'
  ],
  ley600: [
    'radicado', 'fecha_de_ingreso', 'procesado_s', 'direccion_de_notificacion_procesado',
    'fiscalia', 'direccion_notificacion_fiscal', 'delito_y_articulo', 'defensor',
    'direccion_de_notificacion_defensa', 'inicio_noticia_criminis', 'apertura_de_instruccion',
    'definicion_situacion_juridica', 'cierre_de_instruccion', 'alegatos_quienes_presentaron',
    'resolucion_de_acusacion', 'notificacion_como_se_hizo', 'fecha_ejecutoria_res_acusacion',
    'fecha_ingreso_al_juzgado', 'traslado_art_400', 'fecha_aud_preparatoria',
    'fecha_audiencia_publica', 'sentencia', 'ultima_actuacion', 'cuadernos', 'anotaciones',
    'observacion', 'juzgado', 'audiencia', 'fecha_audiencia', 'hora', 'auto_sustanciacion',
    'fecha_orden_verbal', 'reponsable_expediente_y_audiencias'
  ],
  disciplinarios: [
    'fecha_ingreso', 'forma_de_ingreso', 'radicado_interno_consecutivo_juzgado',
    'quejoso_compulsa', 'disciplinable', 'indagacion_preliminar_art_150',
    'investigacion_disciplinaria_art_152_al_160a', 'pliego_de_cargos_art_161_al_163',
    'fallo', 'archivo', 'observaciones'
  ],
  fiscales: ['fiscal', 'direccion', 'asistente', 'contacto'],
  defensores: ['defensa', 'direccion', 'no_cedula', 'no_tarjeta_profesional'],
  procuradores: [
    'procuraduria', 'procurador', 'correo_institucional', 'direccion', 'celular',
    'telefono_oficina', 'sustanciador', 'celular_sustanciador',
    'telefono_oficina_sustanciador', 'correo_sustanciador'
  ],
  directorio_victimas: ['victima', 'notificacion'],
  inpec: [
    'nombre_del_resposable', 'oficina', 'ciudad', 'direccion', 'telefono',
    'correo_electronico_virtuales'
  ],
  rama_judicial: ['nombre', 'lugar', 'direccion', 'telefono', 'fax', 'correo_electronico']
}

const ETIQUETAS_EXCEL = {
  delito_estadistica: 'DELITO ESTADISTICA',
  radicado: 'RADICADO',
  no: 'No.',
  spoa: 'RADICADO'
}

const COLS_AUDIENCIA_REPORTE = [
  { nombre: 'fecha_audiencia', etiqueta: 'FECHA AUDIENCIA', tipo: 'fecha' },
  { nombre: 'hora', etiqueta: 'HORA AUDIENCIA', tipo: 'texto' },
  { nombre: 'audiencia', etiqueta: 'TIPO AUDIENCIA', tipo: 'texto' }
]

function columnasAudienciaFijas() {
  return COLS_AUDIENCIA_REPORTE.map((c) => ({ ...c }))
}

function columnasConsultaVista(conf) {
  const fijas = columnasAudienciaFijas()
  const usados = new Set(fijas.map((c) => c.nombre))
  const visibles = (conf.visibles || [])
    .map((n) => (conf.columnas || []).find((c) => c.nombre === n))
    .filter(Boolean)
    .filter((c) => !usados.has(c.nombre))
    .map((c) => ({ nombre: c.nombre, etiqueta: c.etiqueta, tipo: c.tipo }))
  return [...fijas, ...visibles]
}

function columnasConsultaExport(conf, tabla) {
  const fijas = columnasAudienciaFijas()
  const usados = new Set(fijas.map((c) => c.nombre))
  const resto = columnasExport(conf, tabla).filter((c) => !usados.has(c.nombre))
  return [...fijas, ...resto]
}

function aplicarAudiencia(row, evento) {
  const o = row && typeof row === 'object' ? { ...row } : {}
  const fechaFila = parseFecha(o.fecha_audiencia) || parseFecha(o.fecha_audiencia_publica)
  const horaFila = String(o.hora || '').trim()
  const tipoFila = String(o.audiencia || o.tipo_audiencia || '').trim()
  const fechaEv = evento ? parseFecha(evento.fecha) : null
  const horaEv = evento ? String(evento.hora || '').trim() : ''
  const tipoEv = evento ? String(evento.tipo_audiencia || evento.titulo || '').trim() : ''
  o.fecha_audiencia = fechaFila || fechaEv || ''
  o.hora = horaFila || horaEv || ''
  o.audiencia = tipoFila || tipoEv || ''
  return o
}

function columnasExport(conf, tabla) {
  const byName = {}
  for (const c of conf.columnas) byName[c.nombre] = c
  const orden = ORDEN_EXCEL[tabla] || conf.columnas.map((c) => c.nombre)
  const used = new Set()
  const out = []
  for (const n of orden) {
    if (!byName[n] || used.has(n)) continue
    used.add(n)
    const c = byName[n]
    out.push({
      nombre: c.nombre,
      etiqueta: ETIQUETAS_EXCEL[c.nombre] || c.etiqueta,
      tipo: c.tipo
    })
  }
  if (!ORDEN_EXCEL[tabla]) {
    for (const c of conf.columnas) {
      if (used.has(c.nombre)) continue
      out.push({ nombre: c.nombre, etiqueta: c.etiqueta, tipo: c.tipo })
    }
  }
  return out
}

function esCampoFecha(col) {
  if (!col) return false
  if (col.tipo === 'fecha') return true
  const n = String(col.nombre || '')
  if (/^(sentido_del_fallo|observaciones_sentencia|n_numero_sentencia)/.test(n)) return false
  return /^(fecha_|admision$|sentencia$|archivo$|cumplimiento$|devolucion|pruebas$|fallo$|lectura_)/.test(n)
}

function formatFechaCsv(valor) {
  const iso = parseFecha(valor)
  if (!iso) return valor == null ? '' : String(valor)
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function textoProcesados(valor) {
  const raw = String(valor == null ? '' : valor).trim()
  if (!raw) return ''
  let filas
  try { filas = JSON.parse(raw) } catch (e) { return raw }
  if (!Array.isArray(filas)) return raw
  return filas
    .filter((f) => f && (f.nombre || f.c_c || f.detenido || f.carcel || f.direccion))
    .map((f, i) => {
      const datos = [f.c_c, f.detenido ? 'Detenido: ' + f.detenido : '', f.carcel, f.direccion]
        .map((x) => String(x == null ? '' : x).trim())
        .filter(Boolean)
      return (i + 1) + '. ' + String(f.nombre || '').trim() + (datos.length ? ' (' + datos.join(' - ') + ')' : '')
    })
    .join('\n')
}

function celdaCsv(valor, col) {
  let s = valor == null ? '' : String(valor)
  if (col && col.tipo === 'procesados') {
    s = textoProcesados(s)
  }
  if (esCampoFecha(col)) {
    const f = parseFecha(s)
    if (f) s = formatFechaCsv(s)
  }
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function claveOrden(row) {
  const fe = parseFecha(row.fecha_ingreso) || parseFecha(row.fecha_de_ingreso) || '9999-99-99'
  const cod = String(row.codigo_interno || row.radicado || row.no || row.id || '')
  return fe + '\t' + cod.padStart(20, '0')
}

function ordenarFilas(rows) {
  return [...rows].sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)))
}

function csvDeTabla(conf, rows, tabla) {
  const cols = columnasExport(conf, tabla)
  const ordenadas = ordenarFilas(rows)
  const sep = ';'
  const lines = [cols.map((c) => celdaCsv(c.etiqueta, null)).join(sep)]
  for (const r of ordenadas) {
    lines.push(cols.map((c) => celdaCsv(r[c.nombre], c)).join(sep))
  }
  return lines.join('\r\n')
}

function csvDeConsulta(conf, rows, tabla) {
  const cols = columnasConsultaExport(conf, tabla)
  const ordenadas = ordenarFilas(rows)
  const sep = ';'
  const lines = [cols.map((c) => celdaCsv(c.etiqueta, null)).join(sep)]
  for (const r of ordenadas) {
    lines.push(cols.map((c) => celdaCsv(r[c.nombre], c)).join(sep))
  }
  return lines.join('\r\n')
}

module.exports = {
  ORDEN_EXCEL,
  COLS_AUDIENCIA_REPORTE,
  columnasExport,
  columnasAudienciaFijas,
  columnasConsultaVista,
  columnasConsultaExport,
  aplicarAudiencia,
  formatFechaCsv,
  celdaCsv,
  csvDeTabla,
  csvDeConsulta,
  ordenarFilas
}
