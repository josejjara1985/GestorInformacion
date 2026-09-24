'use strict'

const fs = require('fs')
const path = require('path')
const net = require('net')
const tls = require('tls')

const TIMEOUT_COMANDO_MS = 45000
const TIMEOUT_DATOS_MS = 180000
const TAM_BLOQUE = 64 * 1024

function b64(s) {
  return Buffer.from(String(s), 'utf8').toString('base64')
}

function cabeceraSegura(valor) {
  return String(valor == null ? '' : valor).replace(/[\r\n]+/g, ' ').trim()
}

function codificarAsunto(valor) {
  const s = cabeceraSegura(valor)
  if (/^[\x20-\x7E]*$/.test(s)) return s
  return '=?UTF-8?B?' + b64(s) + '?='
}

function normalizarDestinatarios(destinos) {
  let lista = destinos
  if (typeof lista === 'string') {
    try {
      const parsed = JSON.parse(lista)
      lista = Array.isArray(parsed) ? parsed : lista.split(/[,;]/)
    } catch (_e) {
      lista = lista.split(/[,;]/)
    }
  }
  if (!Array.isArray(lista)) lista = [lista]
  return lista
    .map((d) => (typeof d === 'string' ? d : (d && d.correo) || ''))
    .map((d) => d.trim())
    .filter((d) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d))
}

function construirMensaje(opciones) {
  const de = cabeceraSegura(opciones.de)
  const para = normalizarDestinatarios(opciones.para)
  const asunto = codificarAsunto(opciones.asunto)
  const adjuntos = Array.isArray(opciones.adjuntos) ? opciones.adjuntos : []
  const texto = opciones.texto || ''
  const html = opciones.html || ''
  const mixed = 'mixto_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const alt = 'alt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  const lineas = []
  lineas.push('Date: ' + new Date().toUTCString())
  lineas.push('From: ' + de)
  lineas.push('To: ' + para.join(', '))
  lineas.push('Subject: ' + asunto)
  lineas.push('MIME-Version: 1.0')
  if (adjuntos.length) {
    lineas.push('Content-Type: multipart/mixed; boundary="' + mixed + '"')
    lineas.push('')
    lineas.push('--' + mixed)
    lineas.push('Content-Type: multipart/alternative; boundary="' + alt + '"')
    lineas.push('')
    lineas.push('--' + alt)
    lineas.push('Content-Type: text/plain; charset="UTF-8"')
    lineas.push('Content-Transfer-Encoding: base64')
    lineas.push('')
    lineas.push(b64(texto).replace(/(.{76})/g, '$1\r\n'))
    if (html) {
      lineas.push('--' + alt)
      lineas.push('Content-Type: text/html; charset="UTF-8"')
      lineas.push('Content-Transfer-Encoding: base64')
      lineas.push('')
      lineas.push(b64(html).replace(/(.{76})/g, '$1\r\n'))
    }
    lineas.push('--' + alt + '--')
    for (const adj of adjuntos) {
      lineas.push('--' + mixed)
      lineas.push('Content-Type: ' + (adj.tipo || 'application/octet-stream') + '; name="' + cabeceraSegura(adj.nombre) + '"')
      lineas.push('Content-Transfer-Encoding: base64')
      lineas.push('Content-Disposition: attachment; filename="' + cabeceraSegura(adj.nombre) + '"')
      lineas.push('')
      const contenido = adj.contenido || (adj.ruta ? fs.readFileSync(adj.ruta) : Buffer.alloc(0))
      lineas.push(Buffer.from(contenido).toString('base64').replace(/(.{76})/g, '$1\r\n'))
    }
    lineas.push('--' + mixed + '--')
  } else {
    lineas.push('Content-Type: multipart/alternative; boundary="' + alt + '"')
    lineas.push('')
    lineas.push('--' + alt)
    lineas.push('Content-Type: text/plain; charset="UTF-8"')
    lineas.push('Content-Transfer-Encoding: base64')
    lineas.push('')
    lineas.push(b64(texto).replace(/(.{76})/g, '$1\r\n'))
    if (html) {
      lineas.push('--' + alt)
      lineas.push('Content-Type: text/html; charset="UTF-8"')
      lineas.push('Content-Transfer-Encoding: base64')
      lineas.push('')
      lineas.push(b64(html).replace(/(.{76})/g, '$1\r\n'))
    }
    lineas.push('--' + alt + '--')
  }
  return lineas.join('\r\n')
}

function mensajeAmigable(err, host) {
  const raw = err && err.message ? String(err.message) : String(err || '')
  const code = err && err.code ? String(err.code) : ''
  const h = String(host || '').toLowerCase()
  const gmail = h.includes('gmail')
  const outlook = h.includes('office365') || h.includes('outlook')
  const proveedor = gmail ? 'Gmail' : outlook ? 'Outlook' : 'El servidor SMTP'
  if (code === 'ECANCELED' || /ECANCELED/i.test(raw)) {
    return proveedor + ' cerró la conexión durante el envío. Se reintentará automáticamente. Si persiste, use puerto 587 con SSL directo desmarcado, o puerto 465 con SSL directo marcado.'
  }
  if (code === 'ETIMEDOUT' || /tiempo de espera/i.test(raw) || /timeout/i.test(raw)) {
    return 'Tiempo de espera agotado al hablar con ' + proveedor + '. Verifique red, host y puerto (Gmail/Outlook: 587 STARTTLS).'
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'No se resolvió el servidor SMTP (' + host + ').'
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return proveedor + ' rechazó o reinició la conexión. Pruebe puerto 587 (STARTTLS) o 465 (SSL).'
  }
  if (/\b534\b/.test(raw) || /Application-specific password/i.test(raw) || /InvalidSecondFactor/i.test(raw)) {
    return 'Gmail exige una contraseña de aplicación (no la contraseña de la cuenta). Active la verificación en 2 pasos y cree una contraseña de aplicación de 16 caracteres.'
  }
  if (/\b535\b/.test(raw) || /Authentication unsuccessful/i.test(raw)) {
    return proveedor + ' rechazó el usuario o la contraseña (SMTP 535). El usuario debe ser el correo completo. Con MFA use una contraseña de aplicación y, en Outlook, active SMTP AUTH.'
  }
  if (/\b530\b/.test(raw) || /STARTTLS/i.test(raw) && /required/i.test(raw)) {
    return proveedor + ' exige STARTTLS. Deje SSL directo desmarcado en puerto 587.'
  }
  if (/\b553\b/.test(raw) || /\b555\b/.test(raw) || /not authorized/i.test(raw)) {
    return 'El remitente no está autorizado. El correo remitente debe ser exactamente la misma cuenta del usuario SMTP.'
  }
  return raw.replace(/[A-Za-z0-9+/]{12,}={0,2}/g, '[dato]')
}

class SesionSmtp {
  constructor() {
    this.buf = ''
    this.lineas = []
    this.cola = []
    this.esperas = []
    this.cerrado = false
    this.sock = null
  }

  unir(sock) {
    this.sock = sock
    sock.on('data', (d) => this.push(d))
    sock.on('error', (e) => this.fail(e))
    sock.on('close', () => {
      if (!this.cerrado) this.fail(Object.assign(new Error('Conexión SMTP cerrada por el servidor.'), { code: 'ECONNRESET' }))
    })
  }

  push(chunk) {
    this.buf += chunk.toString('utf8')
    let idx
    while ((idx = this.buf.indexOf('\r\n')) >= 0) {
      const linea = this.buf.slice(0, idx)
      this.buf = this.buf.slice(idx + 2)
      this.lineas.push(linea)
      const m = /^(\d{3})([ -])/.exec(linea)
      if (m && m[2] === ' ') {
        const resp = { code: Number(m[1]), texto: this.lineas.join('\n') }
        this.lineas = []
        if (this.esperas.length) this.esperas.shift().resolve(resp)
        else this.cola.push(resp)
      }
    }
  }

  esperar(ms) {
    if (this.cola.length) return Promise.resolve(this.cola.shift())
    if (this.cerrado) return Promise.reject(Object.assign(new Error('Conexión SMTP cerrada.'), { code: 'ECONNRESET' }))
    return new Promise((resolve, reject) => {
      const entrada = { resolve: null, reject: null }
      const timer = setTimeout(() => {
        const i = this.esperas.indexOf(entrada)
        if (i >= 0) this.esperas.splice(i, 1)
        reject(Object.assign(new Error('Tiempo de espera agotado esperando respuesta SMTP'), { code: 'ETIMEDOUT' }))
      }, ms || TIMEOUT_COMANDO_MS)
      entrada.resolve = (valor) => { clearTimeout(timer); resolve(valor) }
      entrada.reject = (err) => { clearTimeout(timer); reject(err) }
      this.esperas.push(entrada)
    })
  }

  fail(err) {
    this.cerrado = true
    const error = err instanceof Error ? err : new Error(String(err))
    while (this.esperas.length) this.esperas.shift().reject(error)
  }

  cerrar() {
    this.cerrado = true
    while (this.esperas.length) {
      this.esperas.shift().reject(Object.assign(new Error('Sesión SMTP finalizada.'), { code: 'ECANCELED' }))
    }
    const s = this.sock
    this.sock = null
    if (!s) return
    try { s.setTimeout(0) } catch (_e) { /* ignore */ }
    try { s.removeAllListeners('data') } catch (_e) { /* ignore */ }
    try { s.removeAllListeners('timeout') } catch (_e) { /* ignore */ }
    if (!s.destroyed) {
      try { s.end() } catch (_e) {
        try { s.destroy() } catch (_e2) { /* ignore */ }
      }
    }
  }
}

function escribir(sock, datos) {
  return new Promise((resolve, reject) => {
    if (!sock || sock.destroyed) {
      return reject(Object.assign(new Error('El socket SMTP no está disponible.'), { code: 'EPIPE' }))
    }
    const buf = Buffer.isBuffer(datos) ? datos : Buffer.from(String(datos), 'utf8')
    sock.write(buf, (err) => err ? reject(err) : resolve())
  })
}

async function escribirPorBloques(sock, texto) {
  const buf = Buffer.from(String(texto), 'utf8')
  for (let i = 0; i < buf.length; i += TAM_BLOQUE) {
    await escribir(sock, buf.subarray(i, i + TAM_BLOQUE))
  }
}

function conectarTcp(config) {
  return new Promise((resolve, reject) => {
    const host = String(config.host || '').trim()
    const port = Number(config.puerto) || 587
    const opciones = {
      host,
      port,
      family: 4,
      servername: host
    }
    let setted = false
    const alListo = (sock) => {
      if (setted) return
      setted = true
      sock.setKeepAlive(true, 15000)
      sock.setNoDelay(true)
      sock.setTimeout(0)
      resolve(sock)
    }
    const sock = config.seguro
      ? tls.connect({ ...opciones, rejectUnauthorized: config.tls_reject_unauthorized !== false }, () => alListo(sock))
      : net.connect({ host, port, family: 4 }, () => alListo(sock))
    sock.once('error', (e) => {
      if (!setted) reject(e)
    })
    sock.once('timeout', () => {
      const err = Object.assign(new Error('Tiempo de espera agotado al conectar con SMTP'), { code: 'ETIMEDOUT' })
      if (!setted) {
        setted = true
        try { sock.destroy() } catch (_e) { /* ignore */ }
        reject(err)
      }
    })
  })
}

async function startTls(sock, host) {
  sock.setTimeout(0)
  sock.removeAllListeners('data')
  sock.removeAllListeners('timeout')
  sock.removeAllListeners('error')
  sock.removeAllListeners('close')
  return new Promise((resolve, reject) => {
    const seguro = tls.connect({
      socket: sock,
      host,
      servername: host,
      rejectUnauthorized: true
    })
    const onErr = (e) => reject(e)
    seguro.once('error', onErr)
    seguro.once('secureConnect', () => {
      seguro.removeListener('error', onErr)
      seguro.setKeepAlive(true, 15000)
      seguro.setNoDelay(true)
      seguro.setTimeout(0)
      resolve(seguro)
    })
  })
}

async function comando(sesion, sock, cmd, esperados, timeoutMs) {
  if (cmd != null) await escribir(sock, cmd + '\r\n')
  const resp = await sesion.esperar(timeoutMs || TIMEOUT_COMANDO_MS)
  if (esperados && !esperados.includes(resp.code)) {
    const err = new Error(errorSmtp(cmd, resp))
    err.smtp = resp.code
    throw err
  }
  return resp
}

function etiquetaSmtp(cmd) {
  if (cmd == null) return 'respuesta'
  if (/^AUTH\b/i.test(cmd)) return 'AUTH'
  if (/^[A-Za-z0-9+/]+=*$/.test(cmd) && cmd.length >= 8) return 'AUTH'
  return String(cmd).split(' ')[0]
}

function errorSmtp(cmd, resp) {
  const texto = String(resp.texto || '').replace(/\s+/g, ' ').trim()
  if (resp.code === 534 || /Application-specific password/i.test(texto)) {
    return 'Gmail exige una contraseña de aplicación (SMTP 534). Active la verificación en 2 pasos y cree una contraseña de aplicación de 16 caracteres. No use la contraseña normal de Gmail.'
  }
  if (resp.code === 535) {
    return 'El servidor rechazó el usuario o la contraseña (SMTP 535). El usuario debe ser el correo completo. Con MFA use una contraseña de aplicación y, en Outlook, active SMTP AUTH.'
  }
  return `SMTP ${etiquetaSmtp(cmd)} -> ${resp.code}: ${texto}`
}

async function autenticar(sesion, sock, config) {
  const usuario = String(config.usuario || '').trim()
  const password = String(config.password || '')
  if (!usuario) throw new Error('Falta el usuario SMTP. Debe ser el correo completo (por ejemplo cuenta@gmail.com).')
  if (!usuario.includes('@')) {
    throw new Error('El usuario SMTP no es un correo. Debe ser la cuenta completa, no el usuario de esta aplicación.')
  }
  if (!password) throw new Error('Falta la contraseña SMTP. En Gmail y Outlook con MFA use una contraseña de aplicación.')

  let authLoginOk = false
  try {
    const r = await comando(sesion, sock, 'AUTH LOGIN', [334, 504, 535, 534])
    if (r.code === 334) {
      await comando(sesion, sock, b64(usuario), [334, 535, 534])
      await comando(sesion, sock, b64(password), [235])
      authLoginOk = true
    }
  } catch (e) {
    if (e.smtp === 235) authLoginOk = true
    else if (e.smtp === 534 || e.smtp === 535) throw e
  }
  if (authLoginOk) return
  const plano = b64('\u0000' + usuario + '\u0000' + password)
  await comando(sesion, sock, 'AUTH PLAIN ' + plano, [235])
}

async function entregarUna(config, mensaje) {
  const host = String(config.host || '').trim()
  let sock = await conectarTcp(config)
  let sesion = new SesionSmtp()
  sesion.unir(sock)
  const cerrarTodo = () => { try { sesion.cerrar() } catch (_e) { /* ignore */ } }
  try {
    await comando(sesion, sock, null, [220])
    await comando(sesion, sock, 'EHLO gestor.juzgado-tumaco.local', [250])
    if (config.requiere_tls !== false && !config.seguro) {
      const r = await comando(sesion, sock, 'STARTTLS', [220, 250, 502, 454])
      if (r.code === 220 || r.code === 250) {
        sock = await startTls(sock, host)
        sesion.cerrado = true
        sesion.esperas = []
        sesion.sock = null
        sesion = new SesionSmtp()
        sesion.unir(sock)
        await comando(sesion, sock, 'EHLO gestor.juzgado-tumaco.local', [250])
      }
    }
    await autenticar(sesion, sock, config)
    const de = String(config.remitente || config.usuario || '').trim()
    await comando(sesion, sock, 'MAIL FROM:<' + de + '>', [250])
    for (const destino of mensaje.para) {
      await comando(sesion, sock, 'RCPT TO:<' + destino + '>', [250, 251])
    }
    await comando(sesion, sock, 'DATA', [354])
    sock.setTimeout(0)
    const cuerpo = mensaje.crudo.replace(/\r?\n\./g, '\r\n..')
    await escribirPorBloques(sock, cuerpo + '\r\n.\r\n')
    const fin = await sesion.esperar(TIMEOUT_DATOS_MS)
    if (fin.code !== 250) throw new Error('SMTP DATA -> ' + fin.code + ': ' + fin.texto)
    try { await comando(sesion, sock, 'QUIT', [221], 8000) } catch (_e) { /* ignore */ }
    return { ok: true, respuesta: fin.texto }
  } finally {
    cerrarTodo()
    sesion.cerrar()
  }
}

function variantesConfig(config) {
  const base = { ...config, host: String(config.host || '').trim() }
  const lista = [base]
  const host = base.host.toLowerCase()
  const puerto = Number(base.puerto) || 587
  const esGmail = host.includes('gmail')
  const esOutlook = host.includes('office365') || host.includes('outlook')
  if ((esGmail || esOutlook) && !base.seguro && puerto === 587) {
    lista.push({ ...base, puerto: 465, seguro: 1, requiere_tls: 0 })
  }
  return lista
}

async function entregar(config, mensaje) {
  const lista = variantesConfig(config)
  let ultimo = null
  for (let i = 0; i < lista.length; i++) {
    try {
      return await entregarUna(lista[i], mensaje)
    } catch (e) {
      ultimo = e
      const reintentable = e && (e.code === 'ECANCELED' || e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET' || e.code === 'EPIPE' || /ECANCELED/i.test(e.message || ''))
      if (!reintentable || i === lista.length - 1) {
        const err = new Error(mensajeAmigable(e, config.host))
        err.code = e.code
        err.smtp = e.smtp
        throw err
      }
    }
  }
  throw ultimo || new Error('No se pudo enviar el correo.')
}

function directorioSalida() {
  const dir = path.join(__dirname, '..', 'data', 'outbox')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function simular(mensaje) {
  const nombre = 'correo-' + new Date().toISOString().replace(/[:.]/g, '-') + '.eml'
  const destino = path.join(directorioSalida(), nombre)
  fs.writeFileSync(destino, mensaje.crudo, 'utf8')
  return { ok: true, simulado: true, archivo: destino, respuesta: 'Sin servidor SMTP configurado; mensaje guardado localmente.' }
}

async function enviar(opciones) {
  const config = opciones.config || {}
  const para = normalizarDestinatarios(opciones.para)
  if (!para.length) throw new Error('No hay destinatarios válidos configurados.')
  const de = config.remitente || config.usuario || 'juzgado@tumaco.local'
  const nombre = config.remitente_nombre || 'Gestor de Información Juzgado Tumaco'
  const mensaje = {
    de: nombre + ' <' + de + '>',
    para,
    asunto: opciones.asunto || 'Notificación del Gestor de Información',
    texto: opciones.texto || '',
    html: opciones.html || '',
    adjuntos: opciones.adjuntos || [],
    crudo: ''
  }
  mensaje.crudo = construirMensaje(mensaje)
  if (!config.activo || !config.host) return simular(mensaje)
  return entregar(config, mensaje)
}

async function enviarConReintentos(opciones, intentos) {
  const max = Math.max(1, Number(intentos) || 3)
  let ultimoError = null
  for (let i = 1; i <= max; i++) {
    try {
      const r = await enviar(opciones)
      return { ...r, intentos: i }
    } catch (e) {
      ultimoError = e
      const auth = e && (e.smtp === 534 || e.smtp === 535 || /contraseña de aplicación|rechazó el usuario/i.test(e.message || ''))
      if (auth) break
      if (i < max) await new Promise((r) => setTimeout(r, Math.min(8000, 1500 * i)))
    }
  }
  const err = ultimoError || new Error('No se pudo enviar el correo.')
  err.intentos = max
  throw err
}

module.exports = {
  enviar,
  enviarConReintentos,
  normalizarDestinatarios,
  construirMensaje,
  directorioSalida
}
