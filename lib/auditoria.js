'use strict'

const crypto = require('crypto')

const ACCIONES_SENSIBLES = new Set([
  'login', 'logout', 'cambio_clave', 'crear_usuario', 'editar_usuario',
  'eliminar_usuario', 'cambio_permisos', 'restaurar_backup', 'borrar_backup',
  'config_correo', 'config_backup', 'exportar_auditoria'
])

const MODULO_POR_RUTA = [
  [/^\/api\/login/, 'autenticacion'],
  [/^\/api\/logout/, 'autenticacion'],
  [/^\/api\/me\/password/, 'seguridad'],
  [/^\/api\/usuarios/, 'usuarios'],
  [/^\/api\/tabla\/([^/]+)/, 'datos'],
  [/^\/api\/calendario/, 'calendario'],
  [/^\/api\/esquema/, 'estructura'],
  [/^\/api\/auditoria/, 'auditoria'],
  [/^\/api\/backups?/, 'backups'],
  [/^\/api\/correo/, 'correo']
]

let dbRef = null

function init(db) {
  dbRef = db
  return dbRef
}

function cnn() {
  if (!dbRef) throw new Error('auditoria.init(db) no fue llamado')
  return dbRef
}

function ipDe(req) {
  if (!req) return ''
  const xff = req.headers && req.headers['x-forwarded-for']
  const raw = (xff && String(xff).split(',')[0].trim()) || req.ip || (req.socket && req.socket.remoteAddress) || ''
  return raw.replace(/^::ffff:/, '')
}

function dispositivoDe(req) {
  const ua = String((req && req.headers && req.headers['user-agent']) || '')
  if (!ua) return 'Desconocido'
  const so = /Windows NT 10/.test(ua) ? 'Windows 10/11'
    : /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Otro'
  const nav = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'Navegador'
  const movil = /Mobile|Android|iPhone/.test(ua) ? 'movil' : 'escritorio'
  return `${nav} en ${so} (${movil})`
}

function limpiarTexto(valor, max) {
  if (valor == null) return null
  let s = typeof valor === 'string' ? valor : JSON.stringify(valor)
  if (s.length > (max || 4000)) s = s.slice(0, max || 4000) + '...[truncado]'
  return s
}

function ocultarSensibles(obj) {
  if (obj == null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(ocultarSensibles)
  const ocultos = ['password', 'clave', 'pass', 'password_hash', 'password_actual', 'nueva',
    'confirmar', 'token', 'secret', 'authorization', 'cookie', 'smtp_pass']
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (ocultos.includes(String(k).toLowerCase())) out[k] = '***'
    else out[k] = ocultarSensibles(v)
  }
  return out
}

function ultimoChecksum() {
  const row = cnn().prepare('SELECT checksum FROM auditoria ORDER BY id DESC LIMIT 1').get()
  return (row && row.checksum) || 'GENESIS'
}

function ahoraLocal() {
  return require('./tiempo').ahoraLocal()
}

function calcularChecksum(previo, datos) {
  return crypto.createHash('sha256')
    .update(String(previo || 'GENESIS'))
    .update('|')
    .update(JSON.stringify(datos))
    .digest('hex')
}

function registrar(entrada) {
  const e = entrada || {}
  const req = e.req
  const usuario = e.usuario || (req && req.usuario) || null
  const previo = ultimoChecksum()
  const datos = {
    fecha: e.fecha || ahoraLocal(),
    usuario_id: usuario ? Number(usuario.id) || null : null,
    usuario: usuario ? (usuario.username || usuario.usuario || usuario.nombre || '') : (e.usuario_nombre || 'anonimo'),
    rol: usuario ? (usuario.rol || '') : '',
    accion: e.accion || 'accion',
    modulo: e.modulo || '',
    registro_id: e.registro_id != null ? String(e.registro_id) : null,
    descripcion: limpiarTexto(e.descripcion, 1000),
    antes: e.antes != null ? limpiarTexto(ocultarSensibles(e.antes), 4000) : null,
    despues: e.despues != null ? limpiarTexto(ocultarSensibles(e.despues), 4000) : null,
    ip: e.ip || ipDe(req),
    dispositivo: e.dispositivo || dispositivoDe(req),
    metodo: e.metodo || (req && req.method) || '',
    ruta: e.ruta || (req && req.originalUrl) || '',
    exito: e.exito === false ? 0 : 1,
    error: limpiarTexto(e.error, 1000)
  }
  const checksum = calcularChecksum(previo, datos)
  const info = cnn().prepare(`
    INSERT INTO auditoria (
      fecha, usuario_id, usuario, rol, accion, modulo, registro_id, descripcion,
      antes, despues, ip, dispositivo, user_agent, metodo, ruta, exito, error,
      checksum, checksum_previo
    ) VALUES (
      @fecha, @usuario_id, @usuario, @rol, @accion, @modulo, @registro_id, @descripcion,
      @antes, @despues, @ip, @dispositivo, @user_agent, @metodo, @ruta, @exito, @error,
      @checksum, @checksum_previo
    )
  `).run({
    ...datos,
    user_agent: limpiarTexto((req && req.headers && req.headers['user-agent']) || '', 500),
    checksum,
    checksum_previo: previo
  })
  revisarAnomalias(datos)
  return { id: info.lastInsertRowid, checksum }
}

function insertarMeta(entrada) {
  const e = entrada || {}
  const info = cnn().prepare(`
    INSERT INTO auditoria_meta (usuario, ip, accion, detalle)
    VALUES (@usuario, @ip, @accion, @detalle)
  `).run({
    usuario: e.usuario || '',
    ip: e.ip || '',
    accion: e.accion || '',
    detalle: limpiarTexto(e.detalle, 2000)
  })
  return info.lastInsertRowid
}

function revisarAnomalias(datos) {
  try {
    if (datos.accion === 'login' && datos.exito === 0 && datos.ip) {
      const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
      const n = cnn().prepare(
        "SELECT COUNT(*) AS c FROM auditoria WHERE accion = 'login' AND exito = 0 AND ip = ? AND fecha >= ?"
      ).get(datos.ip, desde).c
      if (n >= 5) {
        const ya = cnn().prepare(
          "SELECT COUNT(*) AS c FROM alertas_auditoria WHERE tipo = 'intentos_fallidos' AND ip = ? AND fecha >= ? AND atendida = 0"
        ).get(datos.ip, desde).c
        if (!ya) {
          cnn().prepare(`
            INSERT INTO alertas_auditoria (tipo, severidad, descripcion, usuario, ip, detalle)
            VALUES ('intentos_fallidos', 'alta', ?, ?, ?, ?)
          `).run(
            `Se detectaron ${n} intentos de inicio de sesión fallidos desde la misma IP en 10 minutos.`,
            datos.usuario, datos.ip, JSON.stringify({ intentos: n })
          )
        }
      }
    }
    if (datos.accion === 'acceso_denegado') {
      const n = cnn().prepare(
        "SELECT COUNT(*) AS c FROM auditoria WHERE accion = 'acceso_denegado' AND usuario = ? AND fecha >= datetime('now','localtime','-1 hour')"
      ).get(datos.usuario).c
      if (n >= 5) {
        const ya = cnn().prepare(
          "SELECT COUNT(*) AS c FROM alertas_auditoria WHERE tipo = 'acceso_denegado_reiterado' AND usuario = ? AND fecha >= datetime('now','localtime','-1 hour')"
        ).get(datos.usuario).c
        if (!ya) {
          cnn().prepare(`
            INSERT INTO alertas_auditoria (tipo, severidad, descripcion, usuario, ip, detalle)
            VALUES ('acceso_denegado_reiterado', 'media', ?, ?, ?, ?)
          `).run(
            `El usuario ${datos.usuario} acumuló ${n} accesos denegados en la última hora.`,
            datos.usuario, datos.ip, JSON.stringify({ intentos: n })
          )
        }
      }
    }
  } catch (_e) { /* las alertas nunca deben romper el flujo */ }
}

function moduloDeRuta(ruta) {
  for (const [re, nombre] of MODULO_POR_RUTA) {
    const m = re.exec(ruta || '')
    if (m) return m[1] && nombre === 'datos' ? `datos:${m[1]}` : nombre
  }
  return 'general'
}

function middlewareAuto() {
  return (req, res, next) => {
    if (!/^(POST|PUT|PATCH|DELETE)$/.test(req.method)) return next()
    if (!req.path.startsWith('/api/')) return next()
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (!res.locals.auditado && !res.locals.auditadoError) {
        const ok = res.statusCode < 400
        try {
          registrar({
            req,
            accion: ok ? `${req.method.toLowerCase()}_${req.path}` : 'acceso_denegado',
            modulo: moduloDeRuta(req.path),
            descripcion: ok
              ? `Operación ${req.method} en ${req.path}`
              : `Operación rechazada (${res.statusCode}) en ${req.path}`,
            exito: ok,
            error: ok ? null : (body && body.error) || null
          })
        } catch (e) {
          console.error('No se pudo registrar en auditoría:', e.message)
        }
      }
      return originalJson(body)
    }
    next()
  }
}

function normalizarFiltros(q) {
  const f = q || {}
  const page = Math.max(1, Number(f.page || f.pagina || 1) || 1)
  const porPagina = Math.min(200, Math.max(5, Number(f.porPagina || f.limite || 25) || 25))
  return {
    desde: f.desde || '',
    hasta: f.hasta || '',
    usuario: f.usuario || '',
    accion: f.accion || '',
    modulo: f.modulo || '',
    exito: f.exito === undefined || f.exito === '' ? '' : String(f.exito),
    texto: f.texto || f.q || '',
    page,
    porPagina,
    offset: (page - 1) * porPagina
  }
}

function construirWhere(f) {
  const w = []
  const p = {}
  if (f.desde) { w.push('date(fecha) >= date(@desde)'); p.desde = f.desde }
  if (f.hasta) { w.push('date(fecha) <= date(@hasta)'); p.hasta = f.hasta }
  if (f.usuario) { w.push('usuario LIKE @usuario'); p.usuario = `%${f.usuario}%` }
  if (f.accion) { w.push('accion = @accion'); p.accion = f.accion }
  if (f.modulo) { w.push('modulo = @modulo'); p.modulo = f.modulo }
  if (f.exito !== '') { w.push('exito = @exito'); p.exito = Number(f.exito) ? 1 : 0 }
  if (f.texto) {
    w.push('(descripcion LIKE @texto OR usuario LIKE @texto OR accion LIKE @texto OR modulo LIKE @texto OR registro_id LIKE @texto OR ip LIKE @texto OR antes LIKE @texto OR despues LIKE @texto)')
    p.texto = `%${f.texto}%`
  }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', params: p }
}

function listar(q) {
  const f = normalizarFiltros(q)
  const { where, params } = construirWhere(f)
  const total = cnn().prepare(`SELECT COUNT(*) AS c FROM auditoria ${where}`).get(params).c
  const registros = cnn().prepare(`
    SELECT * FROM auditoria ${where}
    ORDER BY id DESC LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: f.porPagina, offset: f.offset })
  return {
    total,
    page: f.page,
    porPagina: f.porPagina,
    paginas: Math.max(1, Math.ceil(total / f.porPagina)),
    registros
  }
}

function registrosParaExportar(q, max) {
  const f = normalizarFiltros({ ...(q || {}), page: 1, porPagina: 200 })
  const { where, params } = construirWhere(f)
  return cnn().prepare(`
    SELECT id, fecha, usuario, rol, accion, modulo, registro_id, descripcion,
           antes, despues, ip, dispositivo, metodo, ruta, exito, error, checksum
    FROM auditoria ${where}
    ORDER BY id DESC LIMIT @limit
  `).all({ ...params, limit: max || 20000 })
}

function verificarCadena() {
  const filas = cnn().prepare(
    'SELECT id, checksum, checksum_previo, usuario_id, usuario, rol, accion, modulo, registro_id, descripcion, antes, despues, ip, dispositivo, metodo, ruta, exito, error, fecha FROM auditoria ORDER BY id ASC'
  ).all()
  let previo = 'GENESIS'
  for (const r of filas) {
    const fecha = r.fecha
    const datos = {
      fecha,
      usuario_id: r.usuario_id,
      usuario: r.usuario,
      rol: r.rol,
      accion: r.accion,
      modulo: r.modulo,
      registro_id: r.registro_id,
      descripcion: r.descripcion,
      antes: r.antes,
      despues: r.despues,
      ip: r.ip,
      dispositivo: r.dispositivo,
      metodo: r.metodo,
      ruta: r.ruta,
      exito: r.exito,
      error: r.error
    }
    const esperado = calcularChecksum(previo, datos)
    if (r.checksum_previo !== previo || r.checksum !== esperado) {
      return { ok: false, total: filas.length, primerError: r.id }
    }
    previo = r.checksum
  }
  return { ok: true, total: filas.length, primerError: null }
}

function opciones() {
  const usuarios = cnn().prepare("SELECT DISTINCT usuario FROM auditoria WHERE usuario != '' ORDER BY usuario").all().map((r) => r.usuario)
  const acciones = cnn().prepare('SELECT DISTINCT accion FROM auditoria ORDER BY accion').all().map((r) => r.accion)
  const modulos = cnn().prepare("SELECT DISTINCT modulo FROM auditoria WHERE modulo != '' ORDER BY modulo").all().map((r) => r.modulo)
  return { usuarios, acciones, modulos }
}

function alertas(estado) {
  const w = estado === 'pendientes' ? 'WHERE atendida = 0' : estado === 'atendidas' ? 'WHERE atendida = 1' : ''
  return cnn().prepare(`SELECT * FROM alertas_auditoria ${w} ORDER BY id DESC LIMIT 200`).all()
}

function atenderAlerta(id, req) {
  cnn().prepare('UPDATE alertas_auditoria SET atendida = 1 WHERE id = ?').run(Number(id))
  insertarMeta({
    usuario: req && req.usuario ? req.usuario.username : '',
    ip: ipDe(req),
    accion: 'alerta_atendida',
    detalle: `Alerta de auditoría #${id} marcada como atendida.`
  })
}

module.exports = {
  init,
  registrar,
  insertarMeta,
  middlewareAuto,
  listar,
  registrosParaExportar,
  verificarCadena,
  opciones,
  alertas,
  atenderAlerta,
  ipDe,
  dispositivoDe,
  ocultarSensibles,
  ACCIONES_SENSIBLES
}
