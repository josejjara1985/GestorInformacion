'use strict'

const crypto = require('crypto')
const fs = require('fs')
const backups = require('./backups')
const mailer = require('./mailer')
const auditoria = require('./auditoria')
const tiempo = require('./tiempo')

let intervalo = null
let corriendo = false

function db() {
  return require('./db').openDb()
}

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

function obtenerConfig() {
  const row = db().prepare('SELECT * FROM backup_config WHERE id = 1').get()
  const cfg = { ...row }
  try { cfg.correos = JSON.parse(row.correos || '[]') } catch (_e) { cfg.correos = [] }
  return cfg
}

function guardarConfig(datos) {
  const b = datos || {}
  const actual = obtenerConfig()
  const correos = Array.isArray(b.correos) ? b.correos : actual.correos
  const valores = {
    activo: b.activo === undefined ? actual.activo : (b.activo ? 1 : 0),
    frecuencia: b.frecuencia || actual.frecuencia,
    intervalo_custom_horas: Number(b.intervalo_custom_horas || actual.intervalo_custom_horas || 24),
    hora: b.hora || actual.hora,
    dia_semana: Number(b.dia_semana == null ? actual.dia_semana : b.dia_semana),
    dia_mes: Number(b.dia_mes == null ? actual.dia_mes : b.dia_mes),
    max_copias: Number(b.max_copias || actual.max_copias || 30),
    cifrado: b.cifrado === undefined ? actual.cifrado : (b.cifrado ? 1 : 0),
    redundancia: b.redundancia === undefined ? actual.redundancia : (b.redundancia ? 1 : 0),
    correo_activo: b.correo_activo === undefined ? actual.correo_activo : (b.correo_activo ? 1 : 0),
    correos: JSON.stringify(mailer.normalizarDestinatarios(correos)),
    asunto: b.asunto || actual.asunto,
    adjunto_max_mb: Number(b.adjunto_max_mb || actual.adjunto_max_mb || 20),
    reintentos: Number(b.reintentos || actual.reintentos || 3)
  }
  db().prepare(`
    UPDATE backup_config SET activo=@activo, frecuencia=@frecuencia,
      intervalo_custom_horas=@intervalo_custom_horas, hora=@hora, dia_semana=@dia_semana,
      dia_mes=@dia_mes, max_copias=@max_copias, cifrado=@cifrado, redundancia=@redundancia,
      correo_activo=@correo_activo, correos=@correos, asunto=@asunto,
      adjunto_max_mb=@adjunto_max_mb, reintentos=@reintentos,
      proximo_ejecutado=@proximo, actualizado_en=@ahora
    WHERE id = 1
  `).run({
    ...valores,
    proximo: valores.activo ? calcularProximo(valores) : null,
    ahora: tiempo.ahoraLocal()
  })
  return obtenerConfig()
}

function obtenerEmailConfig(incluirPassword) {
  const row = db().prepare('SELECT * FROM email_config WHERE id = 1').get()
  const cfg = { ...row }
  if (!incluirPassword) cfg.password = cfg.password ? '********' : ''
  return cfg
}

function guardarEmailConfig(datos) {
  const b = datos || {}
  const actual = db().prepare('SELECT * FROM email_config WHERE id = 1').get()
  const password = b.password && b.password !== '********' ? String(b.password) : (actual ? actual.password : '')
  db().prepare(`
    UPDATE email_config SET activo=@activo, host=@host, puerto=@puerto, seguro=@seguro,
      requiere_tls=@requiere_tls, usuario=@usuario, password=@password,
      remitente=@remitente, remitente_nombre=@remitente_nombre, actualizado_en=@ahora
    WHERE id = 1
  `).run({
    activo: b.activo === undefined ? (actual ? actual.activo : 0) : (b.activo ? 1 : 0),
    host: b.host != null ? String(b.host).trim() : (actual ? actual.host : ''),
    puerto: Number(b.puerto || (actual && actual.puerto) || 587),
    seguro: b.seguro === undefined ? (actual ? actual.seguro : 0) : (b.seguro ? 1 : 0),
    requiere_tls: b.requiere_tls === undefined ? (actual ? actual.requiere_tls : 1) : (b.requiere_tls ? 1 : 0),
    usuario: b.usuario != null ? String(b.usuario).trim() : (actual ? actual.usuario : ''),
    password,
    remitente: b.remitente != null ? String(b.remitente).trim() : (actual ? actual.remitente : ''),
    remitente_nombre: b.remitente_nombre || (actual && actual.remitente_nombre) || 'Gestor de Información Juzgado Tumaco',
    ahora: tiempo.ahoraLocal()
  })
  return obtenerEmailConfig(false)
}

/* ------------------------------------------------------------------ */
/* Programación                                                        */
/* ------------------------------------------------------------------ */

function conHora(fecha, hora) {
  return tiempo.conHora(fecha, hora)
}

function fmt(d) {
  return tiempo.fmt(d)
}

function calcularProximo(cfg, desde) {
  const ahora = desde || new Date()
  const frecuencia = cfg.frecuencia || 'diaria'
  if (frecuencia === 'personalizada') {
    const horas = Number(cfg.intervalo_custom_horas) || 24
    return fmt(new Date(ahora.getTime() + horas * 3600 * 1000))
  }
  const partes = tiempo.partesZona(ahora)
  if (frecuencia === 'semanal') {
    const objetivo = Number(cfg.dia_semana) || 0
    let delta = (objetivo - partes.weekday + 7) % 7
    const hoy = conHora(ahora, cfg.hora)
    if (delta === 0 && hoy.getTime() <= ahora.getTime()) delta = 7
    const base = Date.UTC(partes.year, partes.month - 1, partes.day + delta, 12, 0, 0)
    return fmt(conHora(new Date(base), cfg.hora))
  }
  if (frecuencia === 'mensual') {
    const dia = Math.min(28, Math.max(1, Number(cfg.dia_mes) || 1))
    let candidato = tiempo.instanteEnZona({ year: partes.year, month: partes.month, day: dia }, tiempo.parseHora(cfg.hora).h, tiempo.parseHora(cfg.hora).m, 0)
    if (candidato.getTime() <= ahora.getTime()) {
      const mes = partes.month === 12 ? 1 : partes.month + 1
      const anio = partes.month === 12 ? partes.year + 1 : partes.year
      candidato = tiempo.instanteEnZona({ year: anio, month: mes, day: dia }, tiempo.parseHora(cfg.hora).h, tiempo.parseHora(cfg.hora).m, 0)
    }
    return fmt(candidato)
  }
  const hoy = conHora(ahora, cfg.hora)
  if (hoy.getTime() > ahora.getTime()) return fmt(hoy)
  const maniana = Date.UTC(partes.year, partes.month - 1, partes.day + 1, 12, 0, 0)
  return fmt(conHora(new Date(maniana), cfg.hora))
}

/* ------------------------------------------------------------------ */
/* Enlaces seguros                                                     */
/* ------------------------------------------------------------------ */

function firmarEnlace(idBackup, horas) {
  const exp = Date.now() + (Number(horas) || 72) * 3600 * 1000
  const secreto = process.env.BACKUP_KEY || process.env.SESSION_SECRET || 'juzgado-tumaco-gestor-2026'
  const datos = `${idBackup}.${exp}`
  const firma = crypto.createHmac('sha256', secreto).update(datos).digest('hex').slice(0, 32)
  return { exp, token: firma }
}

function verificarEnlace(idBackup, exp, token) {
  if (!exp || !token) return false
  if (Number(exp) < Date.now()) return false
  const secreto = process.env.BACKUP_KEY || process.env.SESSION_SECRET || 'juzgado-tumaco-gestor-2026'
  const esperado = crypto.createHmac('sha256', secreto).update(`${idBackup}.${exp}`).digest('hex').slice(0, 32)
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(String(token)))
  } catch (_e) {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* Envío                                                               */
/* ------------------------------------------------------------------ */

function resumenTexto(reg) {
  return [
    'GESTOR DE INFORMACIÓN - JUZGADO PRIMERO PENAL DEL CIRCUITO ESPECIALIZADO DE TUMACO',
    '',
    'Copia de seguridad generada automáticamente.',
    '',
    `Fecha y hora: ${reg.fecha}`,
    `Archivo: ${reg.nombre}`,
    `Tamaño: ${formatearTamano(reg.tamano)}`,
    `Checksum (SHA-256): ${reg.checksum}`,
    `Estado: ${reg.estado}`,
    `Integridad: ${reg.integridad}`,
    `Cifrado: ${reg.cifrado ? 'Sí (AES-256-GCM)' : 'No'}`,
    `Versión: ${reg.version}`,
    `Tablas: ${reg.tablas} | Índices: ${reg.indices} | Disparadores: ${reg.triggers} | Vistas: ${reg.vistas}`,
    '',
    'Este mensaje fue generado automáticamente por el sistema. No responda a este correo.'
  ].join('\n')
}

function formatearTamano(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(2) + ' MB'
}

async function enviarCopia(reg, opciones) {
  const o = opciones || {}
  const cfg = o.config || obtenerConfig()
  const email = o.emailConfig || obtenerEmailConfig(true)
  const destinatarios = mailer.normalizarDestinatarios(cfg.correos)
  const base = { backup_id: reg.id, destinatarios: JSON.stringify(destinatarios), asunto: cfg.asunto, tamano: reg.tamano, checksum: reg.checksum, usuario: o.usuario || '' }

  if (!cfg.correo_activo) {
    db().prepare(`INSERT INTO correo_envios (backup_id, destinatarios, asunto, tamano, checksum, estado, intentos, resumen, usuario)
      VALUES (@backup_id, @destinatarios, @asunto, @tamano, @checksum, 'omitido', 0, 'Envío por correo desactivado.', @usuario)`).run(base)
    return { ok: false, estado: 'omitido', detalle: 'El envío por correo está desactivado.' }
  }
  if (!destinatarios.length) {
    db().prepare(`INSERT INTO correo_envios (backup_id, destinatarios, asunto, tamano, checksum, estado, intentos, ultimo_error, resumen, usuario)
      VALUES (@backup_id, @destinatarios, @asunto, @tamano, @checksum, 'fallido', 0, @ultimo_error, 'Sin destinatarios válidos.', @usuario)`).run({ ...base, ultimo_error: 'Sin destinatarios válidos.' })
    return { ok: false, estado: 'fallido', detalle: 'Sin destinatarios válidos.' }
  }

  const adjunto = backups.prepararAdjunto(reg, cfg.adjunto_max_mb)
  let enlace = ''
  if (!adjunto) {
    const { exp, token } = firmarEnlace(reg.id, 72)
    const baseUrl = o.baseUrl || ''
    enlace = `${baseUrl}/api/backups/${reg.id}/descargar?exp=${exp}&token=${token}`
  }
  const texto = resumenTexto(reg) + (enlace
    ? `\n\nLa copia supera el tamaño permitido para adjuntar. Descárguela mediante el siguiente enlace seguro (válido 72 horas):\n${enlace}`
    : '')
  const html = '<pre style="font-family:Consolas,monospace;font-size:12px">' + texto.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</pre>'

  try {
    const r = await mailer.enviarConReintentos({
      config: email,
      para: destinatarios,
      asunto: cfg.asunto,
      texto,
      html,
      adjuntos: adjunto ? [adjunto] : []
    }, cfg.reintentos)
    db().prepare(`INSERT INTO correo_envios (backup_id, destinatarios, asunto, tamano, checksum, estado, intentos, resumen, usuario)
      VALUES (@backup_id, @destinatarios, @asunto, @tamano, @checksum, @estado, @intentos, @resumen, @usuario)`).run({
      ...base,
      estado: r.simulado ? 'simulado' : 'enviado',
      intentos: r.intentos || 1,
      resumen: r.simulado ? 'Sin servidor SMTP configurado; mensaje guardado en data/outbox.' : 'Correo enviado correctamente.'
    })
    return { ok: true, estado: r.simulado ? 'simulado' : 'enviado', detalle: r.respuesta }
  } catch (e) {
    db().prepare(`INSERT INTO correo_envios (backup_id, destinatarios, asunto, tamano, checksum, estado, intentos, ultimo_error, resumen, usuario)
      VALUES (@backup_id, @destinatarios, @asunto, @tamano, @checksum, 'fallido', @intentos, @error, 'No se pudo enviar.', @usuario)`).run({
      ...base,
      intentos: e.intentos || 1,
      error: e.message
    })
    return { ok: false, estado: 'fallido', detalle: e.message }
  }
}

async function ejecutar(opciones) {
  const o = opciones || {}
  const cfg = o.config || obtenerConfig()
  const reg = await backups.generar({ db: db(), tipo: o.tipo || 'automatico', usuario: o.usuario || 'sistema', config: cfg, notas: o.notas })
  const correo = o.conCorreo === false ? { estado: 'omitido' } : await enviarCopia(reg, { config: cfg, baseUrl: o.baseUrl, usuario: o.usuario || 'sistema' })
  auditoria.registrar({
    accion: o.tipo === 'manual' ? 'backup_manual' : 'backup_automatico',
    modulo: 'backups',
    registro_id: reg.id,
    usuario_nombre: o.usuario || 'sistema',
    descripcion: `Copia de seguridad #${reg.id} (${reg.nombre}) generada. Correo: ${correo.estado}.`,
    despues: { nombre: reg.nombre, tamano: reg.tamano, checksum: reg.checksum, correo: correo.estado }
  })
  if (correo.estado === 'fallido') {
    alertarCorreoFallido(reg, correo.detalle)
  }
  return { backup: reg, correo }
}

function alertarCorreoFallido(reg, error) {
  try {
    db().prepare(`INSERT INTO alertas_auditoria (tipo, severidad, descripcion, usuario, detalle)
      VALUES ('correo_fallido', 'media', ?, ?, ?)`).run(
      `No se pudo enviar por correo la copia de seguridad #${reg.id}.`,
      'sistema',
      JSON.stringify({ backup_id: reg.id, error: error || '' })
    )
  } catch (_e) { /* ignore */ }
}

function historialEnvios(limite) {
  return db().prepare('SELECT * FROM correo_envios ORDER BY id DESC LIMIT ?').all(Number(limite) || 100)
}

/* ------------------------------------------------------------------ */
/* Bucle del programador                                               */
/* ------------------------------------------------------------------ */

function claveDia(ts) {
  return String(ts || '').slice(0, 10)
}

function debeEjecutar(cfg, ahora) {
  if (!cfg.activo) return false
  const ahoraTxt = fmt(ahora)
  let ultimo = cfg.ultimo_ejecutado || ''
  if (ultimo > ahoraTxt) ultimo = ''
  if (cfg.proximo_ejecutado && ahoraTxt >= cfg.proximo_ejecutado) {
    if (!ultimo || claveDia(ultimo) !== claveDia(cfg.proximo_ejecutado) || ultimo < cfg.proximo_ejecutado) return true
  }
  const frecuencia = cfg.frecuencia || 'diaria'
  if (frecuencia === 'personalizada') {
    if (!cfg.proximo_ejecutado) return true
    return ahoraTxt >= cfg.proximo_ejecutado
  }
  const partes = tiempo.partesZona(ahora)
  if (frecuencia === 'semanal' && partes.weekday !== Number(cfg.dia_semana)) return false
  if (frecuencia === 'mensual' && partes.day !== Number(cfg.dia_mes || 1)) return false
  const slotHoy = fmt(conHora(ahora, cfg.hora))
  if (ahoraTxt < slotHoy) return false
  if (ultimo && ultimo >= slotHoy && claveDia(ultimo) === claveDia(slotHoy)) return false
  return true
}

async function revisar(baseUrl) {
  const cfg = obtenerConfig()
  if (!cfg.activo) return { omitido: true, motivo: 'inactivo' }
  if (corriendo) return { omitido: true, motivo: 'en_curso' }
  const ahora = new Date()
  if (!cfg.proximo_ejecutado) {
    const proximo = calcularProximo(cfg, ahora)
    db().prepare('UPDATE backup_config SET proximo_ejecutado = ? WHERE id = 1').run(proximo)
    if (!debeEjecutar({ ...cfg, proximo_ejecutado: proximo }, ahora)) {
      return { omitido: true, motivo: 'programado', proximo }
    }
  } else if (!debeEjecutar(cfg, ahora)) {
    return { omitido: true, motivo: 'pendiente', proximo: cfg.proximo_ejecutado }
  }
  corriendo = true
  const marca = fmt(ahora)
  try {
    const r = await ejecutar({ tipo: 'automatico', usuario: 'sistema', config: cfg, baseUrl, notas: 'Ejecución programada' })
    const refresco = obtenerConfig()
    db().prepare('UPDATE backup_config SET ultimo_ejecutado = ?, proximo_ejecutado = ? WHERE id = 1')
      .run(marca, refresco.activo ? calcularProximo(refresco, new Date(Date.now() + 60000)) : null)
    return { ok: true, backup: r.backup, correo: r.correo }
  } catch (e) {
    auditoria.registrar({
      accion: 'backup_automatico',
      modulo: 'backups',
      exito: false,
      usuario_nombre: 'sistema',
      descripcion: 'Falló la generación de la copia programada. Se reintentará en 15 minutos.',
      error: e.message
    })
    const reintento = fmt(new Date(Date.now() + 15 * 60 * 1000))
    db().prepare('UPDATE backup_config SET proximo_ejecutado = ? WHERE id = 1').run(reintento)
    return { ok: false, error: e.message, reintento }
  } finally {
    corriendo = false
  }
}

function iniciar(baseUrl) {
  if (intervalo) return
  const cfg = obtenerConfig()
  if (cfg.activo && !cfg.proximo_ejecutado) {
    db().prepare('UPDATE backup_config SET proximo_ejecutado = ? WHERE id = 1').run(calcularProximo(cfg, new Date()))
  }
  revisar(baseUrl).catch(() => {})
  intervalo = setInterval(() => { revisar(baseUrl).catch(() => {}) }, 30 * 1000)
  if (intervalo.unref) intervalo.unref()
}

function estado() {
  const cfg = obtenerConfig()
  const ahora = new Date()
  return {
    activo: !!cfg.activo,
    corriendo,
    frecuencia: cfg.frecuencia,
    hora: cfg.hora,
    zona: tiempo.ZONA,
    ahora: fmt(ahora),
    ultimo_ejecutado: cfg.ultimo_ejecutado,
    proximo_ejecutado: cfg.proximo_ejecutado,
    debe_ejecutar: debeEjecutar(cfg, ahora),
    programador_vivo: !!intervalo
  }
}

function detener() {
  if (intervalo) clearInterval(intervalo)
  intervalo = null
}

module.exports = {
  obtenerConfig,
  guardarConfig,
  obtenerEmailConfig,
  guardarEmailConfig,
  calcularProximo,
  firmarEnlace,
  verificarEnlace,
  enviarCopia,
  ejecutar,
  revisar,
  iniciar,
  detener,
  estado,
  debeEjecutar,
  historialEnvios,
  formatearTamano
}
