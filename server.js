'use strict'

const fs = require('fs')
const path = require('path')
const express = require('express')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const { openDb, getEsquema, loadEsquema, saveEsquema, columnasDe, tablasValidas, rowToObj, DB_PATH } = require('./lib/db')
const { parseFecha, hoyISO, addDays } = require('./lib/dates')
const { reporteCompleto, reporteEstadistica, csvDeCompleto, csvDeEstadistica, csvDeTabla } = require('./lib/reportes')
const { extraerFiltros, filtrarRegistros, columnasFecha, campoFechaEfectivo, normalizarRango } = require('./lib/busqueda')
const { csvDeConsulta, aplicarAudiencia, columnasConsultaVista } = require('./lib/csv')
const { construirDocumento, normalizarTipo } = require('./lib/ordenVerbal')
const constancia = require('./lib/constancia')
const acusacion = require('./lib/acusacion')
const preparatoria = require('./lib/preparatoria')
const autoPruebas = require('./lib/autoPruebas')
const juicioOral = require('./lib/juicioOral')
const sentidoFallo = require('./lib/sentidoFallo')
const individualizacionPena = require('./lib/individualizacionPena')
const lecturaSentencia = require('./lib/lecturaSentencia')
const preacuerdo = require('./lib/preacuerdo')
const solicitudPreclusion = require('./lib/solicitudPreclusion')
const solicitudDefensor = require('./lib/solicitudDefensor')
const fijarFecha = require('./lib/fijarFecha')
const { validarClaveSegura, mensajeError } = require('./lib/password')
const auditoria = require('./lib/auditoria')
const backups = require('./lib/backups')
const programador = require('./lib/programador')
const mailer = require('./lib/mailer')
const exportadores = require('./lib/exportadores')

const PORT = Number(process.env.PORT || 3000)
const app = express()
const db = openDb()
auditoria.init(db)
backups.asegurarDirectorios()

const estadisticaCache = new Map()
const ESTADISTICA_TTL_MS = 60 * 1000
let inicioCache = null
let inicioCacheAt = 0
const INICIO_TTL_MS = 30 * 1000

function invalidarCaches() {
  estadisticaCache.clear()
  inicioCache = null
  inicioCacheAt = 0
}

function claveEstadistica(q) {
  const o = q || {}
  return [o.desde || '', o.hasta || '', o.fecha_campo || o.campo_fecha || ''].join('|')
}

app.set('trust proxy', 1)
app.use(express.json({ limit: '40mb' }))
app.use(express.urlencoded({ extended: false, limit: '2mb' }))
app.use(session({
  name: 'juzgado.sid',
  secret: process.env.SESSION_SECRET || 'juzgado-tumaco-gestor-2026',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: 'auto',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000
  }
}))
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: 0,
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    }
  }
}))
app.use(auditoria.middlewareAuto())

function usuarioSesion(req) {
  if (!req.session.userId) return null
  return db.prepare('SELECT id, nombre_completo AS nombre, username, rol, activo FROM usuarios WHERE id = ?').get(req.session.userId)
}

function requireAuth(req, res, next) {
  const u = usuarioSesion(req)
  if (!u || !u.activo) return res.status(401).json({ error: 'No autenticado. Debe iniciar sesión.' })
  req.usuario = u
  next()
}

function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permiso para esta acción.' })
    }
    next()
  }
}

function validarTabla(nombre) {
  return tablasValidas().includes(nombre)
}

function opcionesOficio(query) {
  const q = query || {}
  return {
    no_acta: q.no_acta,
    resultado: q.resultado,
    realizado: q.realizado,
    prox_audiencia: q.prox_audiencia,
    prox_fecha: q.prox_fecha,
    prox_hora: q.prox_hora
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, nombre: 'GESTOR DE INFORMACIÓN JUZGADO PRIMERO PENAL DEL CIRCUITO ESPECIALIZADO DE TUMACO' })
})

app.post('/api/login', (req, res) => {
  const b = req.body || {}
  const username = String(b.username || b.usuario || b.user || '').trim()
  const password = String(b.password || b.clave || b.pass || '')
  const fallar = (motivo) => {
    auditoria.registrar({
      req,
      accion: 'login',
      modulo: 'autenticacion',
      exito: false,
      usuario_nombre: username || 'anonimo',
      descripcion: `Intento de inicio de sesión fallido para "${username || '(vacío)'}".`,
      error: motivo
    })
    res.locals.auditado = true
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
  }
  if (!username || !password) return fallar('Credenciales incompletas')
  const u = db.prepare('SELECT * FROM usuarios WHERE lower(username) = lower(?)').get(username)
  if (!u || !u.activo) return fallar('Usuario inexistente o inactivo')
  if (!bcrypt.compareSync(password, u.password_hash)) return fallar('Contraseña incorrecta')
  req.session.userId = u.id
  req.session.save((err) => {
    if (err) {
      auditoria.registrar({
        req, accion: 'login', modulo: 'autenticacion', exito: false,
        usuario_nombre: username, descripcion: 'Error al guardar la sesión.', error: err.message
      })
      res.locals.auditado = true
      return res.status(500).json({ error: 'No se pudo iniciar sesión.' })
    }
    req.usuario = u
    auditoria.registrar({
      req, accion: 'login', modulo: 'autenticacion',
      descripcion: `Inicio de sesión exitoso de "${u.username}".`
    })
    res.locals.auditado = true
    res.json({ id: u.id, nombre: u.nombre_completo, username: u.username, rol: u.rol })
  })
})

app.post('/api/logout', (req, res) => {
  const u = usuarioSesion(req)
  req.session.destroy(() => {
    if (u) {
      auditoria.registrar({
        req, usuario: u, accion: 'logout', modulo: 'autenticacion',
        descripcion: `Cierre de sesión de "${u.username}".`
      })
    }
    res.locals.auditado = true
    res.json({ ok: true })
  })
})

app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.usuario)
})

function datosPersonalesUsuario(u) {
  const row = u || {}
  return {
    username: row.username || '',
    nombre: row.nombre || row.nombre_completo || '',
    nombre_completo: row.nombre_completo || row.nombre || ''
  }
}

function claveYaUsada(usuarioId, password, hashActual) {
  if (hashActual && bcrypt.compareSync(password, hashActual)) return true
  const prev = db.prepare('SELECT password_hash FROM password_historial WHERE usuario_id = ?').all(usuarioId)
  return prev.some((h) => bcrypt.compareSync(password, h.password_hash))
}

function guardarNuevaClave(usuarioId, hashAnterior, password) {
  const hash = bcrypt.hashSync(password, 10)
  const tx = db.transaction(() => {
    if (hashAnterior) {
      db.prepare('INSERT INTO password_historial (usuario_id, password_hash) VALUES (?, ?)').run(usuarioId, hashAnterior)
    }
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, usuarioId)
  })
  tx()
}

app.put('/api/me/password', requireAuth, (req, res) => {
  const b = req.body || {}
  const actual = String(b.actual || b.password_actual || '')
  const nueva = String(b.nueva || b.password || '')
  const confirmar = String(b.confirmar || b.password_confirm || nueva)
  if (nueva !== confirmar) return res.status(400).json({ error: 'La confirmación no coincide con la nueva contraseña.' })
  const u = db.prepare('SELECT id, username, nombre_completo, password_hash FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!u || !bcrypt.compareSync(actual, u.password_hash)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' })
  }
  const chequeo = validarClaveSegura(nueva, datosPersonalesUsuario(u))
  if (!chequeo.ok) return res.status(400).json({ error: mensajeError(chequeo), requisitos: chequeo.requisitos })
  if (claveYaUsada(u.id, nueva, u.password_hash)) {
    return res.status(400).json({ error: 'No se permite reutilizar claves anteriores.' })
  }
  guardarNuevaClave(u.id, u.password_hash, nueva)
  auditoria.registrar({
    req,
    accion: 'cambio_clave',
    modulo: 'seguridad',
    registro_id: u.id,
    descripcion: `El usuario "${u.username}" cambió su propia contraseña.`
  })
  res.locals.auditado = true
  res.json({ ok: true })
})

app.get('/api/tablas', requireAuth, (_req, res) => {
  res.json(getEsquema())
})

app.get('/api/tabla/:tabla', requireAuth, (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const conf = getEsquema()[tabla]
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 15))
  const q = String(req.query.q || '').trim()
  const desde = String(req.query.desde || '').trim()
  const hasta = String(req.query.hasta || '').trim()
  const fechaCampo = campoFechaEfectivo(conf, req.query.fecha_campo || req.query.campo_fecha)
  const filtros = extraerFiltros(req.query, conf)
  const rows = db.prepare(`SELECT * FROM ${tabla}`).all()
  const filtrado = filtrarRegistros(rows, conf, { desde, hasta, fechaCampo, q, filtros })
  filtrado.resultados.sort((a, b) => (b.row.id || 0) - (a.row.id || 0))
  const total = filtrado.resultados.length
  const slice = filtrado.resultados.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  const registros = slice.map((x) => {
    const o = rowToObj(x.row)
    o._motivos = x.motivos
    return o
  })
  res.json({
    registros,
    total,
    page,
    perPage,
    tabla,
    criterios: filtrado.criterios,
    rango: filtrado.rango,
    campo_fecha: filtrado.campoFecha,
    columnas_fecha: columnasFecha(conf).map((c) => ({ nombre: c.nombre, etiqueta: c.etiqueta })),
    mensaje_vacio: total === 0 && filtrado.criterios.length
      ? 'No se encontraron resultados para los criterios seleccionados'
      : null
  })
})

app.get('/api/tabla/:tabla/:id', requireAuth, (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const r = db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(Number(req.params.id))
  if (!r) return res.status(404).json({ error: 'Registro no encontrado.' })
  res.json(rowToObj(r))
})

app.post('/api/tabla/:tabla', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const cols = columnasDe(tabla)
  const body = req.body || {}
  const used = cols.filter((c) => body[c] != null)
  const sql = `INSERT INTO ${tabla} (${used.join(',')}) VALUES (${used.map(() => '?').join(',')})`
  const info = db.prepare(sql).run(...used.map((c) => body[c]))
  invalidarCaches()
  res.json({ id: info.lastInsertRowid })
})

app.put('/api/tabla/:tabla/:id', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const cols = columnasDe(tabla)
  const body = req.body || {}
  const used = cols.filter((c) => Object.prototype.hasOwnProperty.call(body, c))
  if (!used.length) return res.status(400).json({ error: 'Sin campos para actualizar.' })
  const sql = `UPDATE ${tabla} SET ${used.map((c) => c + ' = ?').join(', ')} WHERE id = ?`
  db.prepare(sql).run(...used.map((c) => body[c]), Number(req.params.id))
  invalidarCaches()
  res.json({ ok: true })
})

app.delete('/api/tabla/:tabla/:id', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  db.prepare(`DELETE FROM ${tabla} WHERE id = ?`).run(Number(req.params.id))
  invalidarCaches()
  res.json({ ok: true })
})

app.get('/api/reportes/:tabla', requireAuth, (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const conf = getEsquema()[tabla]
  const rango = normalizarRango(req.query.desde || '', req.query.hasta || '')
  const rows = db.prepare(`SELECT * FROM ${tabla}`).all()
  const total = rows.length
  const fe = conf.fecha_entrada
  const fs = conf.fecha_salida
  let ingresados = 0
  let salidos = 0
  for (const r of rows) {
    if (fe && (!rango.desde && !rango.hasta ? parseFecha(r[fe]) : enRangoFecha(r[fe], rango))) ingresados++
    if (fs && (!rango.desde && !rango.hasta ? parseFecha(r[fs]) : enRangoFecha(r[fs], rango))) salidos++
  }
  const porCampo = {}
  if (tabla === 'procesos') {
    const cont = {}
    for (const r of rows) {
      const v = r.juzgado || ''
      if (!v) continue
      cont[v] = (cont[v] || 0) + 1
    }
    porCampo.juzgado = Object.entries(cont).map(([valor, t]) => ({ valor, total: t })).sort((a, b) => b.total - a.total)
  }
  if (tabla === 'tutelas') {
    const cont = {}
    for (const r of rows) {
      const v = r.tutela || ''
      if (!v) continue
      cont[v] = (cont[v] || 0) + 1
    }
    porCampo.tutela = Object.entries(cont).map(([valor, t]) => ({ valor, total: t })).sort((a, b) => b.total - a.total)
  }
  res.json({
    tabla, titulo: conf.titulo, total, ingresados, salidos,
    desde: rango.desde, hasta: rango.hasta, porCampo,
    fuente: 'Inventario definitivo 18-09-26'
  })
})

function enRangoFecha(valor, rango) {
  const f = parseFecha(valor)
  if (!f) return false
  if (rango.desde && f < rango.desde) return false
  if (rango.hasta && f > rango.hasta) return false
  return true
}

function mapaAudienciasCalendario(tabla) {
  const rows = db.prepare(`
    SELECT registro_id, fecha, hora, tipo_audiencia, titulo
    FROM calendario
    WHERE modulo = ? AND registro_id IS NOT NULL
    ORDER BY fecha DESC, id DESC
  `).all(tabla)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.registro_id)) map.set(r.registro_id, r)
  }
  return map
}

function filasConAudiencia(tabla, rows) {
  const cal = mapaAudienciasCalendario(tabla)
  return rows.map((r) => aplicarAudiencia(rowToObj(r), cal.get(r.id)))
}

app.get('/api/reportes/:tabla/procesos', requireAuth, (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const conf = getEsquema()[tabla]
  const tipo = req.query.tipo || 'campo'
  let fechaCampo = req.query.fecha_campo || req.query.campo_fecha || ''
  if (!fechaCampo) {
    if (tipo === 'salidos') fechaCampo = conf.fecha_salida || conf.fecha_entrada
    else fechaCampo = conf.fecha_entrada
  }
  fechaCampo = campoFechaEfectivo(conf, fechaCampo)
  const rows = db.prepare(`SELECT * FROM ${tabla}`).all()
  const rango = normalizarRango(req.query.desde || '', req.query.hasta || '')
  const filtrado = filtrarRegistros(rows, conf, {
    desde: rango.desde,
    hasta: rango.hasta,
    fechaCampo,
    q: String(req.query.q || '').trim(),
    filtros: extraerFiltros(req.query, conf)
  })
  const fe = conf.fecha_entrada
  const fs = conf.fecha_salida
  let ingresados = 0
  let salidos = 0
  for (const r of rows) {
    if (fe && enRangoFecha(r[fe], rango)) ingresados++
    if (fs && enRangoFecha(r[fs], rango)) salidos++
  }
  const colFecha = (conf.columnas || []).find((c) => c.nombre === fechaCampo)
  const registros = filasConAudiencia(tabla, filtrado.resultados.map((x) => x.row))
  res.json({
    registros,
    columnas: columnasConsultaVista(conf),
    total: filtrado.resultados.length,
    ingresados,
    salidos,
    campo_fecha: fechaCampo,
    etiqueta_fecha: (colFecha && colFecha.etiqueta) || fechaCampo,
    rango: filtrado.rango,
    criterios: filtrado.criterios,
    fuente: 'Inventario definitivo 18-09-26'
  })
})

app.get('/api/reportes/:tabla/export', requireAuth, (req, res) => {
  const tabla = req.params.tabla
  if (!validarTabla(tabla)) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const conf = getEsquema()[tabla]
  const todos = String(req.query.todos || '') === 'true'
  let rows = db.prepare(`SELECT * FROM ${tabla}`).all()
  if (!todos) {
    const tipo = req.query.tipo || 'campo'
    let fechaCampo = req.query.fecha_campo || req.query.campo_fecha || ''
    if (!fechaCampo) {
      if (tipo === 'salidos') fechaCampo = conf.fecha_salida || conf.fecha_entrada
      else fechaCampo = conf.fecha_entrada
    }
    const rango = normalizarRango(req.query.desde || '', req.query.hasta || '')
    const filtrado = filtrarRegistros(rows, conf, {
      desde: rango.desde,
      hasta: rango.hasta,
      fechaCampo,
      q: String(req.query.q || '').trim(),
      filtros: extraerFiltros(req.query, conf)
    })
    rows = filasConAudiencia(tabla, filtrado.resultados.map((x) => x.row))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${tabla}-consulta.csv"`)
    return res.send('\uFEFF' + csvDeConsulta(conf, rows, tabla))
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${tabla}.csv"`)
  res.send('\uFEFF' + csvDeTabla(conf, rows, tabla))
})

app.get('/api/ia/completo', requireAuth, (req, res) => {
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 50))
  const data = reporteCompleto(db, getEsquema(), {
    desde: req.query.desde || '',
    hasta: req.query.hasta || '',
    modulo: req.query.modulo || '',
    fechaCampo: req.query.fecha_campo || req.query.campo_fecha || '',
    limite
  })
  res.json(data)
})

app.get('/api/ia/completo.csv', requireAuth, (req, res) => {
  const data = reporteCompleto(db, getEsquema(), {
    desde: req.query.desde || '',
    hasta: req.query.hasta || '',
    modulo: req.query.modulo || '',
    fechaCampo: req.query.fecha_campo || req.query.campo_fecha || ''
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-completo.csv"')
  res.send('\uFEFF' + csvDeCompleto(data))
})

app.get('/api/inicio', requireAuth, (_req, res) => {
  const ahora = Date.now()
  if (inicioCache && ahora - inicioCacheAt < INICIO_TTL_MS) return res.json(inicioCache)
  const esquema = getEsquema()
  const hoy = hoyISO()
  const resumen = []
  for (const tabla of Object.keys(esquema)) {
    const conf = esquema[tabla]
    const rows = db.prepare(`SELECT * FROM ${tabla}`).all()
    const fe = conf.fecha_entrada
    const fs = conf.fecha_salida
    let ingresados = 0
    let salidos = 0
    let hoyIn = 0
    let hoyOut = 0
    if (fe || fs) {
      for (const r of rows) {
        const fi = fe ? parseFecha(r[fe]) : null
        const fo = fs ? parseFecha(r[fs]) : null
        if (fi) ingresados++
        if (fo) salidos++
        if (fi === hoy) hoyIn++
        if (fo === hoy) hoyOut++
      }
    }
    resumen.push({
      tabla,
      titulo: conf.titulo,
      total: rows.length,
      ingresados,
      salidos,
      hoy_ingresados: hoyIn,
      hoy_salidos: hoyOut,
      fecha_entrada: fe || null
    })
  }
  const data = { resumen, hoy, fuente: 'Inventario definitivo 18-09-26' }
  inicioCache = data
  inicioCacheAt = ahora
  res.json(data)
})

app.get('/api/ia/estadistica', requireAuth, (req, res) => {
  const clave = claveEstadistica(req.query)
  const hit = estadisticaCache.get(clave)
  if (hit && Date.now() - hit.at < ESTADISTICA_TTL_MS) return res.json(hit.data)
  const data = reporteEstadistica(db, {
    desde: req.query.desde || '',
    hasta: req.query.hasta || '',
    fechaCampo: req.query.fecha_campo || req.query.campo_fecha || ''
  })
  estadisticaCache.set(clave, { at: Date.now(), data })
  res.json(data)
})

app.get('/api/ia/estadistica.csv', requireAuth, (req, res) => {
  const data = reporteEstadistica(db, {
    desde: req.query.desde || '',
    hasta: req.query.hasta || '',
    fechaCampo: req.query.fecha_campo || req.query.campo_fecha || ''
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-estadistica.csv"')
  res.send('\uFEFF' + csvDeEstadistica(data))
})

app.get('/api/orden-verbal/buscar', requireAuth, (req, res) => {
  const conf = getEsquema().procesos
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 12))
  const q = String(req.query.q || '').trim()
  const rows = db.prepare('SELECT * FROM procesos').all()
  const filtrado = filtrarRegistros(rows, conf, {
    desde: '',
    hasta: '',
    fechaCampo: '',
    q,
    filtros: extraerFiltros(req.query, conf)
  })
  filtrado.resultados.sort((a, b) => (b.row.id || 0) - (a.row.id || 0))
  const total = filtrado.resultados.length
  const slice = filtrado.resultados.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  res.json({
    total,
    page,
    perPage,
    criterios: filtrado.criterios,
    registros: slice.map((x) => {
      const r = x.row
      return {
        id: r.id,
        no_orden_verbal: r.no_orden_verbal || '',
        audiencia: r.audiencia || '',
        fecha_audiencia: r.fecha_audiencia || '',
        hora: r.hora || '',
        radicado: r.radicado || '',
        no: r.no || '',
        procesado_s: r.procesado_s || '',
        delitos_en_concurso: r.delitos_en_concurso || '',
        fiscalia: r.fiscalia || ''
      }
    })
  })
})

const TIPOS_DOCX = {
  constancia,
  acusacion,
  preparatoria,
  'auto-pruebas': autoPruebas,
  'juicio-oral': juicioOral,
  'sentido-fallo': sentidoFallo,
  'individualizacion-pena': individualizacionPena,
  'lectura-sentencia': lecturaSentencia,
  preacuerdo,
  'solicitud-preclusion': solicitudPreclusion,
  'solicitud-defensor': solicitudDefensor
}

const CONSTRUCTORES_DOCX = {
  constancia: (row) => constancia.construirConstancia(row),
  acusacion: (row) => acusacion.construirAcusacion(row),
  preparatoria: (row) => preparatoria.construirPreparatoria(row),
  'auto-pruebas': (row) => autoPruebas.construirAutoPruebas(row),
  'juicio-oral': (row) => juicioOral.construirJuicioOral(row),
  'sentido-fallo': (row) => sentidoFallo.construirSentidoFallo(row),
  'individualizacion-pena': (row) => individualizacionPena.construirIndividualizacionPena(row),
  'lectura-sentencia': (row) => lecturaSentencia.construirLecturaSentencia(row),
  preacuerdo: (row) => preacuerdo.construirPreacuerdo(row),
  'solicitud-preclusion': (row) => solicitudPreclusion.construirSolicitudPreclusion(row),
  'solicitud-defensor': (row) => solicitudDefensor.construirSolicitudDefensor(row)
}

function tipoDocxOficio(query) {
  const t = String((query && query.tipo) || '')
  return CONSTRUCTORES_DOCX[t] ? t : ''
}

function construirOficioDocx(tipo, row) {
  const fn = CONSTRUCTORES_DOCX[tipo] || CONSTRUCTORES_DOCX.constancia
  return fn(row)
}

app.get('/api/oficios/:oficio/media/:archivo', requireAuth, (req, res) => {
  const permitidos = { 'image1.png': 'image/png', 'image2.jpeg': 'image/jpeg', 'image2.jpg': 'image/jpeg' }
  const tipo = permitidos[req.params.archivo]
  if (!tipo) return res.status(404).json({ error: 'Recurso no encontrado.' })
  const fuentes = TIPOS_DOCX
  const fuente = fuentes[req.params.oficio] || null
  if (!fuente) return res.status(404).json({ error: 'Recurso no encontrado.' })
  const datos = fuente.media(req.params.archivo)
  if (!datos) return res.status(404).json({ error: 'Recurso no encontrado.' })
  res.setHeader('Content-Type', tipo)
  res.setHeader('Cache-Control', 'private, max-age=86400')
  res.send(datos)
})

app.get('/api/orden-verbal/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(404).json({ error: 'Registro no encontrado.' })
  const r = db.prepare('SELECT * FROM procesos WHERE id = ?').get(id)
  if (!r) return res.status(404).json({ error: 'Registro no encontrado.' })
  const tipoDocx = tipoDocxOficio(req.query)
  if (tipoDocx) {
    const data = construirOficioDocx(tipoDocx, rowToObj(r))
    return res.json({
      id: data.id,
      tipo: data.tipo,
      campos: data.campos,
      html: data.html,
      nombre_archivo: data.nombre_archivo,
      formato: 'docx'
    })
  }
  const tipo = normalizarTipo(String(req.query.tipo || 'orden'))
  const data = construirDocumento(rowToObj(r), tipo, opcionesOficio(req.query))
  res.json({
    id: data.id,
    tipo: data.tipo,
    campos: data.campos,
    html: data.html,
    nombre_archivo: data.nombre_archivo
  })
})

app.get('/api/orden-verbal/:id/documento', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(404).json({ error: 'Registro no encontrado.' })
  const r = db.prepare('SELECT * FROM procesos WHERE id = ?').get(id)
  if (!r) return res.status(404).json({ error: 'Registro no encontrado.' })
  const descargar = String(req.query.descargar || '') === '1'
  const tipoDocx = tipoDocxOficio(req.query)
  if (tipoDocx) {
    const data = construirOficioDocx(tipoDocx, rowToObj(r))
    const nombre = `${data.nombre_archivo}.docx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `${descargar ? 'attachment' : 'inline'}; filename="${nombre}"`)
    return res.send(data.docx)
  }
  const tipo = normalizarTipo(String(req.query.tipo || 'orden'))
  const data = construirDocumento(rowToObj(r), tipo, opcionesOficio(req.query))
  const nombre = `${data.nombre_archivo}.html`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `${descargar ? 'attachment' : 'inline'}; filename="${nombre}"`)
  res.send(data.documento)
})

app.get('/api/fijar-fecha', requireAuth, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 20))
  const q = String(req.query.q || '').trim().toLowerCase()
  const filtro = String(req.query.filtro || 'todos')
  const rows = db.prepare('SELECT * FROM procesos').all()
  const data = fijarFecha.consultar(rows, null, filtro)
  let registros = data.registros
  if (q) {
    registros = registros.filter((r) =>
      fijarFecha.COLUMNAS.some((c) => String(r[c.clave] || '').toLowerCase().includes(q)) ||
      String(r.estado || '').toLowerCase().includes(q)
    )
  }
  const total = registros.length
  const slice = registros.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  res.json({
    hoy: data.hoy,
    juzgado: data.juzgado,
    fuente: data.fuente,
    columnas: data.columnas,
    filtro: data.filtro,
    pendientes: data.pendientes,
    anteriores: data.anteriores,
    total,
    page,
    perPage,
    registros: slice
  })
})

app.get('/api/fijar-fecha/export', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const filtro = String(req.query.filtro || 'todos')
  const rows = db.prepare('SELECT * FROM procesos').all()
  const data = fijarFecha.consultar(rows, null, filtro)
  if (q) {
    data.registros = data.registros.filter((r) =>
      fijarFecha.COLUMNAS.some((c) => String(r[c.clave] || '').toLowerCase().includes(q)) ||
      String(r.estado || '').toLowerCase().includes(q)
    )
    data.total = data.registros.length
  }
  const xlsx = fijarFecha.construirExcel(data)
  const nombre = `${fijarFecha.nombreArchivo(data.hoy)}.xlsx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`)
  res.send(xlsx)
})

app.get('/api/calendario', requireAuth, (req, res) => {
  const desde = req.query.desde || addDays(hoyISO(), -40)
  const hasta = req.query.hasta || addDays(hoyISO(), 70)
  const eventos = db.prepare(
    'SELECT * FROM calendario WHERE fecha >= ? AND fecha <= ? ORDER BY fecha, hora, id'
  ).all(desde, hasta)
  res.json({ desde, hasta, eventos })
})

app.post('/api/calendario', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  const b = req.body || {}
  if (!b.fecha) return res.status(400).json({ error: 'Debe indicar la fecha.' })
  const info = db.prepare(`
    INSERT INTO calendario (fecha, hora, titulo, proceso, tipo_audiencia, responsable, modulo, registro_id, estado, notas, alerta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.fecha, b.hora || '', b.titulo || 'Audiencia', b.proceso || '', b.tipo_audiencia || '',
    b.responsable || '', b.modulo || '', b.registro_id || null, b.estado || 'programada',
    b.notas || '', b.alerta === 0 ? 0 : 1
  )
  invalidarCaches()
  res.json({ id: info.lastInsertRowid })
})

app.put('/api/calendario/:id', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  const b = req.body || {}
  const campos = ['fecha', 'hora', 'titulo', 'proceso', 'tipo_audiencia', 'responsable', 'modulo', 'registro_id', 'estado', 'notas', 'alerta']
  const used = campos.filter((c) => Object.prototype.hasOwnProperty.call(b, c))
  if (!used.length) return res.status(400).json({ error: 'Sin campos.' })
  db.prepare(`UPDATE calendario SET ${used.map((c) => c + ' = ?').join(', ')} WHERE id = ?`)
    .run(...used.map((c) => b[c]), Number(req.params.id))
  invalidarCaches()
  res.json({ ok: true })
})

app.delete('/api/calendario/:id', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  db.prepare('DELETE FROM calendario WHERE id = ?').run(Number(req.params.id))
  invalidarCaches()
  res.json({ ok: true })
})

app.get('/api/alertas', requireAuth, (req, res) => {
  const hoy = hoyISO()
  const limite = addDays(hoy, 7)
  const eventos = db.prepare(`
    SELECT * FROM calendario
    WHERE alerta = 1 AND fecha >= ? AND fecha <= ?
    ORDER BY fecha, hora
  `).all(hoy, limite)
  const vencidas = db.prepare(`
    SELECT * FROM calendario
    WHERE alerta = 1 AND fecha < ? AND (estado IS NULL OR estado IN ('programada',''))
    ORDER BY fecha DESC LIMIT 30
  `).all(hoy)
  const prescripciones = db.prepare(`
    SELECT id, codigo_interno, radicado, no, procesado_s, fecha_prescripcion, delito_estadistica
    FROM procesos
    WHERE fecha_prescripcion IS NOT NULL AND TRIM(fecha_prescripcion) != ''
  `).all().filter((r) => {
    const f = parseFecha(r.fecha_prescripcion)
    if (!f) return false
    return f >= hoy && f <= addDays(hoy, 90)
  }).slice(0, 40)
  res.json({ hoy, eventos, vencidas, prescripciones })
})

app.get('/api/usuarios', requireAuth, requireRol('administrador'), (_req, res) => {
  const usuarios = db.prepare('SELECT id, nombre_completo, username, rol, activo, creado_en FROM usuarios ORDER BY id').all()
  res.json({ usuarios })
})

app.post('/api/usuarios', requireAuth, requireRol('administrador'), (req, res) => {
  const b = req.body || {}
  if (!b.username || !b.password) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' })
  const chequeo = validarClaveSegura(String(b.password), {
    username: b.username,
    nombre: b.nombre_completo || b.nombre,
    nombre_completo: b.nombre_completo || b.nombre
  })
  if (!chequeo.ok) return res.status(400).json({ error: mensajeError(chequeo), requisitos: chequeo.requisitos })
  const hash = bcrypt.hashSync(String(b.password), 10)
  try {
    const info = db.prepare(
      'INSERT INTO usuarios (nombre_completo, username, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)'
    ).run(b.nombre_completo || b.username, String(b.username).trim(), hash, b.rol || 'consulta', b.activo === false ? 0 : 1)
    auditoria.registrar({
      req,
      accion: 'crear_usuario',
      modulo: 'usuarios',
      registro_id: info.lastInsertRowid,
      descripcion: `Se creó el usuario "${String(b.username).trim()}" con rol ${b.rol || 'consulta'}.`,
      despues: { username: String(b.username).trim(), rol: b.rol || 'consulta', activo: b.activo === false ? 0 : 1 }
    })
    res.locals.auditado = true
    res.json({ id: info.lastInsertRowid })
  } catch (e) {
    res.status(400).json({ error: 'El usuario ya existe.' })
  }
})

app.put('/api/usuarios/:id', requireAuth, requireRol('administrador'), (req, res) => {
  const b = req.body || {}
  const id = Number(req.params.id)
  const antes = db.prepare('SELECT nombre_completo, rol, activo FROM usuarios WHERE id = ?').get(id)
  db.prepare('UPDATE usuarios SET nombre_completo = COALESCE(?, nombre_completo), rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?')
    .run(b.nombre_completo || null, b.rol || null, b.activo === undefined ? null : (b.activo ? 1 : 0), id)
  const despues = db.prepare('SELECT nombre_completo, rol, activo FROM usuarios WHERE id = ?').get(id)
  const cambioPermisos = antes && despues && antes.rol !== despues.rol
  auditoria.registrar({
    req,
    accion: cambioPermisos ? 'cambio_permisos' : 'editar_usuario',
    modulo: 'usuarios',
    registro_id: id,
    descripcion: cambioPermisos
      ? `Se modificaron los permisos (rol) del usuario #${id}: ${antes.rol} → ${despues.rol}.`
      : `Se editó el usuario #${id}.`,
    antes,
    despues
  })
  res.locals.auditado = true
  res.json({ ok: true })
})

app.put('/api/usuarios/:id/password', requireAuth, requireRol('administrador'), (req, res) => {
  const pass = String((req.body && req.body.password) || '')
  const id = Number(req.params.id)
  const u = db.prepare('SELECT id, username, nombre_completo, password_hash FROM usuarios WHERE id = ?').get(id)
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' })
  const chequeo = validarClaveSegura(pass, datosPersonalesUsuario(u))
  if (!chequeo.ok) return res.status(400).json({ error: mensajeError(chequeo), requisitos: chequeo.requisitos })
  if (claveYaUsada(u.id, pass, u.password_hash)) {
    return res.status(400).json({ error: 'No se permite reutilizar claves anteriores.' })
  }
  guardarNuevaClave(u.id, u.password_hash, pass)
  auditoria.registrar({
    req,
    accion: 'cambio_clave',
    modulo: 'usuarios',
    registro_id: u.id,
    descripcion: `El administrador restableció la contraseña del usuario "${u.username}".`
  })
  res.locals.auditado = true
  res.json({ ok: true })
})

app.delete('/api/usuarios/:id', requireAuth, requireRol('administrador'), (req, res) => {
  const id = Number(req.params.id)
  if (id === req.usuario.id) return res.status(400).json({ error: 'No puede eliminarse a sí mismo.' })
  const u = db.prepare('SELECT id, username, nombre_completo, rol FROM usuarios WHERE id = ?').get(id)
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)
  auditoria.registrar({
    req,
    accion: 'eliminar_usuario',
    modulo: 'usuarios',
    registro_id: id,
    descripcion: `Se eliminó el usuario "${u ? u.username : '#' + id}".`,
    antes: u || null
  })
  res.locals.auditado = true
  res.json({ ok: true })
})

app.get('/api/backup', requireAuth, requireRol('administrador'), async (req, res) => {
  const temporal = path.join(backups.TEMP_DIR, 'descarga-rapida-' + Date.now() + '.db')
  try {
    await db.backup(temporal)
    const buf = fs.readFileSync(temporal)
    auditoria.registrar({
      req,
      accion: 'descargar_backup',
      modulo: 'backups',
      descripcion: 'Descarga rápida de la base de datos completa.',
      despues: { tamano: buf.length }
    })
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment; filename="juzgado-respaldo.db"')
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: 'No se pudo generar la copia: ' + e.message })
  } finally {
    try { if (fs.existsSync(temporal)) fs.unlinkSync(temporal) } catch (_e) { /* ignore */ }
  }
})

app.post('/api/restore', requireAuth, requireRol('administrador'), (req, res) => {
  const datos = req.body && req.body.datos
  if (!datos) return res.status(400).json({ error: 'Archivo vacío.' })
  const buf = Buffer.from(datos, 'base64')
  if (buf.slice(0, 15).toString() !== 'SQLite format 3') {
    return res.status(400).json({ error: 'El archivo no es una base SQLite válida.' })
  }
  try {
    fs.writeFileSync(DB_PATH, buf)
  } catch (_e) { /* ignore */ }
  auditoria.registrar({
    req,
    accion: 'restaurar_backup',
    modulo: 'backups',
    descripcion: 'Se restauró la base de datos desde un archivo cargado.',
    despues: { tamano: buf.length }
  })
  res.locals.auditado = true
  res.json({ ok: true, advertencia: 'Reinicie el servicio para que la restauración surta efecto.' })
})

/* ------------------------------ Auditoría ------------------------------ */

app.get('/api/auditoria', requireAuth, requireRol('administrador'), (req, res) => {
  res.json(auditoria.listar(req.query))
})

app.get('/api/auditoria/opciones', requireAuth, requireRol('administrador'), (_req, res) => {
  res.json(auditoria.opciones())
})

app.get('/api/auditoria/verificar', requireAuth, requireRol('administrador'), (req, res) => {
  const r = auditoria.verificarCadena()
  auditoria.insertarMeta({
    usuario: req.usuario.username,
    ip: auditoria.ipDe(req),
    accion: 'verificacion_integridad',
    detalle: `Verificación de integridad de la auditoría: ${r.ok ? 'cadena íntegra' : 'alteración detectada'} (${r.total} registros).`
  })
  res.json(r)
})

app.get('/api/auditoria/alertas', requireAuth, requireRol('administrador'), (req, res) => {
  res.json({ alertas: auditoria.alertas(req.query.estado) })
})

app.get('/api/auditoria/meta', requireAuth, requireRol('administrador'), (_req, res) => {
  const meta = db.prepare('SELECT * FROM auditoria_meta ORDER BY id DESC LIMIT 200').all()
  res.json({ meta })
})

app.post('/api/auditoria/alertas/:id/atender', requireAuth, requireRol('administrador'), (req, res) => {
  auditoria.atenderAlerta(req.params.id, req)
  res.locals.auditado = true
  res.json({ ok: true })
})

const COLUMNAS_AUDITORIA = [
  { nombre: 'fecha', etiqueta: 'Fecha y hora', peso: 1.3 },
  { nombre: 'usuario', etiqueta: 'Usuario', peso: 1 },
  { nombre: 'rol', etiqueta: 'Rol', peso: 0.8 },
  { nombre: 'accion', etiqueta: 'Acción', peso: 1.2 },
  { nombre: 'modulo', etiqueta: 'Módulo', peso: 1 },
  { nombre: 'registro_id', etiqueta: 'ID registro', peso: 0.8 },
  { nombre: 'descripcion', etiqueta: 'Descripción', peso: 2.4 },
  { nombre: 'ip', etiqueta: 'IP', peso: 1 },
  { nombre: 'dispositivo', etiqueta: 'Dispositivo', peso: 1.4 },
  { nombre: 'exito', etiqueta: 'Resultado', peso: 0.8 },
  { nombre: 'checksum', etiqueta: 'Checksum', peso: 1.6 }
]

app.get('/api/auditoria/export', requireAuth, requireRol('administrador'), (req, res) => {
  const formato = String(req.query.formato || 'csv').toLowerCase()
  const registros = auditoria.registrosParaExportar(req.query, 20000).map((r) => ({
    ...r,
    exito: r.exito ? 'Exitoso' : 'Fallido'
  }))
  const fecha = new Date().toISOString().slice(0, 10)
  auditoria.registrar({
    req,
    accion: 'exportar_auditoria',
    modulo: 'auditoria',
    descripcion: `Se exportó la auditoría en formato ${formato.toUpperCase()} (${registros.length} registros).`,
    despues: { formato, registros: registros.length }
  })
  auditoria.insertarMeta({
    usuario: req.usuario.username,
    ip: auditoria.ipDe(req),
    accion: 'exportacion_auditoria',
    detalle: `Exportación de auditoría en formato ${formato.toUpperCase()} con ${registros.length} registros.`
  })
  if (formato === 'xlsx' || formato === 'excel') {
    const buf = exportadores.xlsx('Auditoría', COLUMNAS_AUDITORIA, registros)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${fecha}.xlsx"`)
    return res.send(buf)
  }
  if (formato === 'pdf') {
    const buf = exportadores.pdf({
      titulo: 'Auditoría del sistema',
      subtitulo: `Juzgado Primero Penal del Circuito Especializado de Tumaco - Generado ${new Date().toLocaleString('es-CO')} - ${registros.length} registros`,
      columnas: COLUMNAS_AUDITORIA,
      filas: registros
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${fecha}.pdf"`)
    return res.send(buf)
  }
  const buf = exportadores.csv(COLUMNAS_AUDITORIA, registros)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="auditoria-${fecha}.csv"`)
  res.send(buf)
})

/* ------------------------------- Backups ------------------------------- */

app.get('/api/backups', requireAuth, requireRol('administrador'), (_req, res) => {
  res.json({
    copias: backups.listar(),
    config: programador.obtenerConfig(),
    correo: programador.obtenerEmailConfig(false),
    envios: programador.historialEnvios(50),
    almacenamiento: { principal: backups.BACKUPS_DIR, redundante: backups.REDUNDANTE_DIR }
  })
})

app.get('/api/backups/exportar', requireAuth, requireRol('administrador'), (req, res) => {
  const formato = String(req.query.formato || 'xlsx').toLowerCase()
  const esquema = getEsquema()
  const hojas = []
  const archivosCsv = []
  const resumen = []
  for (const tabla of tablasValidas()) {
    const conf = esquema[tabla]
    if (!conf) continue
    const cols = (conf.columnas || []).map((c) => ({ nombre: c.nombre, etiqueta: c.etiqueta }))
    if (!cols.length) continue
    let filas = []
    try { filas = db.prepare(`SELECT * FROM ${tabla}`).all() } catch (_e) { continue }
    hojas.push({ nombre: conf.titulo || tabla, columnas: cols, filas })
    archivosCsv.push({ nombre: `${tabla}.csv`, datos: exportadores.csv(cols, filas) })
    resumen.push({ nombre: conf.titulo || tabla, etiqueta: 'Registros', valor: String(filas.length) })
  }
  hojas.unshift({
    nombre: 'Información',
    columnas: [{ nombre: 'descripcion', etiqueta: 'Descripción' }, { nombre: 'valor', etiqueta: 'Valor' }],
    filas: [
      { descripcion: 'Entidad', valor: 'Juzgado Primero Penal del Circuito Especializado de Tumaco' },
      { descripcion: 'Generado', valor: new Date().toLocaleString('es-CO') },
      { descripcion: 'Usuario', valor: req.usuario.username },
      { descripcion: 'Módulos exportados', valor: String(hojas.length) },
      ...resumen.map((r) => ({ descripcion: `Registros en ${r.nombre}`, valor: r.valor }))
    ]
  })
  const fecha = new Date().toISOString().slice(0, 10)
  auditoria.registrar({
    req,
    accion: 'exportar_backup_excel',
    modulo: 'backups',
    descripcion: `Se exportó la base de datos en formato ${formato === 'csv' ? 'CSV (ZIP)' : 'Excel'} (${hojas.length} módulos).`,
    despues: { formato, modulos: hojas.length, detalle: resumen.map((r) => `${r.nombre}: ${r.valor}`).join(', ') }
  })
  if (formato === 'csv') {
    const buf = exportadores.zip(archivosCsv)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="base-datos-${fecha}.zip"`)
    return res.send(buf)
  }
  const buf = exportadores.xlsxLibro(hojas)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="base-datos-${fecha}.xlsx"`)
  res.send(buf)
})

app.post('/api/backups', requireAuth, requireRol('administrador'), async (req, res) => {
  const b = req.body || {}
  const cfg = programador.obtenerConfig()
  const config = { ...cfg, cifrado: b.cifrado === undefined ? cfg.cifrado : (b.cifrado ? 1 : 0), redundancia: b.redundancia === undefined ? cfg.redundancia : (b.redundancia ? 1 : 0) }
  try {
    const r = await programador.ejecutar({
      tipo: 'manual',
      usuario: req.usuario.username,
      config,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      conCorreo: b.enviarCorreo !== false,
      notas: b.notas || 'Copia generada manualmente'
    })
    res.locals.auditado = true
    res.json({ ok: true, backup: r.backup, correo: r.correo })
  } catch (e) {
    auditoria.registrar({
      req, accion: 'backup_manual', modulo: 'backups', exito: false,
      descripcion: 'Falló la generación manual de la copia de seguridad.', error: e.message
    })
    res.locals.auditado = true
    res.status(500).json({ error: 'No se pudo generar la copia: ' + e.message })
  }
})

app.post('/api/backups/ejecutar-ahora', requireAuth, requireRol('administrador'), async (req, res) => {
  try {
    const r = await programador.ejecutar({
      tipo: 'automatico',
      usuario: req.usuario.username,
      config: programador.obtenerConfig(),
      baseUrl: `${req.protocol}://${req.get('host')}`,
      notas: 'Ejecución manual de la programación'
    })
    const ahora = backups.ahoraLocal()
    const cfg = programador.obtenerConfig()
    require('./lib/db').openDb().prepare('UPDATE backup_config SET ultimo_ejecutado = ?, proximo_ejecutado = ? WHERE id = 1')
      .run(ahora, cfg.activo ? programador.calcularProximo(cfg, new Date(Date.now() + 60000)) : null)
    res.locals.auditado = true
    res.json({ ok: true, backup: r.backup, correo: r.correo, programador: programador.estado() })
  } catch (e) {
    auditoria.registrar({
      req, accion: 'backup_automatico', modulo: 'backups', exito: false,
      descripcion: 'Falló la ejecución inmediata de la copia programada.', error: e.message
    })
    res.locals.auditado = true
    res.status(500).json({ error: 'No se pudo ejecutar la copia programada: ' + e.message })
  }
})

app.get('/api/backups/programador', requireAuth, requireRol('administrador'), (_req, res) => {
  res.json(programador.estado())
})

app.get('/api/vault', requireAuth, requireRol('administrador'), (_req, res) => {
  const vault = require('./lib/vault')
  vault.asegurar()
  res.json({
    cadena: vault.verificarCadena(),
    puntoLimpio: vault.puntoLimpio(),
    copias: vault.listar().slice(0, 50),
    rutas: { vault: vault.VAULT_DIR, copias: vault.VAULT_COPIAS, offline: vault.VAULT_OFFLINE }
  })
})

app.post('/api/vault/verificar', requireAuth, requireRol('administrador'), (req, res) => {
  const vault = require('./lib/vault')
  const r = vault.verificarCadena()
  auditoria.registrar({
    req, accion: 'verificar_boveda', modulo: 'backups',
    descripcion: r.ok ? `Bóveda íntegra (${r.copias} copias).` : `Bóveda con ${r.rotas.length} incidencias.`,
    despues: r
  })
  res.locals.auditado = true
  res.json(r)
})

app.post('/api/vault/punto-limpio/:id', requireAuth, requireRol('administrador'), (req, res) => {
  const vault = require('./lib/vault')
  const reg = backups.obtener(Number(req.params.id))
  if (!reg) return res.status(404).json({ error: 'Copia no encontrada.' })
  const r = vault.marcarPuntoLimpio(reg)
  auditoria.registrar({
    req, accion: 'punto_limpio', modulo: 'backups', registro_id: reg.id,
    descripcion: `Se marcó la copia "${reg.nombre}" como punto de restauración limpio.`,
    despues: r
  })
  res.locals.auditado = true
  res.json(r)
})

app.post('/api/vault/offline', requireAuth, requireRol('administrador'), (req, res) => {
  const vault = require('./lib/vault')
  const r = vault.exportarOffline()
  auditoria.registrar({
    req, accion: 'exportar_offline', modulo: 'backups',
    descripcion: `Se exportó un paquete offline de la bóveda (${r.copias} copias) a ${r.destino}.`,
    despues: r
  })
  res.locals.auditado = true
  res.json(r)
})

app.put('/api/backups/config', requireAuth, requireRol('administrador'), (req, res) => {
  const antes = programador.obtenerConfig()
  const despues = programador.guardarConfig(req.body || {})
  auditoria.registrar({
    req,
    accion: 'config_backup',
    modulo: 'backups',
    descripcion: 'Se actualizó la configuración de las copias de seguridad.',
    antes,
    despues
  })
  res.locals.auditado = true
  res.json({ ok: true, config: despues })
})

app.get('/api/backups/:id/descargar', (req, res, next) => {
  const id = Number(req.params.id)
  const exp = req.query.exp
  const token = req.query.token
  if (exp && token) {
    if (!programador.verificarEnlace(id, exp, token)) {
      return res.status(403).json({ error: 'Enlace seguro inválido o expirado.' })
    }
  } else {
    const u = usuarioSesion(req)
    if (!u || !u.activo || u.rol !== 'administrador') {
      return res.status(403).json({ error: 'No tiene permiso para descargar esta copia.' })
    }
  }
  try {
    const reg = backups.rutaArchivo(id)
    auditoria.registrar({
      req,
      accion: 'descargar_backup',
      modulo: 'backups',
      registro_id: id,
      descripcion: `Descarga de la copia "${reg.nombre}".`
    })
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${reg.nombre}"`)
    fs.createReadStream(reg.ruta).pipe(res)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.get('/api/backups/:id/enlace', requireAuth, requireRol('administrador'), (req, res) => {
  const id = Number(req.params.id)
  const reg = backups.obtener(id)
  if (!reg) return res.status(404).json({ error: 'Copia no encontrada.' })
  const { exp, token } = programador.firmarEnlace(id, 72)
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({ url: `${baseUrl}/api/backups/${id}/descargar?exp=${exp}&token=${token}`, expira: new Date(exp).toISOString() })
})

app.post('/api/backups/:id/verificar', requireAuth, requireRol('administrador'), (req, res) => {
  const id = Number(req.params.id)
  const r = backups.probarRestauracion(id)
  auditoria.registrar({
    req,
    accion: 'verificar_backup',
    modulo: 'backups',
    registro_id: id,
    descripcion: `Verificación de restauración de la copia #${id}: ${r.ok ? 'correcta' : 'fallida'}.`,
    despues: r
  })
  res.locals.auditado = true
  res.json(r)
})

app.delete('/api/backups/:id', requireAuth, requireRol('administrador'), (req, res) => {
  const id = Number(req.params.id)
  const reg = backups.obtener(id)
  if (!reg) return res.status(404).json({ error: 'Copia no encontrada.' })
  backups.eliminar(id)
  auditoria.registrar({
    req,
    accion: 'borrar_backup',
    modulo: 'backups',
    registro_id: id,
    descripcion: `Se eliminó la copia de seguridad "${reg.nombre}".`,
    antes: reg
  })
  res.locals.auditado = true
  res.json({ ok: true })
})

/* -------------------------------- Correo ------------------------------- */

app.get('/api/correo/config', requireAuth, requireRol('administrador'), (_req, res) => {
  res.json({
    correo: programador.obtenerEmailConfig(false),
    envio: programador.obtenerConfig(),
    envios: programador.historialEnvios(100)
  })
})

app.put('/api/correo/config', requireAuth, requireRol('administrador'), (req, res) => {
  const b = req.body || {}
  const antes = { ...programador.obtenerEmailConfig(false), envio: programador.obtenerConfig() }
  const correo = programador.guardarEmailConfig(b)
  const envio = programador.guardarConfig(b.envio || {
    correo_activo: b.correo_activo,
    correos: b.correos,
    asunto: b.asunto,
    adjunto_max_mb: b.adjunto_max_mb,
    reintentos: b.reintentos
  })
  auditoria.registrar({
    req,
    accion: 'config_correo',
    modulo: 'correo',
    descripcion: 'Se actualizó la configuración de correo y frecuencia de copias.',
    antes: { ...antes, password: '***' },
    despues: { ...correo, password: '***', envio }
  })
  res.locals.auditado = true
  res.json({ ok: true, correo, envio })
})

app.post('/api/correo/prueba', requireAuth, requireRol('administrador'), async (req, res) => {
  const b = req.body || {}
  try {
    const email = programador.obtenerEmailConfig(true)
    const destinatarios = mailer.normalizarDestinatarios(b.destinatarios || programador.obtenerConfig().correos)
    if (!destinatarios.length) return res.status(400).json({ error: 'Indique al menos un destinatario válido.' })
    const r = await mailer.enviarConReintentos({
      config: email,
      para: destinatarios,
      asunto: b.asunto || 'Prueba de configuración de correo - Juzgado Tumaco',
      texto: [
        'GESTOR DE INFORMACIÓN - JUZGADO PRIMERO PENAL DEL CIRCUITO ESPECIALIZADO DE TUMACO',
        '',
        'Este es un correo de prueba enviado desde el módulo de Base de Datos.',
        `Fecha: ${new Date().toLocaleString('es-CO')}`,
        `Destinatarios: ${destinatarios.join(', ')}`,
        '',
        'Si recibió este mensaje, la configuración de correo es correcta.'
      ].join('\n')
    }, programador.obtenerConfig().reintentos)
    const estado = r.simulado ? 'simulado' : 'enviado'
    db.prepare(`INSERT INTO correo_envios (destinatarios, asunto, estado, intentos, resumen, usuario)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      JSON.stringify(destinatarios),
      b.asunto || 'Prueba de configuración de correo - Juzgado Tumaco',
      estado, r.intentos || 1,
      r.simulado ? 'Prueba sin servidor SMTP configurado; guardada en data/outbox.' : 'Correo de prueba enviado.',
      req.usuario.username
    )
    auditoria.registrar({
      req, accion: 'prueba_correo', modulo: 'correo',
      descripcion: `Correo de prueba (${estado}) a ${destinatarios.join(', ')}.`
    })
    res.locals.auditado = true
    res.json({ ok: true, estado, intentos: r.intentos || 1, detalle: r.respuesta || r.archivo || '' })
  } catch (e) {
    auditoria.registrar({
      req, accion: 'prueba_correo', modulo: 'correo', exito: false,
      descripcion: 'Falló el envío del correo de prueba.', error: e.message
    })
    res.locals.auditado = true
    res.status(500).json({ error: 'No se pudo enviar el correo de prueba: ' + e.message })
  }
})

app.get('/api/correo/envios', requireAuth, requireRol('administrador'), (req, res) => {
  res.json({ envios: programador.historialEnvios(req.query.limite) })
})

app.put('/api/esquema/:tabla', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const b = req.body || {}
  if (b.titulo) esquema[tabla].titulo = b.titulo
  if (b.descripcion != null) esquema[tabla].descripcion = b.descripcion
  if (b.fecha_entrada !== undefined) esquema[tabla].fecha_entrada = b.fecha_entrada
  if (b.fecha_salida !== undefined) esquema[tabla].fecha_salida = b.fecha_salida
  if (Array.isArray(b.visibles)) {
    esquema[tabla].visibles = b.visibles
    const set = new Set(b.visibles)
    for (const c of esquema[tabla].columnas) c.visible = set.has(c.nombre)
  }
  saveEsquema()
  res.json({ ok: true })
})

app.delete('/api/esquema/:tabla', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  if (tabla === 'procesos') return res.status(400).json({ error: 'No se puede eliminar el módulo de Procesos Penales.' })
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  if (!(req.body && req.body.confirmar)) return res.status(400).json({ error: 'Debe confirmar la eliminación.' })
  db.exec(`DROP TABLE IF EXISTS ${tabla}`)
  delete esquema[tabla]
  saveEsquema()
  res.json({ ok: true })
})

app.post('/api/esquema/:tabla/columnas', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const b = req.body || {}
  const nombre = String(b.nombre || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  if (!nombre) return res.status(400).json({ error: 'Nombre inválido.' })
  if (esquema[tabla].columnas.some((c) => c.nombre === nombre)) {
    return res.status(400).json({ error: 'La columna ya existe.' })
  }
  db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} TEXT`)
  esquema[tabla].columnas.push({
    nombre,
    etiqueta: b.etiqueta || nombre,
    tipo: b.tipo || 'texto',
    opciones: b.opciones || [],
    seccion: b.seccion || 'General',
    visible: !!b.visible
  })
  if (b.visible) esquema[tabla].visibles.push(nombre)
  saveEsquema()
  res.json({ ok: true, nombre })
})

app.put('/api/esquema/:tabla/columnas/:nombre', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const c = esquema[tabla].columnas.find((x) => x.nombre === req.params.nombre)
  if (!c) return res.status(404).json({ error: 'Columna no encontrada.' })
  const b = req.body || {}
  if (b.etiqueta) c.etiqueta = b.etiqueta
  if (b.tipo) c.tipo = b.tipo
  if (b.seccion != null) c.seccion = b.seccion
  if (b.visible != null) c.visible = !!b.visible
  if (Array.isArray(b.opciones)) c.opciones = b.opciones
  if (b.nombre && b.nombre !== c.nombre) {
    const nuevo = String(b.nombre).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    try { db.exec(`ALTER TABLE ${tabla} RENAME COLUMN ${c.nombre} TO ${nuevo}`) } catch (e) { /* sqlite antiguo */ }
    const vis = esquema[tabla].visibles.indexOf(c.nombre)
    if (vis >= 0) esquema[tabla].visibles[vis] = nuevo
    c.nombre = nuevo
  }
  saveEsquema()
  res.json({ ok: true })
})

app.delete('/api/esquema/:tabla/columnas/:nombre', requireAuth, requireRol('administrador'), (req, res) => {
  const tabla = req.params.tabla
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  esquema[tabla].columnas = esquema[tabla].columnas.filter((c) => c.nombre !== req.params.nombre)
  esquema[tabla].visibles = esquema[tabla].visibles.filter((n) => n !== req.params.nombre)
  saveEsquema()
  res.json({ ok: true })
})

app.post('/api/esquema/:tabla/columnas/:nombre/opciones', requireAuth, requireRol('administrador', 'usuario'), (req, res) => {
  const tabla = req.params.tabla
  const esquema = getEsquema()
  if (!esquema[tabla]) return res.status(404).json({ error: 'Módulo no encontrado.' })
  const c = esquema[tabla].columnas.find((x) => x.nombre === req.params.nombre)
  if (!c) return res.status(404).json({ error: 'Columna no encontrada.' })
  const valor = String((req.body && req.body.valor) || '').trim()
  if (!valor) return res.status(400).json({ error: 'Valor vacío.' })
  if (!c.opciones) c.opciones = []
  if (!c.opciones.includes(valor)) c.opciones.push(valor)
  saveEsquema()
  res.json({ ok: true })
})

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('Gestor de Información escuchando en puerto ' + PORT)
    programador.iniciar(process.env.PUBLIC_URL || '')
  })
  server.on('error', (err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = app
