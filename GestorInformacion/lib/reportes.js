const { parseFecha, extraerFechaEnTexto, extraerFechasEnTexto, enRango } = require('./dates')
const { columnasExport, csvDeTabla, csvDeConsulta, celdaCsv, ordenarFilas } = require('./csv')
const { filtrarRegistros, campoFechaEfectivo, normalizarRango } = require('./busqueda')

const DELITOS_SIERJU = [
  'ARTÍCULO 101. GENOCIDIO.',
  'ARTÍCULO 102. APOLOGÍA DEL GENOCIDIO.',
  'ARTÍCULO 103. HOMICIDIO',
  'OTROS DELITOS DE LESIONES PERSONALES',
  'ARTÍCULO 135. HOMICIDIO EN PERSONA PROTEGIDA.',
  'ARTÍCULO 136. LESIONES EN PERSONA PROTEGIDA.',
  'ARTÍCULO 137. TORTURA EN PERSONA PROTEGIDA.',
  'ARTÍCULO 138. ACCESO CARNAL VIOLENTO EN PERSONA PROTEGIDA.',
  'ARTÍCULO 138A. ACCESO CARNAL ABUSIVO EN PERSONA PROTEGIDA MENOR DE CATORCE AÑOS.',
  'ARTÍCULO 139. ACTOS SEXUALES VIOLENTOS EN PERSONA PROTEGIDA.',
  'ARTÍCULO 139A. ACTOS SEXUALES CON PERSONA PROTEGIDA MENOR DE CATORCE AÑOS.',
  'ARTÍCULO 139B. ESTERILIZACIÓN FORZADA EN PERSONA PROTEGIDA.',
  'ARTÍCULO 139C. EMBARAZO FORZADO EN PERSONA PROTEGIDA.',
  'ARTÍCULO 141. PROSTITUCIÓN FORZADA EN PERSONA PROTEGIDA.',
  'ARTÍCULO 141A. ESCLAVITUD SEXUAL EN PERSONA PROTEGIDA.',
  'ARTÍCULO 141B. TRATA DE PERSONAS EN PERSONA PROTEGIDA CON FINES DE EXPLOTACIÓN SEXUAL.',
  'ARTÍCULO 143. PERFIDIA.',
  'ARTÍCULO 144. ACTOS DE TERRORISMO.',
  'ARTÍCULO 148. TOMA DE REHENES.',
  'ARTÍCULO 159. DEPORTACIÓN- EXPULSIÓN- TRASLADO O DESPLAZAMIENTO FORZADO DE POBLACIÓN CIVIL.',
  'ARTÍCULO 162. RECLUTAMIENTO ILÍCITO.',
  'ARTÍCULO 164. DESTRUCCIÓN DEL MEDIO AMBIENTE.',
  'OTROS DELITOS CONTRA PERSONAS Y BIENES PROTEGIDOS POR EL DERECHO INTERNACIONAL HUMANITARIO',
  'ARTÍCULO 165. DESAPARICIÓN FORZADA.',
  'ARTÍCULO 169. SECUESTRO EXTORSIVO.',
  'ARTÍCULO 173. APODERAMIENTO DE AERONAVES- NAVES- O MEDIOS DE TRANSPORTE COLECTIVO.',
  'ARTÍCULO 178. TORTURA.',
  'ARTÍCULO 180. DESPLAZAMIENTO FORZADO.',
  'ARTÍCULO 182. CONSTREÑIMIENTO ILEGAL.',
  'ARTÍCULO 184. CONSTREÑIMIENTO PARA DELINQUIR.',
  'ARTÍCULO 188-A. TRATA DE PERSONAS.',
  'ARTÍCULO 188E. AMENAZAS CONTRA DEFENSORES DE DERECHOS HUMANOS Y SERVIDORES PÚBLICOS',
  'ARTÍCULO 244. EXTORSIÓN',
  'ARTÍCULO 323. LAVADO DE ACTIVOS',
  'ARTÍCULO 326. TESTAFERRATO. CUANTÍA HASTA 100 SMLMV',
  'ARTÍCULO 327. ENRIQUECIMIENTO ILÍCITO DE PARTICULARES. CUANTÍA HASTA 100 SMLMV',
  'ART. 328 APROVECHAMIENTO ILÍCITO DE LOS RECURSOS NATURALES RENOVABLES',
  'ART. 328A TRÁFICO DE FAUNA',
  'ART. 330 DEFORESTACIÓN',
  'ART. 330A PROMOCIÓN Y FINANCIACIÓN DE LA DEFORESTACIÓN',
  'ART. 333 DAÑOS EN LOS RECURSOS NATURALES Y ECOCIDIO',
  'ART. 336 INVASIÓN DE ÁREAS DE ESPECIAL IMPORTANCIA ECOLÓGICA',
  'DEL APODERAMIENTO DE LOS HIDROCARBUROS, SUS DERIVADOS, BIOCOMBUSTIBLES O MEZCLAS QUE LO CONTENGAN',
  'ARTÍCULO 340. CONCIERTO PARA DELINQUIR',
  'ARTÍCULO 341. ENTRENAMIENTO PARA ACTIVIDADES ILÍCITAS.',
  'ARTÍCULO 343. TERRORISMO',
  'ARTÍCULO 345. FINANCIACIÓN DEL TERRORISMO Y DE GRUPOS DE DELINCUENCIA ORGANIZADA Y ADMINISTRACIÓN DE RECURSOS RELACIONADOS CON ACTIVIDADES TERRORISTAS Y DE LA DELINCUENCIA ORGANIZADA',
  'ARTÍCULO 348. INSTIGACIÓN A DELINQUIR',
  'ARTÍCULO 359. EMPLEO O LANZAMIENTO DE SUSTANCIAS U OBJETOS PELIGROSOS.',
  'ARTÍCULO 366. FABRICACIÓN- TRÁFICO Y PORTE DE ARMAS- MUNICIONES DE USO RESTRINGIDO- DE USO PRIVATIVO DE LAS FUERZAS ARMADAS O EXPLOSIVOS.',
  'ARTÍCULO 367-A. EMPLEO- PRODUCCIÓN- COMERCIALIZACIÓN Y ALMACENAMIENTO DE MINAS ANTIPERSONAL.',
  'ARTÍCULO 367-B. AYUDA E INDUCCIÓN AL EMPLEO- PRODUCCIÓN Y TRANSFERENCIA DE MINAS ANTIPERSONAL.',
  'ARTÍCULO 372. CORRUPCIÓN DE ALIMENTOS- PRODUCTOS MÉDICOS O MATERIAL PROFILÁCTICO.',
  'ARTÍCULO 375. CONSERVACIÓN O FINANCIACIÓN DE PLANTACIONES',
  'ARTÍCULO 376. TRÁFICO- FABRICACIÓN O PORTE DE ESTUPEFACIENTES',
  'ARTÍCULO 377. DESTINACIÓN ILÍCITA DE MUEBLES O INMUEBLES.',
  'ARTÍCULO 382. TRÁFICO DE SUSTANCIAS PARA EL PROCESAMIENTO DE NARCÓTICOS',
  'ARTÍCULO 385. EXISTENCIA- CONSTRUCCIÓN Y UTILIZACIÓN ILEGAL DE PISTAS DE ATERRIZAJE.',
  'OTROS PROCESOS'
]

const DERECHOS_TUTELA = [
  'SALUD',
  'SEGURIDAD SOCIAL',
  'VIDA',
  'MÍNIMO VITAL',
  'IGUALDAD',
  'EDUCACIÓN',
  'DEBIDO PROCESO',
  'DERECHO DE PETICIÓN',
  'DERECHO A LA INFORMACIÓN PÚBLICA',
  'CONTRA PROVIDENCIAS JUDICIALES',
  'MEDIO AMBIENTE',
  'OTROS'
]

const TIPOS_AUDIENCIA_SIERJU = [
  { clave: 'acusacion', etiqueta: 'LEY 906 AUDIENCIA DE FORMULACIÓN DE ACUSACIÓN' },
  { clave: 'preparatoria', etiqueta: 'LEY 906 AUDIENCIA PREPARATORIA' },
  { clave: 'juicio', etiqueta: 'LEY 906 AUDIENCIA DE JUICIO ORAL' },
  { clave: 'fallo', etiqueta: 'LEY 906 AUDIENCIA DE FALLO E INDIVIDUALIZACIÓN DE LA PENA' },
  { clave: 'otras', etiqueta: 'OTRAS AUDIENCIAS' }
]

const ENTRADAS_LEY906 = [
  { clave: 'e_descongestion', etiqueta: 'DESCONGESTIÓN' },
  { clave: 'e_acusacion', etiqueta: 'ESCRITO DE ACUSACIÓN' },
  { clave: 'e_preclusion', etiqueta: 'SOLICITUD DE PRECLUSIÓN SIN ACUSACIÓN' },
  { clave: 'e_preacuerdo', etiqueta: 'ESCRITO DE ACUSACIÓN CON PRE ACUERDO' },
  { clave: 'e_allanamiento', etiqueta: 'ALLANAMIENTO A CARGOS' },
  { clave: 'e_nulidad', etiqueta: 'REINGRESADOS - NULIDAD' },
  { clave: 'e_ruptura', etiqueta: 'REINGRESADOS - RUPTURA UNIDAD PROCESAL' },
  { clave: 'e_cambio', etiqueta: 'INGRESO CAMBIO DE RADICACIÓN' },
  { clave: 'e_recibidos', etiqueta: 'RECIBIDOS DE OTROS DESPACHOS' },
  { clave: 'e_otras', etiqueta: 'OTRAS ENTRADAS NO EFECTIVAS' }
]

const SALIDAS_LEY906 = [
  { clave: 's_descongestion', etiqueta: 'PARA DESCONGESTIÓN' },
  { clave: 's_remitidos', etiqueta: 'REMITIDOS A OTROS DESPACHOS' },
  { clave: 's_preclusion', etiqueta: 'AUTOS - PRECLUSIÓN' },
  { clave: 's_sentencias', etiqueta: 'SENTENCIAS' },
  { clave: 's_cambio', etiqueta: 'SALIDA CAMBIO DE RADICACIÓN' },
  { clave: 's_prescripcion', etiqueta: 'EXTINCIÓN DE LA ACCIÓN PENAL - PRESCRIPCIÓN' },
  { clave: 's_extincion_otras', etiqueta: 'EXTINCIÓN DE LA ACCIÓN PENAL - OTRAS CAUSALES' },
  { clave: 's_ley1820', etiqueta: 'APLICACIÓN LEY 1820' },
  { clave: 's_ley1424', etiqueta: 'SENTENCIAS ANTICIPADAS LEY 1424' },
  { clave: 's_otras', etiqueta: 'OTRAS SALIDAS NO EFECTIVAS' }
]

const COLS_LEY906 = [
  ...ENTRADAS_LEY906,
  ...SALIDAS_LEY906,
  { clave: 'conexidad', etiqueta: 'PROCESOS POR CONEXIDAD' }
]

const COLS_LEY906_POST = [
  { clave: 'para_fallo', etiqueta: 'PROCESOS PARA FALLO' }
]

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function contiene(texto, ...palabras) {
  const t = norm(texto)
  return palabras.some((p) => t.includes(norm(p)))
}

function esJuzgadoPrimero(valor) {
  return String(valor || '').trim().toUpperCase() === 'PRIMERO'
}

function filtrarJuzgadoPrimero(rows) {
  return (rows || []).filter((r) => esJuzgadoPrimero(r.juzgado))
}

function mapDelito(valor) {
  const t = norm(valor)
  if (!t) return 'OTROS PROCESOS'
  const exact = DELITOS_SIERJU.find((d) => {
    const nd = norm(d).replace(/^ARTICULO |^ART /, '')
    return nd === t || t === norm(d)
  })
  if (exact) return exact
  const reglas = [
    ['ARTÍCULO 101. GENOCIDIO.', ['101', 'GENOCIDIO'], ['APOLOGIA']],
    ['ARTÍCULO 102. APOLOGÍA DEL GENOCIDIO.', ['102', 'APOLOGIA'], []],
    ['ARTÍCULO 135. HOMICIDIO EN PERSONA PROTEGIDA.', ['135', 'HOMICIDIO EN PERSONA PROTEGIDA', 'HOMICIDIO Y LESIONES PERSONALES EN PERSONA PROTEGIDA'], []],
    ['ARTÍCULO 136. LESIONES EN PERSONA PROTEGIDA.', ['136', 'LESIONES EN PERSONA PROTEGIDA'], []],
    ['ARTÍCULO 103. HOMICIDIO', ['103', '104', 'HOMICIDIO AGRVADO', 'HOMICIDIO AGRAVADO', 'OTROS HOMICIDIOS', 'HOMICIDIO'], ['PERSONA PROTEGIDA']],
    ['OTROS DELITOS DE LESIONES PERSONALES', ['LESIONES'], ['PERSONA PROTEGIDA']],
    ['ARTÍCULO 165. DESAPARICIÓN FORZADA.', ['165', 'DESAPARICION'], []],
    ['ARTÍCULO 169. SECUESTRO EXTORSIVO.', ['169', 'SECUESTRO EXTORSIVO', 'SECUESTRO'], []],
    ['ARTÍCULO 180. DESPLAZAMIENTO FORZADO.', ['180', 'DESPLAZAMIENTO'], ['DEPORTACION']],
    ['ARTÍCULO 188E. AMENAZAS CONTRA DEFENSORES DE DERECHOS HUMANOS Y SERVIDORES PÚBLICOS', ['188E', '188 E'], []],
    ['ARTÍCULO 188-A. TRATA DE PERSONAS.', ['188 A', '188A', 'TRATA DE PERSONAS'], ['PERSONA PROTEGIDA']],
    ['ARTÍCULO 244. EXTORSIÓN', ['244', 'EXTORSION'], ['SECUESTRO']],
    ['ARTÍCULO 323. LAVADO DE ACTIVOS', ['323', 'LAVADO'], []],
    ['ARTÍCULO 326. TESTAFERRATO. CUANTÍA HASTA 100 SMLMV', ['326', 'TESTAFERRATO'], []],
    ['ARTÍCULO 327. ENRIQUECIMIENTO ILÍCITO DE PARTICULARES. CUANTÍA HASTA 100 SMLMV', ['327', 'ENRIQUECIMIENTO'], ['HIDROCARB', 'RECEPTACION']],
    ['DEL APODERAMIENTO DE LOS HIDROCARBUROS, SUS DERIVADOS, BIOCOMBUSTIBLES O MEZCLAS QUE LO CONTENGAN', ['HIDROCARB', '327 A', '327A', 'RECEPTACION DE HIDROCARBUROS', 'APODERAMIENTO'], []],
    ['ARTÍCULO 340. CONCIERTO PARA DELINQUIR', ['340', 'CONCIERTO'], []],
    ['ARTÍCULO 343. TERRORISMO', ['343', 'TERRORISMO'], ['ACTOS DE TERRORISMO', 'FINANCIACION']],
    ['ARTÍCULO 144. ACTOS DE TERRORISMO.', ['144', 'ACTOS DE TERRORISMO'], []],
    ['ARTÍCULO 345. FINANCIACIÓN DEL TERRORISMO Y DE GRUPOS DE DELINCUENCIA ORGANIZADA Y ADMINISTRACIÓN DE RECURSOS RELACIONADOS CON ACTIVIDADES TERRORISTAS Y DE LA DELINCUENCIA ORGANIZADA', ['345', 'FINANCIACION DEL TERRORISMO', 'FINANCIACION'], []],
    ['ARTÍCULO 366. FABRICACIÓN- TRÁFICO Y PORTE DE ARMAS- MUNICIONES DE USO RESTRINGIDO- DE USO PRIVATIVO DE LAS FUERZAS ARMADAS O EXPLOSIVOS.', ['366', 'ARMAS', 'MUNICION', 'EXPLOSIV'], []],
    ['ARTÍCULO 375. CONSERVACIÓN O FINANCIACIÓN DE PLANTACIONES', ['375', 'PLANTACION'], []],
    ['ARTÍCULO 382. TRÁFICO DE SUSTANCIAS PARA EL PROCESAMIENTO DE NARCÓTICOS', ['382', 'TRAFICO SUSTANCIAS', 'SUSTANCIAS PARA EL PROCESAMIENTO', 'TRAFICO DE SUSTANCIAS'], []],
    ['ARTÍCULO 376. TRÁFICO- FABRICACIÓN O PORTE DE ESTUPEFACIENTES', ['376', 'ESTUPEFAC', 'ESTUPERFAC', 'NARCOT'], ['382', 'SUSTANCIAS PARA']],
    ['ARTÍCULO 377. DESTINACIÓN ILÍCITA DE MUEBLES O INMUEBLES.', ['377', 'DESTINACION ILICITA'], []],
    ['CONTRA ORDEN ECONOMICO', ['ORDEN ECONOMICO'], []],
    ['ARTÍCULO 341. ENTRENAMIENTO PARA ACTIVIDADES ILÍCITAS.', ['341', 'ENTRENAMIENTO'], []]
  ]
  for (const [canon, keys, excl] of reglas) {
    if (excl.some((k) => t.includes(norm(k)))) continue
    if (keys.some((k) => t.includes(norm(k)))) return canon === 'CONTRA ORDEN ECONOMICO' ? 'OTROS PROCESOS' : canon
  }
  return 'OTROS PROCESOS'
}

function mapEntrada(row) {
  const f = norm(row.forma_de_ingreso)
  const i = norm(row.ingreso)
  const t = `${f} ${i}`
  const j = norm(row.juzgado)
  if (contiene(t, 'DESCONGEST') || contiene(j, 'DESCONGEST')) return 'e_descongestion'
  if (contiene(t, 'ALLANAM')) return 'e_allanamiento'
  if (contiene(t, 'PREACUER', 'PRE ACUER', 'PREACUEDO', 'PREACURDO', 'PREACUEROD')) return 'e_preacuerdo'
  if (contiene(t, 'PRECLUS')) return 'e_preclusion'
  if (contiene(t, 'NULIDAD')) return 'e_nulidad'
  if (contiene(t, 'RUPTURA')) return 'e_ruptura'
  if (contiene(t, 'CAMBIO DE RADIC')) return 'e_cambio'
  if (contiene(t, 'COMPETENCIA', 'IMPEDIMENTO', 'RECIBID') && !contiene(t, 'REPARTO')) return 'e_recibidos'
  if (contiene(t, 'ACUSAC', 'REPARTO', 'VENTANILLA')) return 'e_acusacion'
  if (t.trim()) return 'e_otras'
  return 'e_acusacion'
}

function mapSalida(row) {
  const j = norm(row.juzgado)
  const t = norm([
    row.otras_salidas, row.tipo_salida, row.observaciones, row.observaciones_sentencia,
    row.sentido_del_fallo, row.juzgado, row.a_otros_despachos_por_impedimentos_recusacion_competencia
  ].join(' '))
  if (contiene(j, 'DESCONGEST') || contiene(t, 'DESCONGEST')) return 's_descongestion'
  if (contiene(t, 'PRESCRIP') || contiene(j, 'PRESCRIP') || contiene(row.observaciones_sentencia || '', 'PRESCRIP')) return 's_prescripcion'
  if (contiene(t, 'PRECLUS') || contiene(row.observaciones_sentencia || '', 'PRECLUS') || (parseFecha(row.fecha_preclusion) && !parseFecha(row.fecha_de_sentencia_auto))) return 's_preclusion'
  if (contiene(t, 'AMNIST', 'LEY 1820', '1820', 'INDULTO')) return 's_ley1820'
  if (contiene(t, '1424')) return 's_ley1424'
  if (contiene(t, 'CAMBIO DE RADIC')) return 's_cambio'
  if (contiene(j, 'FISCALIA', 'JEP', 'TRIBUNAL', 'OTRO JUZGADO', 'JDO PENAL', 'CORTE', 'CASACION') ||
      contiene(t, 'REMITID', 'COMPETENCIA', 'IMPEDIMENTO', 'CONFLICTO')) return 's_remitidos'
  if (contiene(t, 'SENTENCIA', 'CONDENA', 'ABSUEL', 'ABSOLUT', 'FALLO', 'LECTURA') ||
      parseFecha(row.fecha_de_sentencia_auto) || parseFecha(row.lectura_de_sentencia) || parseFecha(row.fecha_ejecutoria_sentencia)) {
    return 's_sentencias'
  }
  if (contiene(j, 'ARCHIV') || parseFecha(row.fecha_de_archivo)) return 's_otras'
  return 's_otras'
}

function mapAudienciaTipo(valor) {
  const t = norm(valor)
  if (contiene(t, 'ACUSAC')) return 'acusacion'
  if (contiene(t, 'PREPARATOR')) return 'preparatoria'
  if (contiene(t, 'JUICIO')) return 'juicio'
  if (contiene(t, 'FALLO', '447', 'INDIVIDUALIZ', 'LECTURA', 'SENTENCIA')) return 'fallo'
  return 'otras'
}

function derechoEstadisticaDe(row) {
  const celda = String(row && row.derecho_estadistica != null ? row.derecho_estadistica : '').trim()
  if (celda) return mapDerecho(celda)
  return mapDerecho(row && row.derecho_vulnerado)
}

function mapDerecho(valor) {
  const t = norm(valor)
  if (!t) return 'OTROS'
  if (t === 'PETICION' || t === 'DERECHO DE PETICION') return 'DERECHO DE PETICIÓN'
  if (t === 'DEBIDO PROCESO') return 'DEBIDO PROCESO'
  if (t === 'SALUD') return 'SALUD'
  if (t === 'VIDA') return 'VIDA'
  if (t === 'MINIMO VITAL') return 'MÍNIMO VITAL'
  if (t === 'SEGURIDAD SOCIAL') return 'SEGURIDAD SOCIAL'
  if (t === 'IGUALDAD') return 'IGUALDAD'
  if (t === 'EDUCACION') return 'EDUCACIÓN'
  if (contiene(t, 'SEGURIDAD SOCIAL')) return 'SEGURIDAD SOCIAL'
  if (contiene(t, 'PETICION')) return 'DERECHO DE PETICIÓN'
  if (contiene(t, 'DEBIDO PROCESO')) return 'DEBIDO PROCESO'
  if (contiene(t, 'SALUD')) return 'SALUD'
  if (contiene(t, 'EDUCACION')) return 'EDUCACIÓN'
  if (contiene(t, 'VIDA')) return 'VIDA'
  if (contiene(t, 'MINIMO VITAL')) return 'MÍNIMO VITAL'
  if (contiene(t, 'IGUALDAD')) return 'IGUALDAD'
  if (contiene(t, 'INFORMACION')) return 'DERECHO A LA INFORMACIÓN PÚBLICA'
  if (contiene(t, 'PROVIDENCIA')) return 'CONTRA PROVIDENCIAS JUDICIALES'
  if (contiene(t, 'AMBIENTE')) return 'MEDIO AMBIENTE'
  return 'OTROS'
}

function marcado(valor) {
  const t = norm(valor)
  if (!t || t === 'NO' || t === 'N A' || t === 'NA') return false
  return t === 'X' || t === 'SI' || t === 'S' || t === 'TUTELA' || t.startsWith('X ') || t.endsWith(' X')
}

function esHabeasCorpus(r) {
  return marcado(r.habeas_corpus) && !marcado(r.tutela) && !marcado(r.incidente)
}

function fechaMasTemprana(...valores) {
  const fechas = valores.map((v) => parseFecha(v) || extraerFechaEnTexto(v)).filter(Boolean).sort()
  return fechas[0] || null
}

function clampSalida(ingreso, salida) {
  if (ingreso && salida && salida < ingreso) return null
  return salida || null
}

function movimiento(ingreso, salida, desde, hasta) {
  const ing = parseFecha(ingreso)
  const sal = clampSalida(ing, parseFecha(salida) || extraerFechaEnTexto(salida))
  const en = (f) => !!(f && (!desde || f >= desde) && (!hasta || f <= hasta))
  const entrada = en(ing)
  const sale = !!(ing && sal && en(sal))
  const ini = !!(ing && desde && ing < desde && sal && sal >= desde)
  const fin = !!(ing && (!hasta || ing <= hasta) && (
    (sal && (!hasta || sal > hasta)) ||
    (!sal && entrada)
  ))
  return { ing, sal, ini, entrada, sale, fin }
}

function movimientoDespacho(ingreso, salida, desde, hasta) {
  const ing = parseFecha(ingreso)
  const sal = clampSalida(ing, parseFecha(salida) || extraerFechaEnTexto(salida))
  const en = (f) => !!(f && (!desde || f >= desde) && (!hasta || f <= hasta))
  const entrada = en(ing)
  const sale = !!(ing && sal && en(sal))
  const ini = !!(ing && desde && ing < desde && (!sal || sal >= desde))
  const fin = !!(ing && (!hasta || ing <= hasta) && (!sal || !hasta || sal > hasta))
  return { ing, sal, ini, entrada, sale, fin }
}

function tieneMovimientoPeriodo(mv) {
  return !!(mv && (mv.ini || mv.entrada || mv.sale || mv.fin))
}

function fechaSalidaHabeas(r) {
  const ingreso = parseFecha(r.fecha_ingreso)
  return clampSalida(ingreso, fechaMasTemprana(r.archivo, r.sentencia, r.observaciones))
}

function fechaSalidaTutela(r) {
  const ingreso = parseFecha(r.fecha_ingreso)
  return clampSalida(ingreso, fechaMasTemprana(r.archivo, r.sentencia))
}

function fechaSalidaDesacato(r) {
  const ingreso = parseFecha(r.fecha_ingreso)
  return clampSalida(ingreso, fechaMasTemprana(r.archivo, r.abstiene, r.sanciona))
}

function fechaSalidaEnPeriodo(salida, desde, hasta) {
  const f = parseFecha(salida) || extraerFechaEnTexto(salida)
  if (!f) return false
  if (desde && f < desde) return false
  if (hasta && f > hasta) return false
  return true
}

function ingresoNoEfectivo(r) {
  const acta = norm(r && r.no_acta_reparto_centro_servicios)
  const rad = norm(r && r.radicado_interno_consecutivo_juzgado)
  const otras = norm(r && r.otras_salidas)
  if (acta.includes('NO INGRESO')) return true
  if ((rad === 'SIN RADICADO' || rad === 'SINRADICADO' || !rad) && contiene(otras, 'REMIT', 'REPARTO')) return true
  return false
}

function claseTutela(r) {
  if (esHabeasCorpus(r)) return 'habeas'
  if (marcado(r.incidente)) return 'desacato'
  return 'tutela'
}

function vacioFila(keys) {
  const o = { tipo: '', inventario_inicial: 0 }
  for (const k of keys) o[k] = 0
  o.inventario_final = 0
  return o
}

function sumarFilas(filas, keys) {
  const t = vacioFila(keys)
  t.tipo = 'Total'
  for (const f of filas) {
    t.inventario_inicial += f.inventario_inicial || 0
    t.inventario_final += f.inventario_final || 0
    for (const k of keys) t[k] += f[k] || 0
  }
  return t
}

function construirMatriz(tipos, keys) {
  const map = {}
  for (const t of tipos) {
    const f = vacioFila(keys)
    f.tipo = t
    map[t] = f
  }
  return map
}

function filtrarPorCampoFecha(rows, campo, desde, hasta) {
  const out = []
  for (const r of rows) {
    const f = parseFecha(r[campo])
    if (!f) continue
    if (desde && f < desde) continue
    if (hasta && f > hasta) continue
    out.push(r)
  }
  return out
}

function validarCorte({ filtrados, entradas, salidas, ini, fin, detalleEntradas, detalleSalidas, cuadroInventario }) {
  const n = (filtrados && filtrados.length) || 0
  const e = entradas || 0
  const s = salidas || 0
  const i = ini || 0
  const f = fin || 0
  const errores = []
  if (filtrados && n !== e) {
    errores.push('Registros filtrados (' + n + ') distinto de entradas (' + e + ').')
  }
  if (cuadroInventario !== false && i + e - s !== f) {
    errores.push('No cuadra ini + entradas − salidas = fin (' + i + ' + ' + e + ' − ' + s + ' = ' + (i + e - s) + ', fin ' + f + ').')
  }
  if (detalleEntradas != null && detalleEntradas !== e) {
    errores.push('La suma de entradas del detalle no coincide con el total.')
  }
  if (detalleSalidas != null && detalleSalidas !== s) {
    errores.push('La suma de salidas del detalle no coincide con el total.')
  }
  return {
    ok: errores.length === 0,
    registros_filtrados: n,
    entradas: e,
    salidas: s,
    inventario_inicial: i,
    inventario_final: f,
    errores
  }
}

function validarConteo(filtrados, total, etiquetaTotal) {
  const n = (filtrados && filtrados.length) || 0
  const t = total || 0
  const errores = []
  if (n !== t) {
    errores.push('Registros filtrados (' + n + ') distinto de ' + (etiquetaTotal || 'total') + ' (' + t + ').')
  }
  return {
    ok: errores.length === 0,
    registros_filtrados: n,
    total: t,
    errores
  }
}

function filaTieneMovimiento(f) {
  return Object.keys(f).some((k) => k !== 'tipo' && Number(f[k]))
}

function reporteCompleto(db, esquema, { desde, hasta, modulo, limite, fechaCampo }) {
  const mods = modulo && esquema[modulo] ? [modulo] : Object.keys(esquema)
  const max = limite == null ? Infinity : Math.max(0, Number(limite) || 0)
  const rango = normalizarRango(desde, hasta)
  const bloques = []
  for (const m of mods) {
    const conf = esquema[m]
    const rows = db.prepare(`SELECT * FROM ${m}`).all()
    const pedido = String(fechaCampo || '').trim()
    const nombres = new Set((conf.columnas || []).map((c) => c.nombre))
    const alias = pedido === 'fecha_ingreso' && nombres.has('fecha_de_ingreso')
      ? 'fecha_de_ingreso'
      : pedido === 'fecha_de_ingreso' && nombres.has('fecha_ingreso')
        ? 'fecha_ingreso'
        : pedido
    const tienePedido = alias && nombres.has(alias)
    const campo = tienePedido ? alias : campoFechaEfectivo(conf, '')
    let filtrados
    if (pedido && !tienePedido && (rango.desde || rango.hasta)) {
      filtrados = []
    } else {
      const filtrado = filtrarRegistros(rows, conf, {
        desde: rango.desde,
        hasta: rango.hasta,
        fechaCampo: campo,
        q: '',
        filtros: []
      })
      filtrados = ordenarFilas(filtrado.resultados.map((x) => x.row))
    }
    const columnas = columnasExport(conf, m)
    const recorte = filtrados.slice(0, Number.isFinite(max) ? max : filtrados.length)
    const colFecha = (conf.columnas || []).find((c) => c.nombre === campo)
    bloques.push({
      tabla: m,
      titulo: conf.titulo,
      origen: conf.origen,
      descripcion: conf.descripcion,
      total: filtrados.length,
      inventario: rows.length,
      campo_fecha: campo,
      etiqueta_fecha: (colFecha && colFecha.etiqueta) || campo,
      columnas,
      registros: recorte.map((r) => {
        const o = { id: r.id }
        for (const c of columnas) o[c.nombre] = r[c.nombre] == null ? '' : String(r[c.nombre])
        return o
      })
    })
  }
  return {
    nombre: 'Reporte Completo',
    fuente: 'Inventario definitivo 18-09-26',
    desde: rango.desde || '',
    hasta: rango.hasta || '',
    campo_fecha: fechaCampo || '',
    bloques
  }
}

function reporteEstadistica(db, { desde: d0, hasta: h0, fechaCampo }) {
  const rangoEst = normalizarRango(d0, h0)
  const desde = rangoEst.desde
  const hasta = rangoEst.hasta
  const procesosTodos = db.prepare('SELECT * FROM procesos').all()
  const procesos = filtrarJuzgadoPrimero(procesosTodos)
  const tutelas = db.prepare('SELECT * FROM tutelas').all()
  const apelaciones = db.prepare('SELECT * FROM apelaciones').all()
  const ley600 = filtrarJuzgadoPrimero(db.prepare('SELECT * FROM ley600').all())
  const disciplinarios = db.prepare('SELECT * FROM disciplinarios').all()
  const calendario = db.prepare('SELECT * FROM calendario').all()

  const enPeriodo = (fecha) => enRango(fecha, desde, hasta)

  const keysE = ENTRADAS_LEY906.map((x) => x.clave)
  const keysS = SALIDAS_LEY906.map((x) => x.clave)

  function fechaSalidaProceso(_r) {
    return null
  }

  function etiquetaDelitoInventario(valor) {
    const s = String(valor == null ? '' : valor).trim()
    return s || '(vacío en inventario)'
  }

  const etiquetaEntrada = {}
  for (const c of ENTRADAS_LEY906) etiquetaEntrada[c.clave] = c.etiqueta
  const etiquetaSalida = {}
  for (const c of SALIDAS_LEY906) etiquetaSalida[c.clave] = c.etiqueta

  function matrizConocimiento() {
    const keysAll = [...COLS_LEY906, ...COLS_LEY906_POST].map((c) => c.clave)
    const map = {}
    function filaDe(tipo) {
      if (!map[tipo]) {
        const f = vacioFila(keysAll)
        f.tipo = tipo
        map[tipo] = f
      }
      return map[tipo]
    }
    const detalle = []
    const ids = new Set()
    const filtrados = []
     for (const r of procesos) {
       const mv = movimientoDespacho(r.fecha_ingreso, fechaSalidaProceso(r), desde, hasta)
       if (!tieneMovimientoPeriodo(mv)) continue
      filtrados.push(r)
      if (ids.has(r.id)) continue
      ids.add(r.id)
      const tipo = etiquetaDelitoInventario(r.delito_estadistica)
      const fila = filaDe(tipo)
      const ent = mapEntrada(r)
      const salClave = mv.sale ? mapSalida(r) : ''
      if (mv.ini) fila.inventario_inicial++
      if (mv.entrada) fila[ent]++
      if (mv.sale) fila[salClave]++
      if (mv.fin) fila.inventario_final++
      if (mv.fin && contiene(r.audiencia, 'JUICIO', 'FALLO', '447', 'SENTIDO')) fila.para_fallo++
      if (mv.entrada && (contiene(r.ingreso, 'CONEXIDAD') || contiene(r.forma_de_ingreso, 'CONEXIDAD') || contiene(r.juzgado, 'CONEXO'))) {
        fila.conexidad++
      }
      detalle.push({
        id: r.id,
        radicado: r.radicado || '',
        no: r.no || '',
        procesado_s: r.procesado_s || '',
        delito_estadistica: tipo,
        fecha_ingreso: mv.ing || '',
        fecha_salida: mv.sal || '',
        forma_de_ingreso: r.forma_de_ingreso || '',
        ingreso: r.ingreso || '',
        casilla_entrada: mv.entrada ? (etiquetaEntrada[ent] || ent) : '',
        casilla_salida: salClave ? (etiquetaSalida[salClave] || salClave) : '',
        inventario_inicial: mv.ini ? 1 : 0,
        entrada: mv.entrada ? 1 : 0,
        salida: mv.sale ? 1 : 0,
        inventario_final: mv.fin ? 1 : 0
      })
    }
    const filas = Object.keys(map).sort((a, b) => {
      if (a === '(vacío en inventario)') return 1
      if (b === '(vacío en inventario)') return -1
      return a.localeCompare(b, 'es', { sensitivity: 'base' })
    }).map((t) => map[t])
    const total = sumarFilas(filas, keysAll)
    const eProc = keysE.reduce((a, k) => a + (total[k] || 0), 0)
    const sProc = keysS.reduce((a, k) => a + (total[k] || 0), 0)
    const sumaIni = filas.reduce((a, f) => a + (f.inventario_inicial || 0), 0)
    const sumaFin = filas.reduce((a, f) => a + (f.inventario_final || 0), 0)
    const nEntradas = detalle.reduce((a, d) => a + (d.entrada || 0), 0)
    const nSalidas = detalle.reduce((a, d) => a + (d.salida || 0), 0)
    const validacion = validarCorte({
      filtrados: detalle.filter((d) => d.entrada),
      entradas: eProc,
      salidas: sProc,
      ini: sumaIni,
      fin: sumaFin,
      detalleEntradas: nEntradas,
      detalleSalidas: nSalidas,
      cuadroInventario: true
    })
    return {
      columnas: COLS_LEY906,
      columnas_post: COLS_LEY906_POST,
      columnas_entrada: ENTRADAS_LEY906,
      columnas_salida: SALIDAS_LEY906,
      filas,
      total,
      campo_fecha: 'fecha_ingreso',
      etiqueta_fecha: 'FECHA INGRESO',
      registros_filtrados: detalle.length,
      detalle,
      columnas_detalle: [
        { clave: 'id', etiqueta: 'Id' },
        { clave: 'radicado', etiqueta: 'Radicado' },
        { clave: 'no', etiqueta: 'No.' },
        { clave: 'procesado_s', etiqueta: 'Procesado(s)' },
        { clave: 'delito_estadistica', etiqueta: 'DELITO ESTADISTICA' },
        { clave: 'fecha_ingreso', etiqueta: 'Fecha ingreso' },
        { clave: 'fecha_salida', etiqueta: 'Fecha salida' },
        { clave: 'casilla_entrada', etiqueta: 'Casilla entrada' },
        { clave: 'casilla_salida', etiqueta: 'Casilla salida' },
        { clave: 'inventario_inicial', etiqueta: 'Ini' },
        { clave: 'entrada', etiqueta: 'E' },
        { clave: 'salida', etiqueta: 'S' },
        { clave: 'inventario_final', etiqueta: 'Fin' }
      ],
      validacion
    }
  }

  const conocimiento = matrizConocimiento()

  const COLS_DETALLE_INGRESO = [
    { clave: 'id', etiqueta: 'Id' },
    { clave: 'radicado', etiqueta: 'Radicado' },
    { clave: 'tipo', etiqueta: 'Tipo / casilla' },
    { clave: 'fecha_ingreso', etiqueta: 'Fecha ingreso' },
    { clave: 'fecha_salida', etiqueta: 'Fecha salida' },
    { clave: 'casilla_entrada', etiqueta: 'Casilla entrada' },
    { clave: 'casilla_salida', etiqueta: 'Casilla salida' },
    { clave: 'inventario_inicial', etiqueta: 'Ini' },
    { clave: 'entrada', etiqueta: 'E' },
    { clave: 'salida', etiqueta: 'S' },
    { clave: 'inventario_final', etiqueta: 'Fin' }
  ]

  function casillaEntradaTutela(r) {
    if (contiene(r.forma_de_ingreso, 'NULIDAD')) return 'reingreso'
    if (contiene(r.forma_de_ingreso, 'COMPETENCIA') && !contiene(r.forma_de_ingreso, 'REPARTO')) return 'competencia'
    if (contiene(r.forma_de_ingreso, 'IMPEDIMENTO')) return 'impedimentos'
    return 'reparto'
  }

  function casillaSalidaTutela(r) {
    if (marcado(r.improcedente) || contiene(r.observaciones, 'IMPROCEDENTE')) return 'improcedente'
    if (marcado(r.niega_o_no_concede) || contiene(r.observaciones, 'NO CONCEDER', 'NIEGA', 'NEGAR')) return 'niega'
    if (marcado(r.hecho_superado) || contiene(r.tutela_2, 'HECHO SUPERADO')) return 'hecho_superado'
    if (contiene(r.tutela_2, 'RECHAZA') || contiene(r.otras_salidas, 'RECHAZA')) return 'rechaza'
    if (contiene(r.tutela_2, 'REMITIR') || contiene(r.otras_salidas, 'COMPETENCIA')) return 'falta_competencia'
    if (marcado(r.tutela_2) || marcado(r.tutela) || contiene(r.observaciones, 'TUTELAR', 'CONCEDE')) return 'concede'
    return 'otras_salidas'
  }

  const keysTut = [
    'reparto', 'reingreso', 'competencia', 'impedimentos', 'otras_entradas',
    'concede', 'niega', 'improcedente', 'falta_competencia', 'salida_impedimentos',
    'hecho_superado', 'rechaza', 'rechaza_conocimiento', 'retiro', 'otras_salidas', 'acumulados'
  ]
  const keysTutE = ['reparto', 'reingreso', 'competencia', 'impedimentos', 'otras_entradas']
  const keysTutS = ['concede', 'niega', 'improcedente', 'falta_competencia', 'salida_impedimentos', 'hecho_superado', 'rechaza', 'rechaza_conocimiento', 'retiro', 'otras_salidas']
  const mapTut = construirMatriz(DERECHOS_TUTELA, keysTut)
  const detalleTut = []
  const filtradosTut = []
  for (const r of tutelas) {
    if (ingresoNoEfectivo(r)) continue
    if (claseTutela(r) !== 'tutela') continue
    const mv = movimiento(r.fecha_ingreso, fechaSalidaTutela(r), desde, hasta)
    if (!tieneMovimientoPeriodo(mv)) continue
    filtradosTut.push(r)
    const tipo = derechoEstadisticaDe(r)
    const fila = mapTut[tipo] || mapTut.OTROS
    const ent = casillaEntradaTutela(r)
    const salClave = mv.sale ? casillaSalidaTutela(r) : ''
    if (mv.ini) fila.inventario_inicial++
    if (mv.entrada) fila[ent]++
    if (mv.sale) fila[salClave]++
    if (mv.fin) fila.inventario_final++
    detalleTut.push({
      id: r.id,
      radicado: r.radicado_interno_consecutivo_juzgado || '',
      tipo,
      fecha_ingreso: mv.ing || '',
      fecha_salida: mv.sal || '',
      casilla_entrada: mv.entrada ? ent : '',
      casilla_salida: salClave,
      inventario_inicial: mv.ini ? 1 : 0,
      entrada: mv.entrada ? 1 : 0,
      salida: mv.sale ? 1 : 0,
      inventario_final: mv.fin ? 1 : 0
    })
  }
  const filasTut = DERECHOS_TUTELA.map((t) => mapTut[t]).filter(filaTieneMovimiento)
  const totTut = sumarFilas(filasTut.length ? filasTut : DERECHOS_TUTELA.map((t) => mapTut[t]), keysTut)
  const eTut = keysTutE.reduce((a, k) => a + (totTut[k] || 0), 0)
  const sTut = keysTutS.reduce((a, k) => a + (totTut[k] || 0), 0)
  const validacionTut = validarCorte({
    filtrados: detalleTut.filter((d) => d.entrada),
    entradas: eTut,
    salidas: sTut,
    ini: totTut.inventario_inicial,
    fin: totTut.inventario_final,
    detalleEntradas: detalleTut.reduce((a, d) => a + (d.entrada || 0), 0),
    detalleSalidas: detalleTut.reduce((a, d) => a + (d.salida || 0), 0),
    cuadroInventario: true
  })

  const habeas = { tipo: 'ACCIÓN DE HÁBEAS CORPUS', inventario_inicial: 0, por_reparto: 0, concede: 0, niega: 0, otras_salidas: 0, inventario_final: 0 }
  const detalleHab = []
  const filtradosHab = []
  for (const r of tutelas) {
    if (ingresoNoEfectivo(r)) continue
    if (claseTutela(r) !== 'habeas') continue
    const mv = movimiento(r.fecha_ingreso, fechaSalidaHabeas(r), desde, hasta)
    if (!tieneMovimientoPeriodo(mv)) continue
    filtradosHab.push(r)
    let salClave = ''
    if (mv.ini) habeas.inventario_inicial++
    if (mv.entrada) habeas.por_reparto++
    if (mv.sale) {
      if (contiene(r.observaciones, 'CONCEDE', 'TUTELAR')) { habeas.concede++; salClave = 'concede' }
      else if (contiene(r.observaciones, 'NIEGA', 'NEGAR')) { habeas.niega++; salClave = 'niega' }
      else { habeas.otras_salidas++; salClave = 'otras_salidas' }
    }
    if (mv.fin) habeas.inventario_final++
    detalleHab.push({
      id: r.id,
      radicado: r.radicado_interno_consecutivo_juzgado || '',
      tipo: 'ACCIÓN DE HÁBEAS CORPUS',
      fecha_ingreso: mv.ing || '',
      fecha_salida: mv.sal || '',
      casilla_entrada: mv.entrada ? 'por_reparto' : '',
      casilla_salida: salClave,
      inventario_inicial: mv.ini ? 1 : 0,
      entrada: mv.entrada ? 1 : 0,
      salida: mv.sale ? 1 : 0,
      inventario_final: mv.fin ? 1 : 0
    })
  }
  const eHab = habeas.por_reparto || 0
  const sHab = (habeas.concede || 0) + (habeas.niega || 0) + (habeas.otras_salidas || 0)
  const validacionHab = validarCorte({
    filtrados: detalleHab.filter((d) => d.entrada),
    entradas: eHab,
    salidas: sHab,
    ini: habeas.inventario_inicial,
    fin: habeas.inventario_final,
    detalleEntradas: detalleHab.reduce((a, d) => a + (d.entrada || 0), 0),
    detalleSalidas: detalleHab.reduce((a, d) => a + (d.salida || 0), 0),
    cuadroInventario: true
  })

  const mapAud = {}
  for (const a of TIPOS_AUDIENCIA_SIERJU) {
    mapAud[a.clave] = {
      tipo: a.etiqueta,
      programadas: 0, realizadas: 0, suspendidas: 0, aplazadas: 0, canceladas: 0
    }
  }
  const detalleAud = []
  function clasificarEstadoAud(estado, texto) {
    const est = norm(estado) + ' ' + norm(texto)
    if (contiene(est, 'SUSPEND', 'VACACION', 'EXTENDIO', 'REPROGRAM')) return 'suspendidas'
    if (contiene(est, 'APLAZ', 'FRACAS', 'FALLAS TECNIC', 'FALLAS DE CONEX', 'NO COMPAREC')) return 'aplazadas'
    if (contiene(est, 'CANCEL', 'NO SE REALIZ')) return 'canceladas'
    return 'realizadas'
  }
  const CAMPOS_NOTA_AUD = [
    'fecha_acusacion', 'fecha_preparatoria', 'fecha_juicio', 'sentido_del_fallo',
    'fecha_preacuerdo', 'fecha_individualizacion_447', 'fecha_preclusion',
    'allanamiento', 'lectura_de_sentencia', 'observaciones_sentencia',
    'observacion', 'observaciones', 'infromes_audiencias', 'auto_de_pruebas'
  ]
  function claveInterna(v) {
    const s = String(v || '').trim()
    const m = s.match(/(\d{4})\D+(\d+)/)
    if (!m) return ''
    return m[1] + '-' + String(Number(m[2]))
  }
  function notaAudienciaEnFecha(row, fechaIso) {
    if (!row || !fechaIso) return ''
    const [y, m, d] = fechaIso.split('-')
    const D = String(Number(d))
    const M = String(Number(m))
    const vars = [fechaIso, `${d}/${m}/${y}`, `${D}/${M}/${y}`, `${d}/${m}/${y.slice(2)}`, `${D}/${M}/${y.slice(2)}`, `${D}/${m}/${y}`, `${d}/${M}/${y}`]
    for (const campo of CAMPOS_NOTA_AUD) {
      const txt = String(row[campo] || '')
      if (!txt.trim()) continue
      for (const line of txt.split(/\n|;/)) {
        if (!vars.some((v) => line.includes(v))) continue
        if (/APLAZ|SUSPEND|REPROGRAM|FRACAS|CANCEL|VACACION|EXTENDIO|FALLAS/i.test(line)) return line
      }
    }
    return ''
  }
  const procesosPorClave = {}
  for (const r of procesosTodos) {
    for (const v of [r.codigo_interno, r.radicado_interno, r.no]) {
      const k = claveInterna(v)
      if (!k) continue
      if (!procesosPorClave[k]) procesosPorClave[k] = []
      procesosPorClave[k].push(r)
    }
  }
  function procesoDeEvento(ev) {
    if (ev.registro_id) {
      const p = procesosTodos.find((x) => x.id === ev.registro_id)
      if (p) return p
    }
    const k = claveInterna(ev.proceso)
    const cands = k ? procesosPorClave[k] : []
    return (cands && cands[0]) || null
  }
  function contarAudiencia(texto, fecha, estado, meta) {
    if (!enPeriodo(fecha)) return
    const k = mapAudienciaTipo(texto)
    const f = mapAud[k]
    f.programadas++
    const casilla = clasificarEstadoAud(estado, texto)
    f[casilla]++
    detalleAud.push({
      id: (meta && meta.id) || '',
      radicado: (meta && meta.radicado) || '',
      tipo: f.tipo,
      fecha_ingreso: parseFecha(fecha) || '',
      fecha_salida: '',
      casilla_entrada: casilla,
      casilla_salida: '',
      entrada: 1,
      salida: 0,
      inventario_final: 0
    })
  }
  const fuenteAud = calendario.length ? calendario : procesos.map((r) => ({
    id: r.id,
    fecha: r.fecha_audiencia,
    tipo_audiencia: r.audiencia,
    titulo: r.audiencia,
    estado: r.observacion,
    notas: r.infromes_audiencias || '',
    registro_id: r.id,
    radicado: r.radicado || r.codigo_interno || '',
    proceso: r.codigo_interno || ''
  }))
  const filtradosAud = filtrarPorCampoFecha(fuenteAud, 'fecha', desde, hasta)
  for (const ev of filtradosAud) {
    const p = procesoDeEvento(ev)
    const notaProc = notaAudienciaEnFecha(p, parseFecha(ev.fecha) || ev.fecha)
    const textoEstado = [ev.estado, ev.notas, ev.titulo, notaProc].filter(Boolean).join(' ')
    contarAudiencia(ev.tipo_audiencia || ev.titulo, ev.fecha, textoEstado, {
      id: ev.id,
      radicado: ev.radicado || ev.proceso || ev.registro_id || ''
    })
  }
  const filasAud = TIPOS_AUDIENCIA_SIERJU.map((a) => mapAud[a.clave])
  const totAud = {
    tipo: 'Total',
    programadas: filasAud.reduce((a, x) => a + x.programadas, 0),
    realizadas: filasAud.reduce((a, x) => a + x.realizadas, 0),
    suspendidas: filasAud.reduce((a, x) => a + x.suspendidas, 0),
    aplazadas: filasAud.reduce((a, x) => a + x.aplazadas, 0),
    canceladas: filasAud.reduce((a, x) => a + x.canceladas, 0)
  }
  const validacionAud = validarConteo(filtradosAud, totAud.programadas, 'programadas')
  if (totAud.realizadas + totAud.suspendidas + totAud.aplazadas + totAud.canceladas !== totAud.programadas) {
    validacionAud.errores.push('Programadas distinto de realizadas + suspendidas + aplazadas + canceladas.')
    validacionAud.ok = false
  }

  const keysDes = ['ingreso', 'reingreso', 'sanciona', 'no_sanciona', 'otras_salidas']
  const keysDesE = ['ingreso', 'reingreso']
  const keysDesS = ['sanciona', 'no_sanciona', 'otras_salidas']
  const mapDes = construirMatriz(DERECHOS_TUTELA, keysDes)
  const detalleDes = []
  const filtradosDes = []
  for (const r of tutelas) {
    if (ingresoNoEfectivo(r)) continue
    if (claseTutela(r) !== 'desacato') continue
    const mv = movimiento(r.fecha_ingreso, fechaSalidaDesacato(r), desde, hasta)
    if (!tieneMovimientoPeriodo(mv)) continue
    filtradosDes.push(r)
    const tipo = derechoEstadisticaDe(r)
    const fila = mapDes[tipo] || mapDes.OTROS
    const ent = contiene(r.forma_de_ingreso, 'NULIDAD') ? 'reingreso' : 'ingreso'
    let salClave = ''
    if (mv.ini) fila.inventario_inicial++
    if (mv.entrada) fila[ent]++
    if (mv.sale) {
      if (contiene(r.sanciona, 'SI', 'X') || (marcado(r.sanciona) && !parseFecha(r.sanciona)) || contiene(r.observaciones, 'SANCIONA')) {
        fila.sanciona++
        salClave = 'sanciona'
      } else if (parseFecha(r.abstiene) || marcado(r.abstiene) || contiene(r.observaciones, 'ABSTIEN')) {
        fila.no_sanciona++
        salClave = 'no_sanciona'
      } else {
        fila.no_sanciona++
        salClave = 'no_sanciona'
      }
    }
    if (mv.fin) fila.inventario_final++
    detalleDes.push({
      id: r.id,
      radicado: r.radicado_interno_consecutivo_juzgado || '',
      tipo,
      fecha_ingreso: mv.ing || '',
      fecha_salida: mv.sal || '',
      casilla_entrada: mv.entrada ? ent : '',
      casilla_salida: salClave,
      inventario_inicial: mv.ini ? 1 : 0,
      entrada: mv.entrada ? 1 : 0,
      salida: mv.sale ? 1 : 0,
      inventario_final: mv.fin ? 1 : 0
    })
  }
  const filasDes = DERECHOS_TUTELA.map((t) => mapDes[t]).filter(filaTieneMovimiento)
  const totDes = sumarFilas(filasDes.length ? filasDes : DERECHOS_TUTELA.map((t) => mapDes[t]), keysDes)
  const eDes = keysDesE.reduce((a, k) => a + (totDes[k] || 0), 0)
  const sDes = keysDesS.reduce((a, k) => a + (totDes[k] || 0), 0)
  const validacionDes = validarCorte({
    filtrados: detalleDes.filter((d) => d.entrada),
    entradas: eDes,
    salidas: sDes,
    ini: totDes.inventario_inicial,
    fin: totDes.inventario_final,
    detalleEntradas: detalleDes.reduce((a, d) => a + (d.entrada || 0), 0),
    detalleSalidas: detalleDes.reduce((a, d) => a + (d.salida || 0), 0),
    cuadroInventario: true
  })

  const otros = {
    despachos_comisorios: { inicial: 0, recibidos: 0, evacuados: 0, final: 0 },
    disciplinarios: { inicial: 0, recibidos: 0, evacuados: 0, final: 0 }
  }
  const detalleDisc = []
  const filtradosDisc = []
  otros.disciplinarios = { inicial: 0, recibidos: 0, evacuados: 0, final: 0 }
  for (const r of disciplinarios) {
    const mv = movimiento(r.fecha_ingreso, fechaMasTemprana(r.archivo, r.fallo), desde, hasta)
    if (!tieneMovimientoPeriodo(mv)) continue
    filtradosDisc.push(r)
    if (mv.ini) otros.disciplinarios.inicial++
    if (mv.entrada) otros.disciplinarios.recibidos++
    if (mv.sale) otros.disciplinarios.evacuados++
    if (mv.fin) otros.disciplinarios.final++
    detalleDisc.push({
      id: r.id,
      radicado: r.radicado_interno_consecutivo_juzgado || '',
      tipo: 'PROCESOS DISCIPLINARIOS CONTRA FUNCIONARIOS O EMPLEADOS',
      fecha_ingreso: mv.ing || '',
      fecha_salida: mv.sal || '',
      casilla_entrada: mv.entrada ? 'recibidos' : '',
      casilla_salida: mv.sale ? 'evacuados' : '',
      inventario_inicial: mv.ini ? 1 : 0,
      entrada: mv.entrada ? 1 : 0,
      salida: mv.sale ? 1 : 0,
      inventario_final: mv.fin ? 1 : 0
    })
  }
  const validacionDisc = validarCorte({
    filtrados: detalleDisc.filter((d) => d.entrada),
    entradas: otros.disciplinarios.recibidos,
    salidas: otros.disciplinarios.evacuados,
    ini: otros.disciplinarios.inicial,
    fin: otros.disciplinarios.final,
    detalleEntradas: detalleDisc.reduce((a, d) => a + (d.entrada || 0), 0),
    detalleSalidas: detalleDisc.reduce((a, d) => a + (d.salida || 0), 0)
  })
  const filasOtros = [
    { tipo: 'DESPACHOS COMISORIOS', ...otros.despachos_comisorios },
    { tipo: 'PROCESOS DISCIPLINARIOS CONTRA FUNCIONARIOS O EMPLEADOS', ...otros.disciplinarios }
  ]

  const mapaProv = {
    ley600_autos: 'Ley 600 autos',
    ley600_sentencias: 'Ley 600 sentencias',
    ley906_autos: 'Ley 906 autos',
    ley906_sentencias: 'Ley 906 sentencias',
    tutelas_autos: 'Tutelas autos',
    tutelas_sentencias: 'Tutelas sentencias',
    desacato_autos: 'Desacato autos',
    habeas_autos: 'Hábeas autos',
    ejecucion_autos: 'Ejecución autos',
    disciplinarios_autos: 'Disciplinarios autos',
    disciplinarios_sentencias: 'Disciplinarios sentencias'
  }
  const providencias = {
    ley600_autos: 0, ley600_sentencias: 0,
    ley906_autos: 0, ley906_sentencias: 0,
    tutelas_autos: 0, tutelas_sentencias: 0,
    desacato_autos: 0, habeas_autos: 0,
    ejecucion_autos: 0,
    disciplinarios_autos: 0, disciplinarios_sentencias: 0
  }
  const detalleProv = []
  function fechaLimpia(valor) {
    const s = String(valor == null ? '' : valor).trim()
    if (!s) return null
    const f = parseFecha(s)
    if (!f) return null
    if (s === f || s === f.replace(/-/g, '/')) return f
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}$/.test(s)) return f
    return null
  }
  function esAutoPorObservacion(valor) {
    return contiene(valor, 'PRESCRIP', 'PRECLUS', 'IMPEDIMENT')
  }
  function pushProv(clave, r, fechaCampo, rad) {
    const f = fechaLimpia(r[fechaCampo])
    if (!f || !enPeriodo(f)) return false
    providencias[clave]++
    detalleProv.push({
      id: r.id,
      radicado: rad || '',
      tipo: mapaProv[clave],
      fecha_ingreso: f,
      fecha_salida: '',
      casilla_entrada: clave,
      casilla_salida: fechaCampo,
      entrada: 1,
      salida: 0,
      inventario_final: 0
    })
    return true
  }
  const ley600Todos = db.prepare('SELECT * FROM ley600').all()
  for (const r of ley600Todos) {
    const rad = r.radicado || ''
    const fSent = fechaLimpia(r.sentencia)
    if (fSent && enPeriodo(fSent)) {
      if (esAutoPorObservacion(r.observacion)) pushProv('ley600_autos', r, 'sentencia', rad)
      else pushProv('ley600_sentencias', r, 'sentencia', rad)
      continue
    }
    pushProv('ley600_autos', r, 'auto_sustanciacion', rad)
  }
  for (const r of procesosTodos) {
    const rad = r.radicado || r.no
    const fSent = fechaLimpia(r.fecha_de_sentencia_auto)
    if (!fSent || !enPeriodo(fSent)) continue
    if (esAutoPorObservacion(r.observaciones_sentencia)) pushProv('ley906_autos', r, 'fecha_de_sentencia_auto', rad)
    else pushProv('ley906_sentencias', r, 'fecha_de_sentencia_auto', rad)
  }
  for (const r of tutelas) {
    const rad = r.radicado_interno_consecutivo_juzgado || ''
    const cl = claseTutela(r)
    if (cl === 'desacato') {
      if (pushProv('desacato_autos', r, 'abstiene', rad)) continue
      if (pushProv('desacato_autos', r, 'archivo', rad)) continue
      pushProv('desacato_autos', r, 'sentencia', rad)
    } else if (cl === 'habeas') {
      if (pushProv('habeas_autos', r, 'archivo', rad)) continue
      pushProv('habeas_autos', r, 'sentencia', rad)
    } else if (pushProv('tutelas_sentencias', r, 'sentencia', rad)) {
      continue
    } else if (pushProv('tutelas_autos', r, 'inadmision', rad)) {
      continue
    } else {
      pushProv('tutelas_autos', r, 'admision', rad)
    }
  }
  for (const r of apelaciones) {
    const rad = r.spoa || r.codigo_interno
    if (pushProv('ejecucion_autos', r, 'fecha', rad)) continue
    pushProv('ejecucion_autos', r, 'cumplimiento', rad)
  }
  for (const r of disciplinarios) {
    const rad = r.radicado_interno_consecutivo_juzgado || ''
    const obs = [r.observaciones, r.archivo, r.fallo].join(' ')
    const fFallo = fechaLimpia(r.fallo)
    if (fFallo && enPeriodo(fFallo)) {
      if (esAutoPorObservacion(obs)) pushProv('disciplinarios_autos', r, 'fallo', rad)
      else pushProv('disciplinarios_sentencias', r, 'fallo', rad)
      continue
    }
    if (pushProv('disciplinarios_autos', r, 'archivo', rad)) continue
    pushProv('disciplinarios_autos', r, 'indagacion_preliminar_art_150', rad)
  }
  const nProv = Object.values(providencias).reduce((a, n) => a + n, 0)
  const validacionProv = validarConteo(detalleProv, nProv, 'providencias')

  const recursos = { impugnacion_tutelas: 0, consulta_desacato: 0, apelacion_906: 0 }
  const detalleRec = []
  function fechaRecursoTutela(r) {
    return fechaLimpia(r.se_va_a_impugnacion_o_consulta)
  }
  for (const r of tutelas) {
    const fRec = fechaRecursoTutela(r)
    if (!fRec || !enPeriodo(fRec)) continue
    const cl = claseTutela(r)
    if (cl === 'desacato') {
      recursos.consulta_desacato++
      detalleRec.push({
        id: r.id,
        radicado: r.radicado_interno_consecutivo_juzgado || '',
        tipo: 'consulta_desacato',
        fecha_ingreso: fRec,
        fecha_salida: '',
        casilla_entrada: 'consulta_desacato',
        casilla_salida: '',
        entrada: 1,
        salida: 0,
        inventario_final: 0
      })
    } else if (cl === 'tutela') {
      recursos.impugnacion_tutelas++
      detalleRec.push({
        id: r.id,
        radicado: r.radicado_interno_consecutivo_juzgado || '',
        tipo: 'impugnacion_tutelas',
        fecha_ingreso: fRec,
        fecha_salida: '',
        casilla_entrada: 'impugnacion_tutelas',
        casilla_salida: '',
        entrada: 1,
        salida: 0,
        inventario_final: 0
      })
    }
  }
  for (const r of procesos) {
    if ((contiene(r.tipo_salida, 'APEL') || contiene(r.otras_salidas, 'APEL')) && enPeriodo(r.fecha_remision)) {
      recursos.apelacion_906++
      detalleRec.push({
        id: r.id,
        radicado: r.radicado || r.no || '',
        tipo: 'apelacion_906',
        fecha_ingreso: parseFecha(r.fecha_remision) || '',
        fecha_salida: '',
        casilla_entrada: 'apelacion_906',
        casilla_salida: '',
        entrada: 1,
        salida: 0,
        inventario_final: 0
      })
    }
  }
  const nRec = recursos.impugnacion_tutelas + recursos.consulta_desacato + recursos.apelacion_906
  const validacionRec = validarConteo(detalleRec, nRec, 'recursos')

  const superiores = { confirman: 0, modifican: 0, revocan: 0, nulidad: 0 }
  const detalleSup = []
  function pushSup(clave, r, fechaIso, rad, campo) {
    if (!fechaIso || !enPeriodo(fechaIso)) return
    superiores[clave]++
    detalleSup.push({
      id: r.id,
      radicado: rad || '',
      tipo: clave,
      fecha_ingreso: fechaIso,
      fecha_salida: '',
      casilla_entrada: clave,
      casilla_salida: campo || '',
      entrada: 1,
      salida: 0,
      inventario_final: 0
    })
  }
  function textoActivo(valor) {
    const s = String(valor == null ? '' : valor).trim()
    if (!s) return false
    const n = norm(s)
    return n !== 'NO' && n !== 'N A' && n !== 'NA' && n !== 'N'
  }
  for (const r of tutelas) {
    const rad = r.radicado_interno_consecutivo_juzgado || ''
    const fDec = fechaLimpia(r.impugnacion_o_consulta)
    if (!fDec || !enPeriodo(fDec)) continue
    const txtRev = r.revoca_o_nulidad
    if (textoActivo(txtRev) && contiene(txtRev, 'NULIDAD')) pushSup('nulidad', r, fDec, rad, 'revoca_o_nulidad')
    else if (textoActivo(txtRev)) pushSup('revocan', r, fDec, rad, 'revoca_o_nulidad')
    else if (textoActivo(r.modifica)) pushSup('modifican', r, fDec, rad, 'modifica')
    else if (textoActivo(r.confirma)) pushSup('confirman', r, fDec, rad, 'confirma')
  }
  for (const r of procesos) {
    const rad = r.radicado || r.no || ''
    const fDev = fechaLimpia(r.devolucion)
    if (contiene(r.tipo_decision, 'CONFIRMA')) pushSup('confirman', r, fDev, rad, 'confirma')
    else if (contiene(r.tipo_decision, 'MODIFICA')) pushSup('modifican', r, fDev, rad, 'modifica')
    else if (contiene(r.tipo_decision, 'REVOCA')) pushSup('revocan', r, fDev, rad, 'revoca')
    else if (contiene(r.tipo_decision, 'NULIDAD')) pushSup('nulidad', r, fDev, rad, 'nulidad')
    else if (fDev && enPeriodo(fDev) && (contiene(r.confirma, 'CASACION') || contiene(r.juzgado, 'CASACION') || contiene(r.otras_salidas, 'CASACION') || contiene(r.tipo_salida, 'CASACION'))) {
      pushSup('confirman', r, fDev, rad, 'devolucion')
    }
  }
  const nSup = superiores.confirman + superiores.modifican + superiores.revocan + superiores.nulidad
  const validacionSup = validarConteo(detalleSup, nSup, 'decisiones de superiores')

  const detalleArch = []
  for (const r of procesos) {
    let campo = ''
    if (enPeriodo(r.fecha_de_archivo)) campo = 'fecha_de_archivo'
    else if (enPeriodo(r.fecha_remision) && contiene(r.juzgado, 'ARCHIV')) campo = 'fecha_remision'
    if (!campo) continue
    detalleArch.push({
      id: r.id,
      radicado: r.radicado || r.no || '',
      tipo: 'archivado',
      fecha_ingreso: parseFecha(r[campo]) || '',
      fecha_salida: parseFecha(r[campo]) || '',
      casilla_entrada: campo,
      casilla_salida: '',
      entrada: 1,
      salida: 0,
      inventario_final: 0
    })
  }
  const archivados = detalleArch.length
  const validacionArch = validarConteo(detalleArch, archivados, 'archivados')

  const tiposEjec = {}
  const detalleEjec = []
  const filtradosEjec = []
  for (const r of apelaciones) {
    const mv = movimiento(r.fecha_ingreso, fechaMasTemprana(r.devolucion_expediente, r.fecha), desde, hasta)
    if (!tieneMovimientoPeriodo(mv)) continue
    filtradosEjec.push(r)
    const tipo = String(r.auto_apelado || r.delito_estadistica || 'OTRAS PETICIONES').slice(0, 80) || 'OTRAS PETICIONES'
    if (!tiposEjec[tipo]) tiposEjec[tipo] = { tipo, inventario_inicial: 0, entradas: 0, salidas: 0, inventario_final: 0 }
    const f = tiposEjec[tipo]
    if (mv.ini) f.inventario_inicial++
    if (mv.entrada) f.entradas++
    if (mv.sale) f.salidas++
    if (mv.fin) f.inventario_final++
    detalleEjec.push({
      id: r.id,
      radicado: r.spoa || r.codigo_interno || '',
      tipo,
      fecha_ingreso: mv.ing || '',
      fecha_salida: mv.sal || '',
      casilla_entrada: mv.entrada ? 'entradas' : '',
      casilla_salida: mv.sale ? 'salidas' : '',
      inventario_inicial: mv.ini ? 1 : 0,
      entrada: mv.entrada ? 1 : 0,
      salida: mv.sale ? 1 : 0,
      inventario_final: mv.fin ? 1 : 0
    })
  }
  const ejecucion = Object.keys(tiposEjec).sort().map((k) => tiposEjec[k])
  const totEjec = {
    tipo: 'Total',
    inventario_inicial: ejecucion.reduce((a, f) => a + (f.inventario_inicial || 0), 0),
    entradas: ejecucion.reduce((a, f) => a + (f.entradas || 0), 0),
    salidas: ejecucion.reduce((a, f) => a + (f.salidas || 0), 0),
    inventario_final: ejecucion.reduce((a, f) => a + (f.inventario_final || 0), 0)
  }
  const validacionEjec = validarCorte({
    filtrados: detalleEjec.filter((d) => d.entrada),
    entradas: totEjec.entradas,
    salidas: totEjec.salidas,
    ini: totEjec.inventario_inicial,
    fin: totEjec.inventario_final,
    detalleEntradas: detalleEjec.reduce((a, d) => a + (d.entrada || 0), 0),
    detalleSalidas: detalleEjec.reduce((a, d) => a + (d.salida || 0), 0)
  })

  function contarIngreso(rows, campo) {
    return filtrarPorCampoFecha(rows, campo, desde, hasta).length
  }
  const totCon = conocimiento.total
  const eProc = keysE.reduce((a, k) => a + (totCon[k] || 0), 0)
  const sProc = keysS.reduce((a, k) => a + (totCon[k] || 0), 0)
  const nProcRango = conocimiento.registros_filtrados
  const nTutelasHoja = contarIngreso(tutelas, 'fecha_ingreso')
  const nTutelasNoEfectivos = contarIngreso(tutelas.filter((r) => ingresoNoEfectivo(r)), 'fecha_ingreso')
  const nApe = contarIngreso(apelaciones, 'fecha_ingreso')
  const nDisc = contarIngreso(disciplinarios, 'fecha_ingreso')
  const validaciones = [
    conocimiento.validacion,
    validacionTut,
    validacionHab,
    validacionAud,
    validacionDes,
    validacionDisc,
    validacionProv,
    validacionRec,
    validacionSup,
    validacionArch,
    validacionEjec
  ]
  const validacionGlobal = {
    ok: validaciones.every((v) => !v || v.ok),
    errores: validaciones.flatMap((v) => (v && v.errores) || [])
  }
  const cruce = {
    procesos: {
      juzgado: 'PRIMERO',
      universo_primero: procesos.length,
      completo_ingreso: eProc,
      estadistica_entradas: eProc,
      inventario_inicial: totCon.inventario_inicial,
      salidas: sProc,
      inventario_final: totCon.inventario_final,
      igual: totCon.inventario_inicial + eProc - sProc === totCon.inventario_final && (!conocimiento.validacion || conocimiento.validacion.ok)
    },
    tutelas_hoja: {
      completo_ingreso: nTutelasHoja,
      no_efectivos: nTutelasNoEfectivos,
      tutelas: eTut,
      desacato: eDes,
      habeas: eHab,
      suma: eTut + eDes + eHab,
      igual: nTutelasHoja === eTut + eDes + eHab + nTutelasNoEfectivos && validacionTut.ok && validacionDes.ok && validacionHab.ok
    },
    apelaciones: {
      completo_ingreso: nApe,
      estadistica_entradas: totEjec.entradas,
      igual: nApe === totEjec.entradas && validacionEjec.ok
    },
    disciplinarios: {
      completo_ingreso: nDisc,
      estadistica_recibidos: otros.disciplinarios.recibidos,
      igual: nDisc === otros.disciplinarios.recibidos && validacionDisc.ok
    }
  }

  return {
    nombre: 'Reporte Estadística SIERJU',
    fuente: 'Inventario definitivo 18-09-26 · Formulario SIERJU Ley 600 y 906 V.5',
    despacho: '528353107001 - JUZGADO 001 PENAL DEL CIRCUITO ESPECIALIZADO DE TUMACO',
    desde: desde || '',
    hasta: hasta || '',
    campo_fecha: 'fecha_ingreso',
    etiqueta_fecha: 'FECHA INGRESO',
    validacion: validacionGlobal,
    cruce,
    secciones: [
      {
        id: 'conocimiento_906',
        titulo: 'Primera instancia conocimiento Ley 906',
        descripcion: 'Solo JUZGADO = PRIMERO. Filas = DELITO ESTADISTICA. Inventario = expedientes de este despacho (abiertos al corte, aunque no tengan fecha de salida). I + E − S = F.',
        tipo: 'matriz',
        datos: conocimiento
      },
      {
        id: 'tutelas',
        titulo: 'Movimiento de Tutelas',
        descripcion: 'Filas = derecho estadística del inventario. Inventario inicial = tutelas abiertas al corte con fecha de salida conocida (no se arrastra stock fantasma). I + E − S = F.',
        tipo: 'tutelas',
        campo_fecha: 'fecha_ingreso',
        etiqueta_fecha: 'FECHA INGRESO',
        registros_filtrados: filtradosTut.length,
        filas: filasTut,
        total: totTut,
        detalle: detalleTut,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionTut
      },
      {
        id: 'habeas',
        titulo: 'Primera instancia acciones constitucionales',
        descripcion: 'Hábeas corpus del período. Inventario inicial = abiertos al corte con fecha de salida conocida. I + E − S = F.',
        tipo: 'simple',
        campo_fecha: 'fecha_ingreso',
        etiqueta_fecha: 'FECHA INGRESO',
        registros_filtrados: filtradosHab.length,
        filas: [habeas],
        detalle: detalleHab,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionHab
      },
      {
        id: 'audiencias',
        titulo: 'Control de audiencias durante el período - Ley 906',
        descripcion: 'Solo audiencias del calendario con FECHA en el rango. No se suman fechas de proceso para no duplicar.',
        tipo: 'audiencias',
        campo_fecha: 'fecha',
        etiqueta_fecha: 'FECHA AUDIENCIA',
        registros_filtrados: filtradosAud.length,
        filas: filasAud.filter((f) => f.programadas),
        total: totAud,
        detalle: detalleAud,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionAud
      },
      {
        id: 'desacato',
        titulo: 'Incidentes de desacato',
        descripcion: 'Incidentes del período. Inventario inicial = abiertos al corte con fecha de salida conocida. I + E − S = F.',
        tipo: 'desacato',
        campo_fecha: 'fecha_ingreso',
        etiqueta_fecha: 'FECHA INGRESO',
        registros_filtrados: filtradosDes.length,
        filas: filasDes,
        total: totDes,
        detalle: detalleDes,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionDes
      },
      {
        id: 'otros',
        titulo: 'Otros asuntos del circuito',
        descripcion: 'Disciplinarios del período. Inventario inicial = abiertos al corte con fecha de salida conocida. Despachos comisorios: no hay tabla fuente.',
        tipo: 'otros',
        campo_fecha: 'fecha_ingreso',
        etiqueta_fecha: 'FECHA INGRESO',
        registros_filtrados: filtradosDisc.length,
        filas: filasOtros.filter(filaTieneMovimiento),
        detalle: detalleDisc,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionDisc
      },
      {
        id: 'providencias',
        titulo: 'Total de providencias dictadas en el período',
        descripcion: 'Fecha BD (FECHA DE SENTENCIA - AUTO). Tipo BF: prescripción, preclusión o impedimento = auto; el resto = sentencia. Incluye fallos enviados al Centro de Servicios.',
        tipo: 'providencias',
        campo_fecha: 'fecha del acto',
        etiqueta_fecha: 'FECHA DEL ACTO',
        registros_filtrados: detalleProv.length,
        datos: providencias,
        detalle: detalleProv,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionProv
      },
      {
        id: 'recursos',
        titulo: 'Recursos interpuestos contra providencias',
        descripcion: 'Impugnaciones, consultas y apelaciones con fecha del recurso en el rango.',
        tipo: 'recursos',
        campo_fecha: 'fecha del recurso',
        etiqueta_fecha: 'FECHA DEL RECURSO',
        registros_filtrados: detalleRec.length,
        datos: recursos,
        detalle: detalleRec,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionRec
      },
      {
        id: 'superiores',
        titulo: 'Recursos decididos por superiores',
        descripcion: 'Confirmaciones, modificaciones, revocatorias o nulidad con fecha de la decisión en el rango.',
        tipo: 'superiores',
        campo_fecha: 'fecha de la decisión',
        etiqueta_fecha: 'FECHA DECISIÓN',
        registros_filtrados: detalleSup.length,
        datos: superiores,
        detalle: detalleSup,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionSup
      },
      {
        id: 'archivados',
        titulo: 'Procesos archivados definitivamente',
        descripcion: 'Solo procesos con FECHA DE ARCHIVO (o remisión a archivo) en el rango.',
        tipo: 'archivados',
        campo_fecha: 'fecha_de_archivo',
        etiqueta_fecha: 'FECHA DE ARCHIVO',
        registros_filtrados: archivados,
        total: archivados,
        detalle: detalleArch,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionArch
      },
      {
        id: 'ejecucion',
        titulo: 'Segunda instancia ejecución de penas',
        descripcion: 'Apelaciones del período. Inventario inicial = abiertos al corte con fecha de salida conocida. I + E − S = F.',
        tipo: 'ejecucion',
        campo_fecha: 'fecha_ingreso',
        etiqueta_fecha: 'FECHA INGRESO',
        registros_filtrados: filtradosEjec.length,
        filas: ejecucion,
        total: totEjec,
        detalle: detalleEjec,
        columnas_detalle: COLS_DETALLE_INGRESO,
        validacion: validacionEjec
      }
    ]
  }
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function csvDeCompleto(reporte) {
  const partes = []
  const sep = ';'
  for (const b of reporte.bloques) {
    partes.push('# ' + b.titulo)
    partes.push(b.columnas.map((c) => celdaCsv(c.etiqueta, null)).join(sep))
    for (const r of b.registros) {
      partes.push(b.columnas.map((c) => celdaCsv(r[c.nombre], c)).join(sep))
    }
    partes.push('')
  }
  return partes.join('\r\n')
}

function csvDeEstadistica(reporte) {
  const sep = ';'
  const lineas = [
    '# ' + reporte.nombre,
    '# ' + reporte.despacho,
    '# Período ' + (reporte.desde || '') + ' a ' + (reporte.hasta || ''),
    ''
  ]
  for (const s of reporte.secciones) {
    lineas.push('# ' + s.titulo)
    if (s.tipo === 'matriz') {
      const colsDef = s.datos.columnas || [
        ...s.datos.columnas_entrada,
        ...s.datos.columnas_salida
      ]
      const colsPost = s.datos.columnas_post || []
      const headers = [
        'TIPO PROCESO',
        'INVENTARIO INICIAL',
        ...colsDef.map((c) => c.etiqueta),
        'INVENTARIO FINAL',
        ...colsPost.map((c) => c.etiqueta)
      ]
      lineas.push(headers.map((h) => celdaCsv(h, null)).join(sep))
      for (const f of [...s.datos.filas, s.datos.total]) {
        const vals = [
          f.tipo,
          f.inventario_inicial,
          ...colsDef.map((c) => f[c.clave] || 0),
          f.inventario_final,
          ...colsPost.map((c) => f[c.clave] || 0)
        ]
        lineas.push(vals.map((v) => celdaCsv(v, null)).join(sep))
      }
    } else if (s.filas && s.filas.length) {
      const keys = Object.keys(s.filas[0] || { tipo: '' })
      lineas.push(keys.map((k) => celdaCsv(k, null)).join(sep))
      for (const f of s.filas) lineas.push(keys.map((k) => celdaCsv(f[k], null)).join(sep))
      if (s.total) lineas.push(keys.map((k) => celdaCsv(s.total[k], null)).join(sep))
    } else if (s.datos) {
      lineas.push(['indicador', 'valor'].map((h) => celdaCsv(h, null)).join(sep))
      for (const [k, v] of Object.entries(s.datos)) {
        lineas.push([k, v].map((x) => celdaCsv(x, null)).join(sep))
      }
    } else if (s.total != null) {
      lineas.push(['total', s.total].map((x) => celdaCsv(x, null)).join(sep))
    }
    lineas.push('')
  }
  return lineas.join('\r\n')
}

module.exports = {
  DELITOS_SIERJU,
  reporteCompleto,
  reporteEstadistica,
  csvDeCompleto,
  csvDeEstadistica,
  csvDeTabla,
  csvDeConsulta,
  mapDelito,
  mapAudienciaTipo
}
