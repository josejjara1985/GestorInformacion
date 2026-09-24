'use strict'

const state = {
  usuario: null,
  vista: 'inicio',
  tablas: null,
  modulo: null,
  moduloPagina: 1,
  totalModulo: 0,
  estTabla: null,
  calMes: null,
  calDia: null,
  calEventos: [],
  alertas: null,
  ovPagina: 1,
  ovId: null,
  ovTipo: 'orden',
  ovArchivo: '',
  estDetalles: {},
  estDetalleCols: {},
  estDetalleTitulos: {},
  ffPagina: 1,
  audPagina: 1,
  audPaginas: 1,
  audRegistros: {},
  bdConfig: null,
  directorios: null
}

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => Array.from(document.querySelectorAll(sel))

// ============ ICONOGRAFÍA (SVG institucional unificada) ============
const ICONOS = {
  inicio: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.2 9.6V21h13.6V9.6"/><path d="M9.6 21v-5.8h4.8V21"/>',
  reportes: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M2 20h20"/>',
  completo: '<path d="M6 2.5h8.5l4.5 4.5v14.5H6z"/><path d="M14.5 2.5V7H19"/><path d="M9 12.5h7"/><path d="M9 16.5h7"/>',
  estadistica: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  'fijar-fecha': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m8.5 15.5 2 2 4-4"/>',
  oficios: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3 7.5 9 6 9-6"/>',
  oficio: '<path d="M7 2.5h7l5 5v14H7z"/><path d="M14 2.5v5h5"/><path d="M10 13h6M10 17h6"/>',
  actas: '<path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2z"/><path d="M9.5 8h5"/>',
  acta: '<path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2z"/>',
  directorio: '<rect x="5.5" y="3" width="13" height="18" rx="2"/><circle cx="12" cy="10" r="2.4"/><path d="M8.4 17c.7-1.7 2-2.5 3.6-2.5s2.9.8 3.6 2.5"/>',
  usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M3.2 20a5.8 5.8 0 0 1 11.6 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.4 14.6A5.6 5.6 0 0 1 20.8 20"/>',
  bd: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  auditoria: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.2-4.2"/><path d="M10.5 7.8v5.4M7.8 10.5h5.4"/>',
  estructura: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/>',
  procesos: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  tutelas: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m8 7-3 6h6z"/><path d="m16 7-3 6h6z"/><path d="M8.5 21h7"/>',
  apelaciones: '<path d="M8 8V4h12v12h-4"/><path d="M4 8h12v12H4z"/>',
  ley600: '<path d="M5 4h10a2.5 2.5 0 0 1 2.5 2.5V21H7.5A2.5 2.5 0 0 1 5 18.5z"/><path d="M17.5 6.5A2.5 2.5 0 0 1 20 9v12H7.5"/><path d="M8.5 9h6"/>',
  disciplinarios: '<path d="M12 3 2.6 20h18.8z"/><path d="M12 9.5v4.2"/><circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none"/>',
  fiscales: '<circle cx="12" cy="8" r="3.2"/><path d="M5.2 20a6.8 6.8 0 0 1 13.6 0"/>',
  defensores: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m8 7-3 6h6z"/><path d="m16 7-3 6h6z"/>',
  procuradores: '<circle cx="12" cy="8" r="3.2"/><path d="M5.2 20a6.8 6.8 0 0 1 13.6 0"/><path d="M12 11.5v4"/>',
  directorio_victimas: '<circle cx="12" cy="8" r="3.2"/><path d="M5.2 20a6.8 6.8 0 0 1 13.6 0"/><path d="M12 5v6"/>',
  inpec: '<path d="M3 21V8l9-5 9 5v13"/><path d="M9.5 21v-6h5v6"/><path d="M3 21h18"/>',
  rama_judicial: '<path d="M12 3 3 7.5V21h18V7.5z"/><path d="M12 7v14"/><path d="M8 12h8"/>',
  carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
}

function ico(nombre) {
  const p = ICONOS[nombre] || ICONOS.carpeta
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>'
}

function pintarIconos(raiz) {
  const cont = raiz || document
  cont.querySelectorAll('[data-ico]').forEach((el) => {
    if (el.dataset.icoPintado === '1') return
    el.innerHTML = ico(el.dataset.ico)
    el.dataset.icoPintado = '1'
  })
}

const ROLES_LABEL = { administrador: 'Administrador', usuario: 'Usuario', consulta: 'Consulta' }
function rolLabel(rol) { return ROLES_LABEL[rol] || rol || '' }
function esAdministrador() { return !!(state.usuario && state.usuario.rol === 'administrador') }

const VISTAS_ADMIN = ['usuarios', 'bd', 'auditoria', 'estructura']
function puedeVerVista(nombre) { return !VISTAS_ADMIN.includes(nombre) || esAdministrador() }

const SECCIONES_VISTA = {
  inicio: 'General', reportes: 'Reportes', completo: 'Reportes', estadistica: 'Reportes',
  calendario: 'General', 'fijar-fecha': 'Reportes', 'orden-verbal': 'Oficios',
  usuarios: 'Administración', bd: 'Administración', auditoria: 'Administración', estructura: 'Administración'
}
const TITULOS_VISTA = {
  inicio: 'Inicio', reportes: 'Consultas y Reportes', completo: 'Completo', estadistica: 'Estadística',
  calendario: 'Calendario', 'fijar-fecha': 'Reporte Fijar Fecha', 'orden-verbal': 'Oficios',
  usuarios: 'Usuarios', bd: 'Base de Datos', auditoria: 'Auditoría', estructura: 'Estructura'
}
const OFICIO_LABEL = {
  orden: 'Orden Verbal', recordatorio: 'Recordatorio de Audiencia', acta: 'Reporte Audiencias',
  constancia: 'Constancia Audiencia', 'solicitud-defensor': 'Solicitud Defensor', acusacion: 'Acusación',
  preparatoria: 'Preparatoria', 'auto-pruebas': 'Auto pruebas', 'juicio-oral': 'Juicio',
  'sentido-fallo': 'Sentido Fallo Individualización Pena 447', 'individualizacion-pena': 'Individualización Pena 447',
  'lectura-sentencia': 'Lectura Sentencia', preacuerdo: 'Preacuerdo', 'solicitud-preclusion': 'Solicitud Preclusión'
}

const TIPOS_OFICIO = [
  'orden', 'recordatorio', 'acta', 'constancia', 'solicitud-defensor', 'acusacion', 'preparatoria', 'auto-pruebas',
  'juicio-oral', 'sentido-fallo', 'individualizacion-pena', 'lectura-sentencia', 'preacuerdo', 'solicitud-preclusion'
]
const TIPOS_WORD = [
  'constancia', 'solicitud-defensor', 'acusacion', 'preparatoria', 'auto-pruebas',
  'juicio-oral', 'sentido-fallo', 'individualizacion-pena', 'lectura-sentencia', 'preacuerdo', 'solicitud-preclusion'
]

function normalizarTipoOficio(v) {
  return TIPOS_OFICIO.includes(v) ? v : 'orden'
}

const PASS_ESPECIALES = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const PASS_SECUENCIAS = [
  '012345', '123456', '234567', '345678', '456789', '567890', '678901',
  '987654', '876543', '765432', '654321', '543210', '098765',
  'qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty', 'password', 'contrasena',
  'abcdef', 'fedcba', 'admin12', 'qazwsx', '1q2w3e'
]
const PASS_FILAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'abcdefghijklmnopqrstuvwxyz', '0123456789']

function passTieneSecuencia(p) {
  const s = String(p || '').toLowerCase()
  if (PASS_SECUENCIAS.some((x) => s.includes(x))) return true
  for (const fila of PASS_FILAS) {
    const rev = fila.split('').reverse().join('')
    for (let n = 4; n <= 6; n++) {
      for (let i = 0; i <= fila.length - n; i++) {
        if (s.includes(fila.slice(i, i + n)) || s.includes(rev.slice(i, i + n))) return true
      }
    }
  }
  return false
}

function passPersonales(p, datos) {
  const s = String(p || '').toLowerCase()
  const vals = []
  for (const v of Object.values(datos || {})) {
    const raw = String(v || '').trim().toLowerCase()
    if (!raw) continue
    vals.push(raw, raw.replace(/\s+/g, ''))
    for (const parte of raw.split(/[\s@._-]+/)) if (parte.length >= 3) vals.push(parte)
  }
  return vals.some((d) => d && d.length >= 3 && s.includes(d))
}

function requisitosClave(p, datos) {
  const s = String(p == null ? '' : p)
  return {
    longitud: s.length >= 6,
    mayuscula: /[A-Z]/.test(s),
    minuscula: /[a-z]/.test(s),
    numero: /[0-9]/.test(s),
    especial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(s),
    sinEspacios: s.length > 0 && !/\s/.test(s),
    sinSecuencia: s.length > 0 && !passTieneSecuencia(s),
    sinPersonales: s.length > 0 && !passPersonales(s, datos)
  }
}

function validarClaveSegura(p, datos) {
  const r = requisitosClave(p, datos)
  const errores = []
  if (!r.longitud) errores.push('La clave debe tener al menos 6 caracteres.')
  if (!r.sinEspacios) errores.push('No se permiten espacios.')
  if (!r.mayuscula) errores.push('Debe incluir al menos 1 letra mayúscula (A-Z).')
  if (!r.minuscula) errores.push('Debe incluir al menos 1 letra minúscula (a-z).')
  if (!r.numero) errores.push('Debe incluir al menos 1 número (0-9).')
  if (!r.especial) errores.push('Debe incluir al menos 1 carácter especial (' + PASS_ESPECIALES + ').')
  if (!r.sinSecuencia) errores.push('No se permiten secuencias (123456, qwerty) ni claves obvias.')
  if (!r.sinPersonales) errores.push('No se permiten datos personales en la clave.')
  return { ok: errores.length === 0, errores, requisitos: r }
}

function pintarRequisitosClave(input, datos) {
  const lista = $('#passRequisitos')
  if (!lista) return
  const r = requisitosClave(input ? input.value : '', datos)
  lista.querySelectorAll('li[data-req]').forEach((li) => {
    const ok = !!r[li.dataset.req]
    li.classList.toggle('req-ok', ok)
  })
}

function mostrarToast(msg, tipo) {
  const t = $('#toast')
  t.textContent = msg
  t.className = 'toast ' + (tipo || '')
  t.classList.remove('hidden')
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.add('hidden'), 4000)
}

async function api(url, opts) {
  const extra = opts || {}
  const headers = { ...(extra.headers || {}) }
  if (extra.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    credentials: 'include',
    ...extra,
    headers
  })
  let data = null
  try { data = await res.json() } catch (e) { /* sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 403) {
      mostrarToast((data && data.error) || 'No tiene permiso para esta acción.', 'error')
    }
    throw new Error((data && data.error) || 'Error en la solicitud.')
  }
  return data
}

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fechaActual() { return hoyISO() }
function fechaInicioMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function puedeEditar() {
  return state.usuario && (state.usuario.rol === 'administrador' || state.usuario.rol === 'usuario')
}
function puedeAdmin() {
  return state.usuario && state.usuario.rol === 'administrador'
}

// ============ AUTENTICACIÓN ============

const LOGIN_MAX_INTENTOS = 5
const LOGIN_BLOQUEO_MS = 60 * 1000
let loginIntentos = 0
let loginBloqueoHasta = 0
let loginTimer = null

function loginRestanteSeg() {
  return Math.max(0, Math.ceil((loginBloqueoHasta - Date.now()) / 1000))
}

function mostrarAlertaLogin(msg) {
  const alerta = $('#loginAlerta')
  const err = $('#loginError')
  if (err) err.textContent = msg || ''
  if (alerta) alerta.classList.toggle('hidden', !msg)
}

function estadoBotonIngresar(cargando, texto) {
  const btn = $('#btnIngresar')
  if (!btn) return
  btn.disabled = !!cargando || loginRestanteSeg() > 0
  btn.classList.toggle('cargando', !!cargando)
  if (cargando) {
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>Ingresando...'
  } else {
    btn.textContent = texto || 'Ingresar'
  }
}

function aplicarBloqueoLogin() {
  const s = loginRestanteSeg()
  const btn = $('#btnIngresar')
  if (s <= 0) {
    if (loginTimer) { clearInterval(loginTimer); loginTimer = null }
    estadoBotonIngresar(false)
    return
  }
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Intente de nuevo en ' + s + ' s'
  }
}

function iniciarBloqueoLogin() {
  loginBloqueoHasta = Date.now() + LOGIN_BLOQUEO_MS
  aplicarBloqueoLogin()
  if (loginTimer) clearInterval(loginTimer)
  loginTimer = setInterval(() => {
    aplicarBloqueoLogin()
    if (loginRestanteSeg() <= 0) {
      mostrarAlertaLogin('')
    }
  }, 250)
}

async function intentarLogin(e) {
  e.preventDefault()
  mostrarAlertaLogin('')
  if (loginRestanteSeg() > 0) {
    mostrarAlertaLogin('Demasiados intentos fallidos. Espere ' + loginRestanteSeg() + ' segundos.')
    aplicarBloqueoLogin()
    return
  }
  estadoBotonIngresar(true)
  try {
    const user = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('#loginUsername').value.trim(), password: $('#loginPassword').value })
    })
    loginIntentos = 0
    loginBloqueoHasta = 0
    state.usuario = user
    if (!state.tablas) await cargarTablas()
    entrarApp()
  } catch (err) {
    loginIntentos += 1
    const generico = 'Usuario o contraseña incorrectos.'
    if (loginIntentos >= LOGIN_MAX_INTENTOS) {
      iniciarBloqueoLogin()
      mostrarAlertaLogin('Demasiados intentos fallidos. Espere un minuto e intente de nuevo.')
    } else {
      mostrarAlertaLogin(generico)
      estadoBotonIngresar(false)
    }
  }
}

async function salir() {
  try { await api('/api/logout', { method: 'POST' }) } catch (e) { /* ignorar */ }
  state.usuario = null
  $('#vistaApp').classList.add('hidden')
  $('#vistaLogin').classList.remove('hidden')
  $('#loginUsername').value = ''
  $('#loginPassword').value = ''
  mostrarAlertaLogin('')
  estadoBotonIngresar(false)
}

function abrirModalPassword() {
  const form = $('#formPassword')
  if (form) form.reset()
  const err = $('#passError')
  if (err) err.textContent = ''
  pintarRequisitosClave($('#passNueva'), state.usuario || {})
  $('#modalPassword').classList.remove('hidden')
  const actual = $('#passActual')
  if (actual) actual.focus()
}

async function guardarPasswordPropia(e) {
  e.preventDefault()
  const err = $('#passError')
  if (err) err.textContent = ''
  const actual = $('#passActual').value
  const nueva = $('#passNueva').value
  const confirmar = $('#passConfirmar').value
  const datos = {
    username: state.usuario && state.usuario.username,
    nombre: state.usuario && state.usuario.nombre
  }
  const chequeo = validarClaveSegura(nueva, datos)
  if (!chequeo.ok) {
    if (err) err.textContent = chequeo.errores[0]
    pintarRequisitosClave($('#passNueva'), datos)
    return
  }
  if (nueva !== confirmar) {
    if (err) err.textContent = 'La confirmación no coincide con la nueva contraseña.'
    return
  }
  try {
    await api('/api/me/password', {
      method: 'PUT',
      body: JSON.stringify({ actual, nueva, confirmar })
    })
    cerrarModal('modalPassword')
    mostrarToast('Contraseña actualizada correctamente.', 'success')
  } catch (ex) {
    if (err) err.textContent = ex.message
    mostrarToast(ex.message, 'error')
  }
}

async function iniciar() {
  try {
    state.usuario = await api('/api/me')
    await cargarTablas()
    entrarApp()
  } catch (e) {
    $('#vistaLogin').classList.remove('hidden')
  }
}

function entrarApp() {
  $('#vistaLogin').classList.add('hidden')
  $('#vistaApp').classList.remove('hidden')
  $('#usuarioNombre').textContent = state.usuario.nombre
  $('#usuarioRol').textContent = rolLabel(state.usuario.rol)
  ocultarRol()
  pintarIconos()
  aplicarTitulosNav()
  let colapsado = false
  try { colapsado = localStorage.getItem(NAV_COLAPSO_KEY) === '1' } catch (e) { /* sin almacenamiento */ }
  aplicarNavColapsado(colapsado)
  observarTablas()
  cambiarVista('inicio')
}

// ============ METADATA Y NAVEGACIÓN ============

const ORDEN_MODULOS = [
  'procesos', 'tutelas', 'apelaciones', 'ley600', 'disciplinarios'
]
const ORDEN_DIRECTORIOS = [
  'fiscales', 'defensores', 'procuradores', 'directorio_victimas', 'inpec', 'rama_judicial'
]

function tablasOrdenadas() {
  return ORDEN_MODULOS.concat(ORDEN_DIRECTORIOS).filter((t) => state.tablas && state.tablas[t])
}

function pintarNavGrupo(id, claves) {
  const el = document.getElementById(id)
  if (!el) return
  el.innerHTML = claves
    .filter((t) => state.tablas[t])
    .map((t) => `<button class="nav-item" data-vista="modulo" data-modulo="${t}"><span class="nav-ico" data-ico="${t}"></span><span class="nav-label">${esc(state.tablas[t].titulo)}</span></button>`)
    .join('')
}

function pintarNavSubmenu(id, claves) {
  const el = document.getElementById(id)
  if (!el) return
  el.innerHTML = claves
    .filter((t) => state.tablas[t])
    .map((t) => `<button class="nav-subitem" data-vista="modulo" data-modulo="${esc(t)}"><span class="nav-ico" data-ico="${t}"></span><span class="nav-label">${esc(state.tablas[t].titulo)}</span></button>`)
    .join('')
}

async function cargarTablas() {
  state.tablas = await api('/api/tablas')
  const modulos = tablasOrdenadas()
  pintarNavGrupo('navModulos', ORDEN_MODULOS)
  pintarNavSubmenu('navDirectoriosSub', ORDEN_DIRECTORIOS)
  pintarIconos($('#sidebar'))
  aplicarTitulosNav()
  $('#repModulo').innerHTML = modulos
    .filter((t) => state.tablas[t].fecha_entrada)
    .map((t) => `<option value="${t}">${esc(state.tablas[t].titulo)}</option>`)
    .join('')
  $('#repModulo').value = state.repModulo || 'procesos'
  const selComp = $('#compModulo')
  if (selComp) {
    selComp.innerHTML = '<option value="">Todos los módulos</option>' +
      modulos.map((t) => `<option value="${t}">${esc(state.tablas[t].titulo)}</option>`).join('')
  }
}

function ocultarRol() {
  const user = state.usuario
  $$('[data-rol]').forEach((el) => {
    const roles = el.getAttribute('data-rol').split(',').map((s) => s.trim())
    el.classList.toggle('hidden', !(user && roles.includes(user.rol)))
  })
  $$('.sidebar-seccion').forEach((sec) => {
    let visible = false
    let n = sec.nextElementSibling
    while (n && !n.classList.contains('sidebar-seccion')) {
      if (!n.classList.contains('hidden')) { visible = true; break }
      n = n.nextElementSibling
    }
    sec.classList.toggle('hidden', !visible)
  })
}

const OFICIOS_ACTAS = {
  orden: 'Oficios', recordatorio: 'Oficios', acta: 'Oficios', constancia: 'Oficios', 'solicitud-defensor': 'Oficios',
  acusacion: 'Actas', preparatoria: 'Actas', 'auto-pruebas': 'Actas', 'juicio-oral': 'Actas', 'sentido-fallo': 'Actas',
  'individualizacion-pena': 'Actas', 'lectura-sentencia': 'Actas', preacuerdo: 'Actas', 'solicitud-preclusion': 'Actas'
}

function actualizarBreadcrumb(nombre, modulo, oficio) {
  const bc = $('#breadcrumb')
  if (!bc) return
  let seccion = SECCIONES_VISTA[nombre] || ''
  let titulo = TITULOS_VISTA[nombre] || nombre
  if (nombre === 'modulo') {
    const esDirectorio = ORDEN_DIRECTORIOS.includes(modulo)
    seccion = esDirectorio ? 'Directorio' : 'Procesos'
    titulo = state.tablas && state.tablas[modulo] ? state.tablas[modulo].titulo : 'Módulo'
  }
  if (nombre === 'orden-verbal') {
    const t = normalizarTipoOficio(oficio)
    seccion = OFICIOS_ACTAS[t] || 'Oficios'
    titulo = OFICIO_LABEL[t] || 'Oficio'
  }
  const partes = ['<a href="#" data-bc="inicio">Inicio</a>']
  if (seccion && nombre !== 'inicio') partes.push('<span class="bc-sep">/</span><span>' + esc(seccion) + '</span>')
  if (titulo && titulo !== 'Inicio') partes.push('<span class="bc-sep">/</span><span class="bc-actual">' + esc(titulo) + '</span>')
  bc.innerHTML = partes.join(' ')
  const linkInicio = bc.querySelector('[data-bc="inicio"]')
  if (linkInicio) linkInicio.addEventListener('click', (e) => { e.preventDefault(); cambiarVista('inicio') })
}

function cambiarVista(nombre, modulo, oficio) {
  cerrarMenus()
  if (!puedeVerVista(nombre)) {
    mostrarToast('No tiene permiso para acceder a esa sección.', 'error')
    nombre = 'inicio'
    modulo = null
    oficio = null
  }
  state.vista = nombre
  if (modulo) state.modulo = modulo
  if (oficio) state.ovTipo = normalizarTipoOficio(oficio)
  $$('.nav-item:not(.nav-toggle), .nav-subitem').forEach((b) => {
    const activo = b.dataset.vista === nombre &&
      (!b.dataset.modulo || b.dataset.modulo === state.modulo) &&
      (!b.dataset.oficio || b.dataset.oficio === state.ovTipo)
    b.classList.toggle('active', activo)
  })
  marcarGruposNav()
  actualizarBreadcrumb(nombre, modulo, oficio)
  $$('.vista').forEach((v) => v.classList.add('hidden'))
  $('#vista-' + nombre).classList.remove('hidden')
  if (esVistaNavMovil()) abrirNavMovil(false)

  if (nombre === 'inicio') cargarInicio()
  if (nombre === 'modulo') { state.moduloPagina = 1; cargarModulo() }
  if (nombre === 'reportes') prepararReportes()
  if (nombre === 'completo') prepararCompleto()
  if (nombre === 'estadistica') prepararEstadistica()
  if (nombre === 'calendario') { if (!state.calMes) state.calMes = hoyISO().slice(0, 7); cargarCalendario() }
  if (nombre === 'fijar-fecha') prepararFijarFecha()
  if (nombre === 'orden-verbal') prepararOrdenVerbal()
  if (nombre === 'usuarios') cargarUsuarios()
  if (nombre === 'bd') cargarBaseDatos()
  if (nombre === 'auditoria') cargarAuditoria()
  if (nombre === 'estructura') cargarEstructura()
}

function abrirGrupoNav(grupoEl, abrir) {
  if (!grupoEl) return
  const toggle = grupoEl.querySelector('.nav-toggle')
  const subId = toggle && toggle.dataset.submenu
  const sub = subId ? document.getElementById(subId) : grupoEl.querySelector('.nav-submenu')
  if (!sub || !toggle) return
  sub.classList.toggle('hidden', !abrir)
  grupoEl.classList.toggle('abierto', abrir)
  toggle.setAttribute('aria-expanded', abrir ? 'true' : 'false')
}

function marcarGruposNav() {
  $$('.nav-grupo').forEach((grupo) => {
    if (grupo.classList.contains('alertas-grupo')) return
    const activo = !!grupo.querySelector('.nav-subitem.active')
    grupo.classList.toggle('activo', activo)
    abrirGrupoNav(grupo, activo)
  })
}

// ============ MENÚ LATERAL: CONTRAER Y MÓVIL ============
const NAV_COLAPSO_KEY = 'gi_nav_colapsado'

function esVistaNavMovil() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches
}

function aplicarTitulosNav() {
  $$('.nav-item, .nav-subitem').forEach((b) => {
    const lab = b.querySelector('.nav-label, .nav-toggle-label')
    const t = lab ? lab.textContent.trim() : ''
    if (t) b.title = t
  })
}

function aplicarNavColapsado(colapsado) {
  const app = $('#vistaApp')
  if (!app) return
  if (esVistaNavMovil()) colapsado = false
  app.classList.toggle('nav-collapsed', !!colapsado)
  const btn = $('#btnColapsarNav')
  if (btn) {
    btn.setAttribute('aria-label', colapsado ? 'Expandir menú' : 'Contraer menú')
    btn.setAttribute('title', colapsado ? 'Expandir menú' : 'Contraer menú')
    btn.innerHTML = colapsado ? '&#187;' : '&#171;'
  }
}

function alternarNavColapsado() {
  const colapsado = !$('#vistaApp').classList.contains('nav-collapsed')
  aplicarNavColapsado(colapsado)
  try { localStorage.setItem(NAV_COLAPSO_KEY, colapsado ? '1' : '0') } catch (e) { /* almacenamiento no disponible */ }
}

function abrirNavMovil(abrir) {
  const sidebar = $('#sidebar')
  const backdrop = $('#navBackdrop')
  const btn = $('#btnMenuMovil')
  if (!sidebar) return
  sidebar.classList.toggle('nav-open', abrir)
  if (backdrop) backdrop.classList.toggle('hidden', !abrir)
  if (btn) btn.setAttribute('aria-expanded', abrir ? 'true' : 'false')
  document.body.classList.toggle('nav-bloqueado', abrir)
}

// ============ TABLAS RESPONSIVE (columna -> tarjeta) ============
function etiquetarTablas() {
  document.querySelectorAll('table.tabla').forEach((tabla) => {
    const ths = Array.from(tabla.querySelectorAll('thead th')).map((th) => th.textContent.trim())
    if (!ths.length) return
    tabla.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        if (td.tagName !== 'TD') return
        if (td.getAttribute('data-label') === null) td.setAttribute('data-label', ths[i] || '')
      })
    })
  })
}

let _etqTimer = null
function observarTablas() {
  const cont = $('.content')
  if (!cont || typeof MutationObserver === 'undefined') return
  const obs = new MutationObserver(() => {
    clearTimeout(_etqTimer)
    _etqTimer = setTimeout(etiquetarTablas, 80)
  })
  obs.observe(cont, { childList: true, subtree: true })
}

// ============ INICIO ============

async function cargarInicio() {
  if (!state.tablas) {
    try { await cargarTablas() } catch (e) { /* reintentará en la siguiente vista */ }
  }
  let data = { resumen: [] }
  try { data = await api('/api/inicio') } catch (e) { data = { resumen: [] } }
  const porTabla = {}
  for (const r of data.resumen || []) porTabla[r.tabla] = r
  const cards = tablasOrdenadas().map((t) => {
    const conf = state.tablas[t]
    const r = porTabla[t] || { total: 0, ingresados: 0, salidos: 0 }
    return {
      titulo: conf.titulo,
      total: r.total,
      ingresados: r.ingresados,
      salidos: r.salidos,
      tabla: t,
      fecha_entrada: conf.fecha_entrada
    }
  })
  $('#resumenTarjetas').innerHTML = cards
    .map((c) => {
      const extra = c.fecha_entrada
        ? `<div class="tarjeta-meta">Ingresados ${c.ingresados} · Salidos ${c.salidos}</div>`
        : '<div class="tarjeta-meta">Directorio</div>'
      return `<div class="tarjeta" onclick="cambiarVista('modulo','${c.tabla}')" style="cursor:pointer" title="Abrir ${esc(c.titulo)}">
      <div class="num">${c.total}</div>
      <div class="lbl">${esc(c.titulo)}</div>
      ${extra}
    </div>`
    })
    .join('')

  const detalleHoy = (data.resumen || [])
    .filter((r) => r.fecha_entrada && (r.hoy_ingresados || r.hoy_salidos))
    .map((r) =>
      `<div class="panel"><h3>${esc(r.titulo)} — hoy</h3>
       <div class="reporte-resumen">
         <div class="reporte-stat"><span class="num">${r.hoy_ingresados}</span><span class="lbl">Ingresados</span></div>
         <div class="reporte-stat"><span class="num">${r.hoy_salidos}</span><span class="lbl">Salidos</span></div>
       </div></div>`
    ).join('')

  $('#resumenDetalle').innerHTML = detalleHoy || '<div class="panel"><h3>Actividad de hoy</h3><p style="color:#5a6b7c">No hay movimientos registrados hoy.</p></div>'
  await cargarAlertas(true)
}

// ============ MÓDULO GENÉRICO ============

function colModulo() {
  return state.tablas[state.modulo].columnas
}

function exportarModuloCompleto() {
  window.location.href = `/api/reportes/${state.modulo}/export?todos=true`
}

function abrirRenombrarTitulos() {
  const tabla = (state.vista === 'estructura' && state.estTabla) ? state.estTabla : state.modulo
  const conf = state.tablas[tabla]
  $('#titulosModulo').textContent = conf.titulo
  $('#titulosLista').innerHTML = conf.columnas
    .map((c) => `<div class="titulo-fila">
        <span class="titulo-nombre"><code>${esc(c.nombre)}</code></span>
        <span class="titulo-etiqueta" onclick="editarTituloLista('${esc(tabla)}','${esc(c.nombre)}', this)">${esc(c.etiqueta)}</span>
      </div>`)
    .join('')
  abrirModal('modalTitulos')
}

async function editarTituloLista(tabla, nombre, span) {
  const conf = state.tablas[tabla]
  const c = conf.columnas.find((x) => x.nombre === nombre)
  const valorAnterior = c.etiqueta
  const input = document.createElement('input')
  input.type = 'text'
  input.value = valorAnterior
  input.className = 'etiqueta-input'
  input.style.width = '100%'
  span.replaceWith(input)
  input.focus()
  input.select()

  const guardar = async () => {
    const nuevo = input.value.trim()
    if (nuevo && nuevo !== valorAnterior) {
      try {
        await api(`/api/esquema/${tabla}/columnas/${encodeURIComponent(nombre)}`, {
          method: 'PUT',
          body: JSON.stringify({ etiqueta: nuevo })
        })
        mostrarToast('Título de columna actualizado.', 'success')
      } catch (err) {
        mostrarToast(err.message, 'error')
        input.replaceWith(span)
        return
      }
    }
    await cargarTablas()
    const conf2 = state.tablas[tabla]
    const c2 = conf2.columnas.find((x) => x.nombre === nombre)
    span.textContent = c2.etiqueta
    input.replaceWith(span)
    if (state.vista === 'modulo' && state.modulo === tabla) cargarModulo()
    if (state.vista === 'estructura' && state.estTabla === tabla) renderEstructura()
  }

  const cancelar = () => input.replaceWith(span)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); e.preventDefault() }
    if (e.key === 'Escape') { cancelar(); input.removeEventListener('blur', guardar) }
  })
  input.addEventListener('blur', guardar)
}

function columnasFechaModulo(conf) {
  return (conf.columnas || []).filter((c) => {
    if (c.tipo === 'fecha') return true
    const n = String(c.nombre || '')
    if (/^(sentido_del_fallo|observaciones_sentencia|n_numero_sentencia)/.test(n)) return false
    return /^(fecha_|admision$|sentencia$|archivo$|cumplimiento$|devolucion|pruebas$|fallo$|lectura_)/.test(n)
  })
}

function llenarSelectFechas(sel, conf, preferido) {
  if (!sel || !conf) return
  const fechas = columnasFechaModulo(conf)
  const prev = preferido || sel.value
  sel.innerHTML = fechas.map((c) => `<option value="${c.nombre}">${esc(c.etiqueta)}</option>`).join('')
  const def = prev || conf.fecha_entrada || (fechas[0] && fechas[0].nombre) || ''
  if (def && fechas.some((c) => c.nombre === def)) sel.value = def
}

function prepararFiltrosModulo(conf) {
  const columnas = colModulo()
  const filtroPrev = $('#moduloFiltroCampo').value
  $('#moduloFiltroCampo').innerHTML = '<option value="">— Campo adicional —</option>' +
    columnas.map((c) => `<option value="${c.nombre}">${esc(c.etiqueta)}</option>`).join('')
  if (filtroPrev && columnas.some((c) => c.nombre === filtroPrev)) $('#moduloFiltroCampo').value = filtroPrev

  const fechas = columnasFechaModulo(conf)
  const fechaPrev = $('#moduloFechaCampo').value
  $('#moduloFechaCampo').innerHTML = fechas.map((c) => `<option value="${c.nombre}">${esc(c.etiqueta)}</option>`).join('')
  const def = fechaPrev || conf.fecha_entrada || (fechas[0] && fechas[0].nombre) || ''
  if (def) $('#moduloFechaCampo').value = def
}

function urlBusquedaModulo() {
  const qs = new URLSearchParams()
  qs.set('page', String(state.moduloPagina))
  qs.set('perPage', '15')
  const q = $('#moduloQ').value.trim()
  if (q) qs.set('q', q)
  let desde = $('#moduloDesde').value
  let hasta = $('#moduloHasta').value
  if (desde && !hasta) hasta = desde
  if (!desde && hasta) desde = hasta
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)
  const fechaCampo = $('#moduloFechaCampo').value
  if (fechaCampo && (desde || hasta)) qs.set('fecha_campo', fechaCampo)
  const filtroCampo = $('#moduloFiltroCampo').value
  const filtroValor = $('#moduloFiltroValor').value.trim()
  if (filtroCampo && filtroValor) qs.set(filtroCampo, filtroValor)
  return `/api/tabla/${state.modulo}?` + qs.toString()
}

function textoCriterios(data) {
  const partes = []
  for (const c of data.criterios || []) {
    if (c.tipo === 'fecha') partes.push((c.etiqueta || 'Fecha') + ': ' + (c.desde || '') + (c.desde === c.hasta ? '' : ' a ' + (c.hasta || '')))
    else if (c.tipo === 'palabras') partes.push('Palabras: «' + c.valor + '»')
    else if (c.tipo === 'campo') partes.push((c.etiqueta || c.campo) + ': «' + c.valor + '»')
  }
  return partes
}

async function cargarModulo() {
  const conf = state.tablas[state.modulo]
  $('#moduloTitulo').textContent = conf.titulo
  $('#moduloDescripcion').textContent = `${conf.descripcion} (${conf.origen})`
  prepararFiltrosModulo(conf)

  const data = await api(urlBusquedaModulo())
  state.totalModulo = data.total
  renderModulo(data.registros, data)

  const totalPaginas = Math.max(1, Math.ceil(data.total / data.perPage))
  $('#infoModuloPagina').textContent = `Página ${data.page} de ${totalPaginas} · ${data.total} registros`
  $('#btnModuloAnterior').disabled = data.page <= 1
  $('#btnModuloSiguiente').disabled = data.page >= totalPaginas
}

function renderModulo(registros, data) {
  const conf = state.tablas[state.modulo]
  const visibles = conf.visibles.map((n) => conf.columnas.find((c) => c.nombre === n)).filter(Boolean)
  const criteriosEl = $('#moduloCriterios')
  const partes = textoCriterios(data || {})
  if (criteriosEl) {
    if (partes.length) {
      criteriosEl.classList.remove('hidden')
      criteriosEl.textContent = 'Filtros aplicados (AND): ' + partes.join(' · ')
    } else {
      criteriosEl.classList.add('hidden')
      criteriosEl.textContent = ''
    }
  }

  $('#moduloThead').innerHTML = '<tr>' +
    visibles.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('') +
    `<th>${puedeEditar() ? 'Acciones' : ''}</th></tr>`

  if (!registros.length) {
    const msg = (data && data.mensaje_vacio) || 'No se encontraron resultados para los criterios seleccionados'
    $('#moduloTbody').innerHTML = `<tr><td colspan="${visibles.length + 1}" style="text-align:center;color:#5a6b7c;padding:24px">${esc(msg)}</td></tr>`
    return
  }

  $('#moduloTbody').innerHTML = registros
    .map((r) => {
      const celdas = visibles.map((c) => {
        const v = r[c.nombre]
        return `<td title="${esc((v || '').replace(/\n/g, ' · '))}">${esc((v || '').replace(/\n/g, '<br>')) || '—'}</td>`
      }).join('')
      const motivos = (r._motivos || []).map((m) => esc(m.detalle || '')).filter(Boolean)
      const acc = puedeEditar()
        ? `<td>
            <button class="btn-link" onclick="abrirRegistro(${r.id})">Editar</button>
            ${puedeAdmin() ? `<button class="btn-link rojo" onclick="eliminarRegistro(${r.id})">Eliminar</button>` : ''}
            ${motivos.length ? `<div class="motivo-coincidencia">${motivos.join(' · ')}</div>` : ''}
          </td>`
        : (motivos.length ? `<td><div class="motivo-coincidencia">${motivos.join(' · ')}</div></td>` : '<td></td>')
      return `<tr>${celdas}${acc}</tr>`
    })
    .join('')
}

const ORDEN_GRUPOS_FORM = [
  'Identificación',
  'Partes del proceso',
  'Audiencia programada (Orden verbal)',
  'Etapa procesal',
  'Salidas y decisiones definitivas en la instancia penal especializado',
  'Cumplimiento – Apelación',
  'Cumplimiento – Ejecutoria',
  'Procesos archivados definitivamente',
  'Sentencia y fallo',
  'Salidas y trámites'
]

const LOOKUP_CAMPOS = {
  fiscalia: {
    dir: 'fiscales',
    map: { celular: 'celular_fiscal', correo: 'correo_fiscal', notificacion: 'direccion_fiscal' }
  },
  defensor: {
    dir: 'defensores',
    map: {
      celular: 'celular_defensor',
      correo: 'correo_defensor',
      notificacion: 'direccion_defensor',
      cedula: 'cedula_defensor',
      tarjeta: 'tarjeta_defensor'
    }
  },
  victima: {
    dir: 'victimas',
    map: { celular: 'celular_victima', correo: 'correo_victima', notificacion: 'direccion_victima' }
  },
  rep_victima: {
    dir: 'defensores',
    map: {
      celular: 'celular_rep_victima',
      correo: 'correo_rep_victima',
      notificacion: 'direccion_rep_victima'
    }
  },
  defensoria_min_publico: {
    dir: 'procuradores',
    map: {
      celular: 'celular_min_publico',
      correo: 'correo_min_publico',
      notificacion: 'direccion_min_publico'
    }
  }
}

async function cargarDirectorios() {
  if (state.directorios) return state.directorios
  try {
    state.directorios = await api('/api/directorios')
  } catch (err) {
    state.directorios = { fiscales: [], defensores: [], procuradores: [], victimas: [], inpec: [], rama_judicial: [] }
  }
  return state.directorios
}

function opcionesLookup(campo) {
  const conf = LOOKUP_CAMPOS[campo]
  const dirs = state.directorios || {}
  const filas = conf ? (dirs[conf.dir] || []) : []
  const nombres = filas.map((f) => f.etiqueta || f.nombre).filter(Boolean)
  const col = (state.tablas[state.modulo] || {}).columnas || []
  const estaticas = ((col.find((c) => c.nombre === campo) || {}).opciones || [])
  return [...new Set(nombres.concat(estaticas))]
}

function aplicarLookup(nombreCampo, valor) {
  const conf = LOOKUP_CAMPOS[nombreCampo]
  if (!conf) return
  const filas = (state.directorios && state.directorios[conf.dir]) || []
  const q = String(valor || '').trim().toLowerCase()
  if (!q) return
  const fila = filas.find((f) => String(f.etiqueta || f.nombre || '').trim().toLowerCase() === q)
    || filas.find((f) => String(f.etiqueta || f.nombre || '').toLowerCase().includes(q))
  if (!fila) return
  const setVal = (campo, v) => {
    const el = document.getElementById(`campo_${state.modulo}_${campo}`)
    if (!el || v == null || v === '') return
    el.value = v
  }
  setVal(conf.map.celular, fila.celular)
  setVal(conf.map.correo, fila.correo)
  setVal(conf.map.notificacion, fila.notificacion)
  if (conf.map.cedula) setVal(conf.map.cedula, (fila.extra || {}).cedula)
  if (conf.map.tarjeta) setVal(conf.map.tarjeta, (fila.extra || {}).tarjeta)
}

function engancharLookups() {
  Object.keys(LOOKUP_CAMPOS).forEach((nombre) => {
    const el = document.getElementById(`campo_${state.modulo}_${nombre}`)
    if (!el) return
    const aplicar = () => aplicarLookup(nombre, el.value)
    el.addEventListener('change', aplicar)
    el.addEventListener('blur', aplicar)
  })
}

function opcionesCarcel() {
  const inpec = (state.directorios && state.directorios.inpec) || []
  const ciudades = inpec.map((f) => f.extra && f.extra.ciudad).filter(Boolean)
  const col = ((state.tablas.procesos || {}).columnas || []).find((c) => c.nombre === 'carcel')
  return [...new Set((col && col.opciones ? col.opciones : []).concat(ciudades))]
}

function aplicarCarcel(tr) {
  const carcelEl = tr.querySelector('.proc-carcel')
  if (!carcelEl) return
  const q = String(carcelEl.value || '').trim().toLowerCase()
  if (!q) return
  const filas = (state.directorios && state.directorios.inpec) || []
  const fila = filas.find((f) => String((f.extra && f.extra.ciudad) || f.etiqueta || '').trim().toLowerCase() === q)
    || filas.find((f) => String(f.etiqueta || '').toLowerCase().includes(q))
  if (!fila) return
  const dir = tr.querySelector('.proc-direccion')
  const cel = tr.querySelector('.proc-celular')
  if (dir && !dir.value) dir.value = fila.notificacion || ''
  if (cel && !cel.value) cel.value = fila.celular || ''
}

async function abrirRegistro(id) {
  const conf = state.tablas[state.modulo]
  $('#modalRegistroTitulo').textContent = id ? `Editar — ${conf.titulo}` : `Nuevo — ${conf.titulo}`
  $('#formRegistro').reset()
  $('#regId').value = id || ''
  if (state.modulo === 'procesos') await cargarDirectorios()

  const camposVisibles = conf.columnas.filter((c) => !c.no_formulario)
  const ordenForm = conf.orden_formulario || []
  if (ordenForm.length) {
    const porNombre = {}
    for (const c of camposVisibles) porNombre[c.nombre] = c
    const ordenados = []
    const vistos = new Set()
    for (const n of ordenForm) {
      if (porNombre[n] && !vistos.has(n)) {
        ordenados.push(porNombre[n])
        vistos.add(n)
      }
    }
    for (const c of camposVisibles) {
      if (!vistos.has(c.nombre)) ordenados.push(c)
    }
    camposVisibles.length = 0
    camposVisibles.push(...ordenados)
  }
  const camposPorGrupo = {}
  for (const c of camposVisibles) {
    const grupo = c.seccion || 'General'
    if (!camposPorGrupo[grupo]) camposPorGrupo[grupo] = []
    camposPorGrupo[grupo].push(c)
  }

  const ordenGrupos = ORDEN_GRUPOS_FORM.filter((g) => camposPorGrupo[g])
  const restantes = Object.keys(camposPorGrupo).filter((g) => !ordenGrupos.includes(g))
  const todosGrupos = [...ordenGrupos, ...restantes]

  const conteoEtiquetas = {}
  for (const c of camposVisibles) {
    const e = c.etiqueta || c.nombre
    conteoEtiquetas[e] = (conteoEtiquetas[e] || 0) + 1
  }

  let html = ''
  for (const grupo of todosGrupos) {
    const campos = camposPorGrupo[grupo]
    html += `<fieldset class="grupo-campos"><legend>${esc(grupo)}</legend>`
    html += campos.map((c) => {
      const id = `campo_${state.modulo}_${c.nombre}`
      const tipo = c.tipo || 'texto'
      const etiqueta = c.etiqueta || c.nombre
      const repetida = conteoEtiquetas[etiqueta] > 1
      const sufijo = repetida ? ' <em class="etiqueta-campo-interno">(campo: ' + esc(c.nombre) + ')</em>' : ''
      const largo = !!c.largo
      const ancho = largo
      let control
      if (tipo === 'procesados') {
        control = `<div class="tabla-scroll"><table class="tabla tabla-procesados">
          <thead><tr><th>Nombre</th><th>C.C.</th><th>Sexo</th><th>Detenido</th><th>Cárcel</th><th>Dirección - Correo</th><th>Celular</th><th></th></tr></thead>
          <tbody id="procesados_filas_${state.modulo}"></tbody></table></div>
          <button type="button" class="btn btn-outline btn-sm" onclick="agregarFilaProcesado('${state.modulo}')">Agregar procesado</button>`
      } else if (tipo === 'fecha') {
        control = `<input type="date" id="${id}" class="input" />`
      } else if (tipo === 'numerico') {
        control = `<input type="number" step="any" id="${id}" class="input" />`
      } else if (tipo === 'seleccion' || LOOKUP_CAMPOS[c.nombre]) {
        const list = `dl_${state.modulo}_${c.nombre}`
        const ops = LOOKUP_CAMPOS[c.nombre] ? opcionesLookup(c.nombre) : (c.opciones || [])
        const opciones = ops.map((o) => `<option value="${esc(o)}"></option>`).join('')
        control = `<input type="text" id="${id}" class="input" list="${list}" autocomplete="off" placeholder="Busque o escriba una opción nueva" /><datalist id="${list}">${opciones}</datalist>`
      } else if (largo || (/observ|informe|descripcion|anotacion/.test(c.nombre) && c.nombre.length > 12)) {
        control = `<textarea id="${id}" class="input" rows="${largo ? 3 : 2}"></textarea>`
      } else {
        control = `<input type="text" id="${id}" class="input" />`
      }
      return `<div class="campo${ancho ? ' campo-ancho' : ''}">
        <label for="${id}" title="${esc(c.nombre)}">${esc(etiqueta)}${sufijo}</label>
        ${control}
      </div>`
    }).join('')
    html += '</fieldset>'
  }

  $('#regCampos').innerHTML = html

  for (const c of camposVisibles) {
    if (c.tipo === 'procesados') agregarFilaProcesado(state.modulo)
  }

  if (id) {
    try {
      const r = await api(`/api/tabla/${state.modulo}/${id}`)
      for (const c of camposVisibles) {
        if (c.tipo === 'procesados') continue
        const el = document.getElementById(`campo_${state.modulo}_${c.nombre}`)
        if (el) el.value = r[c.nombre] == null ? '' : String(r[c.nombre])
      }
      hidratarProcesados(r)
    } catch (err) {
      mostrarToast('No se pudieron cargar los datos del registro: ' + err.message, 'error')
    }
  }

  engancharLookups()
  $('#modalRegistro').classList.remove('hidden')
}

function filaProcesadoHtml(f) {
  f = f || {}
  const uid = 'dl_carcel_' + Math.random().toString(36).slice(2, 10)
  const opsCarcel = opcionesCarcel().map((o) => `<option value="${esc(o)}"></option>`).join('')
  const opsDet = ['SI', 'NO', 'LIBERTAD', 'DOMICILIARIA', 'FUGADO', 'SIN DATOS']
    .map((o) => `<option value="${esc(o)}"></option>`).join('')
  const opsSexo = ['Mujer', 'Hombre', 'Otro'].map((o) => `<option value="${esc(o)}"></option>`).join('')
  const uidSexo = 'dl_sexo_' + uid
  const uidDet = 'dl_det_' + uid
  return `<tr>
    <td><input type="text" class="input celda-procesado proc-nombre" value="${esc(f.nombre || '')}" placeholder="Nombres y apellidos" /></td>
    <td><input type="text" class="input celda-procesado proc-cc" value="${esc(f.c_c || '')}" /></td>
    <td><input type="text" class="input celda-procesado proc-sexo" list="${uidSexo}" value="${esc(f.sexo || '')}" autocomplete="off" /><datalist id="${uidSexo}">${opsSexo}</datalist></td>
    <td><input type="text" class="input celda-procesado proc-detenido" list="${uidDet}" value="${esc(f.detenido || '')}" autocomplete="off" /><datalist id="${uidDet}">${opsDet}</datalist></td>
    <td><input type="text" class="input celda-procesado proc-carcel" list="${uid}" value="${esc(f.carcel || '')}" autocomplete="off" placeholder="Busque o escriba" /><datalist id="${uid}">${opsCarcel}</datalist></td>
    <td><input type="text" class="input celda-procesado proc-direccion" value="${esc(f.direccion || '')}" /></td>
    <td><input type="text" class="input celda-procesado proc-celular" value="${esc(f.celular || '')}" /></td>
    <td><button type="button" class="btn-link" onclick="this.closest('tr').remove()">Quitar</button></td>
  </tr>`
}

function agregarFilaProcesado(modulo, datos) {
  const tb = document.getElementById(`procesados_filas_${modulo}`)
  if (!tb) return
  tb.insertAdjacentHTML('beforeend', filaProcesadoHtml(datos))
  const tr = tb.lastElementChild
  if (!tr) return
  const carcelEl = tr.querySelector('.proc-carcel')
  if (carcelEl) {
    const aplicar = () => aplicarCarcel(tr)
    carcelEl.addEventListener('change', aplicar)
    carcelEl.addEventListener('blur', aplicar)
  }
}

function leerProcesados(modulo) {
  const tb = document.getElementById(`procesados_filas_${modulo}`)
  if (!tb) return []
  return [...tb.querySelectorAll('tr')].map((tr) => ({
    nombre: (tr.querySelector('.proc-nombre') || {}).value ? tr.querySelector('.proc-nombre').value.trim() : '',
    c_c: (tr.querySelector('.proc-cc') || {}).value ? tr.querySelector('.proc-cc').value.trim() : '',
    sexo: (tr.querySelector('.proc-sexo') || {}).value ? tr.querySelector('.proc-sexo').value.trim() : '',
    detenido: (tr.querySelector('.proc-detenido') || {}).value ? tr.querySelector('.proc-detenido').value.trim() : '',
    carcel: (tr.querySelector('.proc-carcel') || {}).value ? tr.querySelector('.proc-carcel').value.trim() : '',
    direccion: (tr.querySelector('.proc-direccion') || {}).value ? tr.querySelector('.proc-direccion').value.trim() : '',
    celular: (tr.querySelector('.proc-celular') || {}).value ? tr.querySelector('.proc-celular').value.trim() : ''
  })).filter((f) => f.nombre || f.c_c || f.detenido || f.carcel || f.direccion || f.celular || f.sexo)
}

function hidratarProcesados(r) {
  const cont = document.getElementById(`procesados_filas_${state.modulo}`)
  if (!cont) return
  let filas = []
  const raw = String(r.procesados_detalle || '').trim()
  if (raw) {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) filas = p
    } catch (e) { /* dato antiguo: se reconstruye abajo */ }
  }
  if (!filas.length) {
    const nombres = String(r.procesado_s || '').split('\n').map((s) => s.trim()).filter(Boolean)
    const cedulas = String(r.c_c || '').split('\n').map((s) => s.trim()).filter(Boolean)
    const total = Math.max(nombres.length, cedulas.length)
    for (let i = 0; i < total; i++) {
      filas.push({
        nombre: nombres[i] || '',
        c_c: cedulas[i] || '',
        sexo: i === 0 ? (r.sexo || '') : '',
        detenido: i === 0 ? (r.detenido || '') : '',
        carcel: i === 0 ? (r.carcel || '') : '',
        direccion: i === 0 ? (r.direccion_detenido || '') : '',
        celular: i === 0 ? (r.celular || '') : ''
      })
    }
  }
  cont.innerHTML = ''
  if (!filas.length) {
    agregarFilaProcesado(state.modulo)
    return
  }
  for (const f of filas) agregarFilaProcesado(state.modulo, f)
}

async function guardarRegistro(e) {
  e.preventDefault()
  const id = $('#regId').value
  const conf = state.tablas[state.modulo]
  const body = {}
  const nuevasOpciones = []
  for (const c of conf.columnas) {
    if (c.no_formulario) continue
    if (c.tipo === 'procesados') {
      const filas = leerProcesados(state.modulo)
      body[c.nombre] = filas.length ? JSON.stringify(filas) : ''
      body.procesado_s = filas.map((f) => f.nombre).filter(Boolean).join('\n')
      body.c_c = filas.map((f) => f.c_c).filter(Boolean).join('\n')
      body.detenido = (filas.find((f) => f.detenido) || {}).detenido || ''
      body.carcel = (filas.find((f) => f.carcel) || {}).carcel || ''
      body.direccion_detenido = (filas.find((f) => f.direccion) || {}).direccion || ''
      body.celular = (filas.find((f) => f.celular) || {}).celular || ''
      body.sexo = (filas.find((f) => f.sexo) || {}).sexo || ''
      const nH = filas.filter((f) => /^hombre/i.test(f.sexo)).length
      const nM = filas.filter((f) => /^mujer/i.test(f.sexo)).length
      if (nH) body.no_hombres = String(nH)
      if (nM) body.no_mujeres = String(nM)
      continue
    }
    const el = document.getElementById(`campo_${state.modulo}_${c.nombre}`)
    body[c.nombre] = el ? el.value : ''
    if (el && c.tipo === 'seleccion' && body[c.nombre]) {
      const opciones = (c.opciones || []).map((o) => o.trim())
      if (!opciones.includes(body[c.nombre].trim())) {
        nuevasOpciones.push({ columna: c.nombre, valor: body[c.nombre].trim() })
      }
    }
  }
  try {
    if (id) {
      await api(`/api/tabla/${state.modulo}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      mostrarToast('Registro actualizado correctamente.', 'success')
    } else {
      await api(`/api/tabla/${state.modulo}`, { method: 'POST', body: JSON.stringify(body) })
      mostrarToast('Registro creado correctamente.', 'success')
    }
    for (const n of nuevasOpciones) {
      try {
        await api(`/api/esquema/${state.modulo}/columnas/${encodeURIComponent(n.columna)}/opciones`, {
          method: 'POST',
          body: JSON.stringify({ valor: n.valor })
        })
      } catch (err) { /* opción ya existe o sin permisos; se ignora */ }
    }
    cerrarModal('modalRegistro')
    cargarModulo()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

async function eliminarRegistro(id) {
  if (!confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) return
  try {
    await api(`/api/tabla/${state.modulo}/${id}`, { method: 'DELETE' })
    mostrarToast('Registro eliminado.', 'success')
    cargarModulo()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

// ============ REPORTES ============

function prepararReportes() {
  if (!$('#repDesde').value) $('#repDesde').value = fechaInicioMes()
  if (!$('#repHasta').value) $('#repHasta').value = fechaActual()
  if (state.repModulo) {
    $('#repModulo').value = state.repModulo
    state.repModulo = null
  }
  const tabla = $('#repModulo').value
  if (tabla && state.tablas[tabla]) llenarSelectFechas($('#repFechaCampo'), state.tablas[tabla])
  $('#reporteResultado').classList.add('hidden')
  $('#reporteResultado').innerHTML = ''
}

async function generarReporte() {
  const tabla = $('#repModulo').value
  const conf = state.tablas[tabla]
  const desde = $('#repDesde').value
  const hasta = $('#repHasta').value
  const fechaCampo = $('#repFechaCampo').value || conf.fecha_entrada

  if (!desde || !hasta) {
    mostrarToast('Debe indicar el período (desde y hasta).', 'error')
    return
  }
  if (desde > hasta) {
    mostrarToast('La fecha "desde" no puede ser mayor que "hasta".', 'error')
    return
  }

  let data
  try {
    data = await api(`/api/reportes/${tabla}/procesos?desde=${desde}&hasta=${hasta}&fecha_campo=${encodeURIComponent(fechaCampo)}`)
  } catch (err) {
    mostrarToast(err.message, 'error')
    return
  }

  const etiqueta = new Date(desde + 'T12:00:00').toLocaleDateString('es-CO') + ' a ' + new Date(hasta + 'T12:00:00').toLocaleDateString('es-CO')
  const etiquetaCampo = data.etiqueta_fecha || fechaCampo
  const fijas = [
    { nombre: 'fecha_audiencia', etiqueta: 'FECHA AUDIENCIA', tipo: 'fecha' },
    { nombre: 'hora', etiqueta: 'HORA AUDIENCIA' },
    { nombre: 'audiencia', etiqueta: 'TIPO AUDIENCIA' }
  ]
  const usados = new Set(fijas.map((c) => c.nombre))
  const visibles = (data.columnas && data.columnas.length)
    ? data.columnas
    : fijas.concat(conf.visibles.map((n) => conf.columnas.find((c) => c.nombre === n)).filter(Boolean).filter((c) => !usados.has(c.nombre)))

  $('#reporteResultado').innerHTML = `
    <div class="panel">
      <h3>${esc(conf.titulo)} — ${esc(etiquetaCampo)} (${etiqueta})</h3>
      <div class="reporte-resumen">
        <div class="reporte-stat"><span class="num">${data.registros.length}</span><span class="lbl">Registros en el período</span></div>
        <div class="reporte-stat"><span class="num">${data.ingresados}</span><span class="lbl">Con FECHA INGRESO</span></div>
        <div class="reporte-stat"><span class="num">${data.salidos}</span><span class="lbl">Con fecha de salida</span></div>
      </div>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr>${visibles.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('')}</tr></thead>
          <tbody>
            ${data.registros.length ? data.registros.map((r) => `<tr>
              ${visibles.map((c) => `<td title="${esc(textoCelda(r[c.nombre], c).replace(/\n/g, ' · '))}">${esc(textoCelda(r[c.nombre], c).replace(/\n/g, '<br>')) || '—'}</td>`).join('')}
            </tr>`).join('') : `<tr><td colspan="${visibles.length}" style="text-align:center;color:#5a6b7c;padding:24px">No se encontraron resultados para los criterios seleccionados</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`
  $('#reporteResultado').classList.remove('hidden')
}

function textoCelda(valor, col) {
  const s = valor == null ? '' : String(valor)
  if (col && (col.tipo === 'fecha' || /fecha/.test(col.nombre || ''))) {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
  }
  return s
}

// ============ REPORTE COMPLETO ============

function prepararCompleto() {
  if (!$('#compDesde').value) $('#compDesde').value = fechaInicioMes()
  if (!$('#compHasta').value) $('#compHasta').value = fechaActual()
  const tabla = $('#compModulo').value || 'procesos'
  if (state.tablas[tabla]) llenarSelectFechas($('#compFechaCampo'), state.tablas[tabla])
}

async function generarCompleto() {
  const modulo = $('#compModulo').value
  const desde = $('#compDesde').value
  const hasta = $('#compHasta').value
  const fechaCampo = $('#compFechaCampo').value
  if (desde && hasta && desde > hasta) {
    mostrarToast('La fecha "desde" no puede ser mayor que "hasta".', 'error')
    return
  }
  const qs = new URLSearchParams()
  if (modulo) qs.set('modulo', modulo)
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)
  if (fechaCampo) qs.set('fecha_campo', fechaCampo)
  qs.set('limite', '80')
  $('#completoResultado').innerHTML = '<div class="panel"><p>Generando reporte Completo...</p></div>'
  try {
    const data = await api('/api/ia/completo?' + qs.toString())
    renderCompleto(data)
  } catch (err) {
    $('#completoResultado').innerHTML = ''
    mostrarToast(err.message, 'error')
  }
}

function renderCompleto(data) {
  const periodo = (data.desde || data.hasta)
    ? `${esc(data.desde || '—')} a ${esc(data.hasta || '—')}`
    : 'todo el inventario'
  const cards = data.bloques.map((b) =>
    `<div class="tarjeta">
      <div class="num">${b.total}</div>
      <div class="lbl">${esc(b.titulo)}</div>
      <div class="lbl" style="font-size:12px">Inventario: ${b.inventario} · origen ${esc(b.origen || '')}</div>
    </div>`
  ).join('')
  const bloques = data.bloques.map((b) => {
    const cols = b.columnas.slice(0, 10)
    const extra = b.columnas.length > 10 ? ` <span class="lbl">(+${b.columnas.length - 10} columnas en CSV)</span>` : ''
    const filas = b.registros.length
      ? b.registros.map((r) => `<tr>${cols.map((c) => `<td title="${esc((r[c.nombre] || '').replace(/\n/g, ' · '))}">${esc(r[c.nombre] || '') || '—'}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" style="text-align:center;color:#5a6b7c;padding:24px">No se encontraron resultados para los criterios seleccionados</td></tr>`
    return `<div class="panel">
      <h3>${esc(b.titulo)} — ${b.total} registros (${periodo}${b.etiqueta_fecha ? ' · ' + esc(b.etiqueta_fecha) : ''})${extra}</h3>
      <p class="ayuda-ia">${esc(b.descripcion || '')}</p>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr>${cols.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('')}</tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${b.total > b.registros.length ? `<p class="ayuda-ia">Se muestran ${b.registros.length} de ${b.total}. Exporte CSV para ver todos los campos.</p>` : ''}
    </div>`
  }).join('')
  $('#completoResultado').innerHTML = `
    <div class="cards-grid">${cards}</div>
    ${bloques}`
}

function exportarCompleto() {
  const modulo = $('#compModulo').value
  const desde = $('#compDesde').value
  const hasta = $('#compHasta').value
  const fechaCampo = $('#compFechaCampo').value
  const qs = new URLSearchParams()
  if (modulo) qs.set('modulo', modulo)
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)
  if (fechaCampo) qs.set('fecha_campo', fechaCampo)
  window.location.href = '/api/ia/completo.csv?' + qs.toString()
}

// ============ REPORTE ESTADÍSTICA ============

function prepararEstadistica() {
  if (!$('#estDesde').value) $('#estDesde').value = fechaInicioMes()
  if (!$('#estHasta').value) $('#estHasta').value = fechaActual()
}

async function generarEstadistica() {
  const desde = $('#estDesde').value
  const hasta = $('#estHasta').value
  if (!desde || !hasta) {
    mostrarToast('Debe indicar el período (desde y hasta).', 'error')
    return
  }
  if (desde > hasta) {
    mostrarToast('La fecha "desde" no puede ser mayor que "hasta".', 'error')
    return
  }
  $('#estadisticaResultado').innerHTML = '<div class="panel"><p>Contando registros reales del inventario...</p></div>'
  try {
    const data = await api(`/api/ia/estadistica?desde=${desde}&hasta=${hasta}`)
    renderEstadistica(data)
    const val = data.validacion
    if (val && val.ok === false) {
      mostrarToast('Hay bloques que no cuadran. El reporte no se muestra como correcto.', 'error')
    }
  } catch (err) {
    $('#estadisticaResultado').innerHTML = ''
    mostrarToast(err.message, 'error')
  }
}

function thNum(v) { return `<td class="num-celda">${v == null ? 0 : v}</td>` }

function columnasDetalleEst(id) {
  const cols = state.estDetalleCols[id]
  if (cols && cols.length) return cols
  return [
    { clave: 'id', etiqueta: 'Id' },
    { clave: 'radicado', etiqueta: 'Radicado' },
    { clave: 'no', etiqueta: 'No.' },
    { clave: 'procesado_s', etiqueta: 'Procesado(s)' },
    { clave: 'delito_estadistica', etiqueta: 'DELITO ESTADISTICA' },
    { clave: 'tipo', etiqueta: 'Tipo / casilla' },
    { clave: 'fecha_ingreso', etiqueta: 'Fecha' },
    { clave: 'fecha_salida', etiqueta: 'Fecha salida' },
    { clave: 'casilla_entrada', etiqueta: 'Casilla entrada' },
    { clave: 'casilla_salida', etiqueta: 'Casilla salida' },
    { clave: 'entrada', etiqueta: 'E' },
    { clave: 'salida', etiqueta: 'S' },
    { clave: 'inventario_final', etiqueta: 'Fin' }
  ]
}

function abrirDetalleEstadistica(id) {
  const filas = (state.estDetalles && state.estDetalles[id]) || []
  const cols = columnasDetalleEst(id).filter((c) => filas.some((r) => r[c.clave] != null && r[c.clave] !== ''))
  const usadas = cols.length ? cols : columnasDetalleEst(id)
  const thead = usadas.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('')
  const cuerpo = filas.length
    ? filas.map((r) => `<tr>${usadas.map((c) => {
        const v = r[c.clave]
        const num = c.clave === 'entrada' || c.clave === 'salida' || c.clave === 'inventario_final' || c.clave === 'inventario_inicial'
        const txt = v == null ? '' : String(v).replace(/\n/g, ' · ')
        return num ? `<td class="num-celda">${v == null ? 0 : v}</td>` : `<td>${esc(txt)}</td>`
      }).join('')}</tr>`).join('')
    : `<tr><td colspan="${usadas.length}" style="text-align:center;color:#5a6b7c;padding:20px">No hay registros en el rango.</td></tr>`
  const cab = $('#estDetalleTabla thead tr') || $('#modalEstDetalle thead tr')
  if (cab) cab.innerHTML = thead
  $('#estDetalleCuerpo').innerHTML = cuerpo
  const titulo = state.estDetalleTitulos[id] || 'Detalle de registros'
  $('#estDetalleTitulo').textContent = titulo + ' (' + filas.length + ')'
  const ayuda = $('#estDetalleAyuda')
  if (ayuda) ayuda.textContent = 'Solo registros con fecha en el rango. Cada fila alimenta una casilla del bloque.'
  abrirModal('modalEstDetalle')
}

window.abrirDetalleEstadistica = abrirDetalleEstadistica

function guardarDetalleSeccion(s) {
  const det = (s.datos && s.datos.detalle) || s.detalle || []
  const cols = (s.datos && s.datos.columnas_detalle) || s.columnas_detalle
  state.estDetalles[s.id] = det
  if (cols) state.estDetalleCols[s.id] = cols
  state.estDetalleTitulos[s.id] = 'Detalle · ' + (s.titulo || s.id)
}

function htmlBtnDetalle(s) {
  const n = ((s.datos && s.datos.detalle) || s.detalle || []).length
  if (!s.id) return ''
  return `<div class="reporte-acciones" style="margin-bottom:10px">
    <button type="button" class="btn btn-outline" onclick="abrirDetalleEstadistica('${esc(s.id)}')">Ver detalle de registros${n ? ' (' + n + ')' : ''}</button>
  </div>`
}

function htmlValidacion(val) {
  if (!val || val.ok !== false) return ''
  return `<p class="error-msg">${esc((val.errores || []).join(' '))}</p>`
}

function htmlMetaSeccion(s, data) {
  const n = s.registros_filtrados != null ? s.registros_filtrados : (s.datos && s.datos.registros_filtrados)
  const campo = s.etiqueta_fecha || (s.datos && s.datos.etiqueta_fecha) || data.etiqueta_fecha || 'FECHA INGRESO'
  return `<p class="ayuda-ia">Campo: ${esc(campo)} · ${esc(data.desde)} a ${esc(data.hasta)}${n != null ? ' · registros ' + n : ''}</p>`
}

function renderEstadistica(data) {
  state.estDetalles = {}
  state.estDetalleCols = {}
  state.estDetalleTitulos = {}
  const bloques = data.secciones.map((s) => {
    guardarDetalleSeccion(s)
    const val = (s.datos && s.datos.validacion) || s.validacion
    if (s.tipo === 'matriz') {
      const colsM = s.datos.columnas || [...s.datos.columnas_entrada, ...s.datos.columnas_salida]
      const colsPost = s.datos.columnas_post || []
      const filasVis = (s.datos.filas || []).filter((f) =>
        (f.inventario_inicial || f.inventario_final || colsM.some((c) => f[c.clave]) || colsPost.some((c) => f[c.clave]))
      )
      if (!filasVis.length && !(s.datos.total && (s.datos.total.inventario_inicial || s.datos.total.inventario_final || colsM.some((c) => s.datos.total[c.clave])))) {
        return `<div class="panel">
          <h3>${esc(s.titulo)}</h3>
          <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
          ${htmlMetaSeccion(s, data)}
          ${htmlBtnDetalle(s)}
          <p>No hay registros con fecha en el rango seleccionado.</p>
        </div>`
      }
      const cuerpo = filasVis.concat([s.datos.total])
      return `<div class="panel">
        <h3>${esc(s.titulo)}</h3>
        <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
        ${htmlMetaSeccion(s, data)}
        ${htmlBtnDetalle(s)}
        ${htmlValidacion(val)}
        <div class="tabla-scroll">
          <table class="tabla tabla-sierju">
            <thead>
              <tr>
                <th>Tipo de proceso</th>
                <th>Inv. inicial</th>
                ${colsM.map((c) => `<th title="${esc(c.etiqueta)}">${esc(c.etiqueta)}</th>`).join('')}
                <th>Inv. final</th>
                ${colsPost.map((c) => `<th title="${esc(c.etiqueta)}">${esc(c.etiqueta)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${cuerpo.map((f) => `<tr class="${f.tipo === 'Total' ? 'fila-total' : ''}">
                <td>${esc(f.tipo)}</td>
                ${thNum(f.inventario_inicial)}
                ${colsM.map((c) => thNum(f[c.clave])).join('')}
                ${thNum(f.inventario_final)}
                ${colsPost.map((c) => thNum(f[c.clave])).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`
    }
    if (s.tipo === 'tutelas' || s.tipo === 'desacato' || s.tipo === 'audiencias' || s.tipo === 'ejecucion' || s.tipo === 'simple' || s.tipo === 'otros') {
      const filas = (s.filas || []).filter((f) => Object.keys(f).some((k) => k !== 'tipo' && f[k]))
      const mostrar = (filas.length ? filas : s.filas || []).concat(s.total ? [s.total] : [])
      const keys = Object.keys(mostrar[0] || { tipo: '' })
      if (!filas.length && !(s.total && Object.keys(s.total).some((k) => k !== 'tipo' && s.total[k]))) {
        return `<div class="panel">
          <h3>${esc(s.titulo)}</h3>
          <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
          ${htmlMetaSeccion(s, data)}
          ${htmlBtnDetalle(s)}
          <p>No hay registros con fecha en el rango seleccionado.</p>
        </div>`
      }
      return `<div class="panel">
        <h3>${esc(s.titulo)}</h3>
        <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
        ${htmlMetaSeccion(s, data)}
        ${htmlBtnDetalle(s)}
        ${htmlValidacion(val)}
        <div class="tabla-scroll">
          <table class="tabla tabla-sierju">
            <thead><tr>${keys.map((k) => `<th>${esc(k.replace(/_/g, ' '))}</th>`).join('')}</tr></thead>
            <tbody>
              ${mostrar.map((f) => `<tr class="${f.tipo === 'Total' ? 'fila-total' : ''}">
                ${keys.map((k) => k === 'tipo' ? `<td>${esc(f[k])}</td>` : thNum(f[k])).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`
    }
    if (s.datos) {
      return `<div class="panel">
        <h3>${esc(s.titulo)}</h3>
        <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
        ${htmlMetaSeccion(s, data)}
        ${htmlBtnDetalle(s)}
        ${htmlValidacion(val)}
        <div class="reporte-resumen">
          ${Object.entries(s.datos).map(([k, v]) => `<div class="reporte-stat"><span class="num">${v}</span><span class="lbl">${esc(k.replace(/_/g, ' '))}</span></div>`).join('')}
        </div>
      </div>`
    }
    return `<div class="panel">
      <h3>${esc(s.titulo)}</h3>
      <p class="ayuda-ia">${esc(s.descripcion || '')}</p>
      ${htmlMetaSeccion(s, data)}
      ${htmlBtnDetalle(s)}
      ${htmlValidacion(val)}
      <div class="reporte-stat"><span class="num">${s.total || 0}</span><span class="lbl">Total</span></div>
    </div>`
  }).join('')
  const cruce = data.cruce || {}
  const filasCruce = [
    ['Procesos (fecha ingreso)', cruce.procesos],
    ['Hoja Tutelas (tutela + desacato + hábeas)', cruce.tutelas_hoja],
    ['Apelaciones', cruce.apelaciones],
    ['Disciplinarios', cruce.disciplinarios]
  ].filter(([, x]) => x)
  const htmlCruce = filasCruce.length ? `
    <div class="panel">
      <h3>Cruce con Reporte Completo (mismo período, FECHA INGRESO)</h3>
      <p class="ayuda-ia">Completo lista filas. Estadística las clasifica en casillas SIERJU. Las entradas del período deben coincidir.</p>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>Módulo</th><th>Completo ingreso</th><th>Estadística entradas</th><th>Detalle</th><th>Cuadra</th></tr></thead>
          <tbody>
            ${filasCruce.map(([lab, x]) => {
              const est = x.estadistica_entradas != null ? x.estadistica_entradas : (x.suma != null ? x.suma : x.estadistica_recibidos)
              const det = x.suma != null
                ? `tutelas ${x.tutelas} + desacato ${x.desacato} + hábeas ${x.habeas}`
                : (x.universo_primero != null
                  ? `PRIMERO ${x.universo_primero} · ini ${x.inventario_inicial} · salidas ${x.salidas} · fin ${x.inventario_final}`
                  : (x.inventario_inicial != null ? `ini ${x.inventario_inicial} · salidas ${x.salidas} · fin ${x.inventario_final}` : ''))
              return `<tr>
                <td>${esc(lab)}</td>
                ${thNum(x.completo_ingreso)}
                ${thNum(est)}
                <td>${esc(det)}</td>
                <td>${x.igual ? 'Sí' : 'No'}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''
  const valG = data.validacion
  $('#estadisticaResultado').innerHTML = `
    <div class="panel">
      <h3>${esc(data.nombre)}</h3>
      <p>${esc(data.despacho)}</p>
      <p class="ayuda-ia">Período ${esc(data.desde)} a ${esc(data.hasta)} · ${esc(data.fuente)}</p>
      ${valG && valG.ok === false ? `<p class="error-msg">El reporte no se muestra como correcto. ${(valG.errores || []).join(' ')}</p>` : ''}
    </div>
    ${htmlCruce}
    ${bloques}`
}

// ============ ORDEN VERBAL ============

const TITULOS_OFICIO = {
  orden: 'Orden Verbal',
  recordatorio: 'Recordatorio de Audiencia',
  acta: 'Reporte Audiencias',
  constancia: 'Constancia Audiencia',
  'solicitud-defensor': 'Solicitud Defensor',
  acusacion: 'Acusación',
  preparatoria: 'Preparatoria',
  'auto-pruebas': 'Auto pruebas',
  'juicio-oral': 'Juicio',
  'sentido-fallo': 'Sentido Fallo Individualización Pena 447',
  'individualizacion-pena': 'Individualización Pena 447',
  'lectura-sentencia': 'Lectura Sentencia',
  preacuerdo: 'Preacuerdo',
  'solicitud-preclusion': 'Solicitud Preclusión'
}

const DESCRIPCIONES_OFICIO = {
  orden: 'Busque el proceso, genere la orden verbal y descárguela o imprímala con los datos actuales.',
  recordatorio: 'Busque el proceso, genere el recordatorio de la audiencia y descárguelo o imprímalo con los datos actuales.',
  acta: 'Busque el proceso, elija el resultado de la audiencia, complete los campos en blanco y descargue o imprima el reporte con los datos actuales.',
  constancia: 'Busque el proceso y descargue la constancia en formato Word conservando el encabezado, márgenes y tamaño de papel originales.',
  'solicitud-defensor': 'Busque el proceso y descargue la solicitud de defensor en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  acusacion: 'Busque el proceso y descargue el acta de formulación de acusación en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  preparatoria: 'Busque el proceso y descargue el acta de audiencia preparatoria en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'auto-pruebas': 'Busque el proceso y descargue el acta de lectura de auto de pruebas en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'juicio-oral': 'Busque el proceso y descargue el acta de juicio oral en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'sentido-fallo': 'Busque el proceso y descargue el acta de enunciación del sentido de fallo e individualización de pena 447 en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'individualizacion-pena': 'Busque el proceso y descargue el acta de individualización de pena 447 en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'lectura-sentencia': 'Busque el proceso y descargue el acta de lectura de sentencia en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  preacuerdo: 'Busque el proceso y descargue el acta de verificación de preacuerdo y 447 en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.',
  'solicitud-preclusion': 'Busque el proceso y descargue el acta de solicitud de preclusión en formato Word, con el encabezado, márgenes y estilo originales. Solo se reemplazan los campos resaltados en amarillo.'
}

function prepararOrdenVerbal() {
  state.ovTipo = normalizarTipoOficio(state.ovTipo)
  const sel = $('#ovTipoDoc')
  if (sel) sel.value = state.ovTipo
  $$('.nav-subitem[data-oficio]').forEach((b) => {
    b.classList.toggle('active', b.dataset.oficio === state.ovTipo)
  })
  marcarGruposNav()
  actualizarTituloOficio()
  actualizarCamposActa()
  actualizarAccionesOficio()
  buscarOrdenVerbal()
}

function actualizarTituloOficio() {
  const tipo = state.ovTipo
  const titulo = $('#ovVistaTitulo')
  const desc = $('#ovVistaDesc')
  if (titulo) titulo.textContent = TITULOS_OFICIO[tipo] || TITULOS_OFICIO.orden
  if (desc) desc.textContent = DESCRIPCIONES_OFICIO[tipo] || DESCRIPCIONES_OFICIO.orden
}

function actualizarCamposActa() {
  const cont = $('#ovActaCampos')
  if (cont) cont.classList.toggle('hidden', state.ovTipo !== 'acta')
}

function esOficioWord(tipo) {
  return TIPOS_WORD.includes(tipo || state.ovTipo)
}

function actualizarAccionesOficio() {
  const word = esOficioWord()
  const btnGenerar = $('#btnGenerarOv')
  const btnImprimir = $('#btnImprimirOv')
  const btnWord = $('#btnWordOv')
  if (btnGenerar) btnGenerar.classList.toggle('hidden', word)
  if (btnImprimir) btnImprimir.classList.toggle('hidden', word)
  if (btnWord) btnWord.classList.toggle('hidden', !word)
}

async function buscarOrdenVerbal() {
  const q = encodeURIComponent(($('#ovQ').value || '').trim())
  let data
  try {
    data = await api(`/api/orden-verbal/buscar?q=${q}&page=${state.ovPagina || 1}&perPage=12`)
  } catch (err) {
    mostrarToast(err.message, 'error')
    return
  }
  const filas = data.registros || []
  if (!filas.length) {
    $('#ovTbody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:#5a6b7c;padding:24px">No se encontraron resultados para los criterios seleccionados</td></tr>'
  } else {
    $('#ovTbody').innerHTML = filas.map((r) => {
      const proc = (r.procesado_s || '').replace(/\n/g, ' · ')
      const sel = Number(state.ovId) === Number(r.id) ? ' ov-fila-sel' : ''
      return `<tr class="${sel}">
        <td>${esc(r.no_orden_verbal) || '—'}</td>
        <td>${esc(r.radicado) || '—'}</td>
        <td>${esc(r.no) || '—'}</td>
        <td title="${esc(proc)}">${esc(proc.slice(0, 80))}${proc.length > 80 ? '…' : ''}</td>
        <td>${esc(r.audiencia) || '—'}</td>
        <td>${esc(r.fecha_audiencia) || '—'}</td>
        <td>${esc(r.hora) || '—'}</td>
        <td><button class="btn btn-primary btn-sm" onclick="seleccionarOrdenVerbal(${r.id})">Seleccionar</button></td>
      </tr>`
    }).join('')
  }
  const totalPaginas = Math.max(1, Math.ceil((data.total || 0) / (data.perPage || 12)))
  $('#infoOvPagina').textContent = `Página ${data.page} de ${totalPaginas} · ${data.total} registros`
  $('#btnOvAnterior').disabled = data.page <= 1
  $('#btnOvSiguiente').disabled = data.page >= totalPaginas
}

async function seleccionarOrdenVerbal(id) {
  state.ovId = id
  await cargarPreviewOficio()
  $('#ovPreviewWrap').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function paramsOficio() {
  const p = new URLSearchParams()
  p.set('tipo', normalizarTipoOficio(state.ovTipo))
  if (state.ovTipo === 'acta') {
    const r = $('#ovActaResultado')
    p.set('resultado', r ? r.value : 'REALIZO')
  }
  return p
}

function agregarCamposManuales(params) {
  if (state.ovTipo !== 'acta') return params
  $$('#ovPreview [data-campo]').forEach((el) => {
    const v = (el.textContent || '').replace(/\u00a0/g, ' ').trim()
    if (v) params.set(el.dataset.campo, v)
  })
  return params
}

async function cargarPreviewOficio() {
  if (!state.ovId) return
  const tipo = normalizarTipoOficio(state.ovTipo)
  try {
    const data = await api(`/api/orden-verbal/${state.ovId}?${paramsOficio().toString()}`)
    state.ovArchivo = data.nombre_archivo || (tipo + '-' + state.ovId)
    $('#ovPreviewWrap').classList.remove('hidden')
    if (tipo === 'acta') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — REPORTE AUDIENCIAS'
    } else if (tipo === 'constancia') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — CONSTANCIA AUDIENCIA'
    } else if (tipo === 'solicitud-defensor') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — SOLICITUD DEFENSOR'
    } else if (tipo === 'acusacion') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — ACUSACIÓN'
    } else if (tipo === 'preparatoria') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — PREPARATORIA'
    } else if (tipo === 'auto-pruebas') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — AUTO PRUEBAS'
    } else if (tipo === 'juicio-oral') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — JUICIO'
    } else if (tipo === 'sentido-fallo') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — SENTIDO FALLO INDIVIDUALIZACIÓN PENA 447'
    } else if (tipo === 'individualizacion-pena') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — INDIVIDUALIZACIÓN PENA 447'
    } else if (tipo === 'lectura-sentencia') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — LECTURA SENTENCIA'
    } else if (tipo === 'preacuerdo') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — PREACUERDO'
    } else if (tipo === 'solicitud-preclusion') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — SOLICITUD PRECLUSIÓN'
    } else if (tipo === 'recordatorio') {
      $('#ovPreviewTitulo').textContent = 'Vista previa — RECORDATORIO DE AUDIENCIA'
    } else {
      $('#ovPreviewTitulo').textContent = 'Vista previa — ORDEN VERBAL No. ' + (data.campos.no_orden_verbal || '')
    }
    $('#ovPreview').innerHTML = data.html
    $('#ovPreview').classList.toggle('ov-preview-docx', esOficioWord(tipo))
    actualizarAccionesOficio()
    buscarOrdenVerbal()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function cambiarTipoOficio() {
  state.ovTipo = normalizarTipoOficio($('#ovTipoDoc').value)
  $$('.nav-subitem[data-oficio]').forEach((b) => {
    b.classList.toggle('active', b.dataset.oficio === state.ovTipo)
  })
  marcarGruposNav()
  actualizarTituloOficio()
  actualizarCamposActa()
  actualizarAccionesOficio()
  if (state.ovId) cargarPreviewOficio()
}

function cambiarResultadoActa() {
  if (state.ovTipo === 'acta' && state.ovId) cargarPreviewOficio()
}

function generarOrdenVerbal() {
  if (!state.ovId) return mostrarToast('Debe seleccionar un registro.', 'error')
  const tipo = normalizarTipoOficio(state.ovTipo)
  const params = agregarCamposManuales(paramsOficio())
  params.set('descargar', '1')
  const a = document.createElement('a')
  a.href = `/api/orden-verbal/${state.ovId}/documento?${params.toString()}`
  a.download = (state.ovArchivo || tipo) + '.html'
  document.body.appendChild(a)
  a.click()
  a.remove()
  params.delete('descargar')
  window.open(`/api/orden-verbal/${state.ovId}/documento?${params.toString()}`, '_blank', 'noopener')
}

function imprimirOrdenVerbal() {
  if (!state.ovId) return mostrarToast('Debe seleccionar un registro.', 'error')
  if (esOficioWord()) return descargarWordOficio()
  const params = agregarCamposManuales(paramsOficio())
  const w = window.open(`/api/orden-verbal/${state.ovId}/documento?${params.toString()}`, '_blank', 'noopener')
  if (w) {
    w.addEventListener('load', () => {
      try { w.focus(); w.print() } catch (e) { /* el usuario imprime desde el documento */ }
    })
  }
}

function descargarWordOficio() {
  if (!state.ovId) return mostrarToast('Debe seleccionar un registro.', 'error')
  const params = paramsOficio()
  params.set('descargar', '1')
  const a = document.createElement('a')
  a.href = `/api/orden-verbal/${state.ovId}/documento?${params.toString()}`
  a.download = (state.ovArchivo || state.ovTipo || 'oficio') + '.docx'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

window.seleccionarOrdenVerbal = seleccionarOrdenVerbal
window.cambiarTipoOficio = cambiarTipoOficio
window.cambiarResultadoActa = cambiarResultadoActa
window.descargarWordOficio = descargarWordOficio

function exportarEstadistica() {
  const desde = $('#estDesde').value
  const hasta = $('#estHasta').value
  if (!desde || !hasta) return mostrarToast('Debe indicar el período (desde y hasta).', 'error')
  window.location.href = `/api/ia/estadistica.csv?desde=${desde}&hasta=${hasta}`
}

// ============ ALERTAS ============

async function cargarAlertas(enInicio) {
  try {
    const data = await api('/api/alertas')
    state.alertas = data
    const n = (data.eventos || []).length + (data.vencidas || []).length + (data.prescripciones || []).length
    const badge = $('#badgeAlertas')
    if (badge) {
      badge.textContent = n
      badge.classList.toggle('hidden', n === 0)
    }
    if (enInicio) renderAlertasInicio(data)
    if (state.vista === 'calendario') renderAlertasCal(data)
  } catch (e) { /* sin alertas */ }
}

function htmlAlertas(data) {
  const items = []
  for (const ev of data.eventos || []) {
    items.push(`<div class="alerta alerta-prox">
      <strong>${esc(ev.fecha)} ${esc(ev.hora || '')}</strong>
      ${esc(ev.tipo_audiencia || ev.titulo || 'Audiencia')}
      ${ev.proceso ? ' · ' + esc(ev.proceso) : ''}
    </div>`)
  }
  for (const ev of data.vencidas || []) {
    items.push(`<div class="alerta alerta-venc">
      <strong>Vencida ${esc(ev.fecha)}</strong>
      ${esc(ev.tipo_audiencia || ev.titulo || 'Audiencia')}
      ${ev.proceso ? ' · ' + esc(ev.proceso) : ''}
    </div>`)
  }
  for (const p of data.prescripciones || []) {
    items.push(`<div class="alerta alerta-presc">
      <strong>Prescripción ${esc(p.fecha_prescripcion)}</strong>
      ${esc(p.codigo_interno || p.radicado || p.no || '')}
      ${p.procesado_s ? ' · ' + esc(p.procesado_s) : ''}
    </div>`)
  }
  const n = items.length
  const cuerpo = n
    ? `<div class="alertas-lista">${items.join('')}</div>`
    : '<p class="alertas-vacio">No hay audiencias próximas ni prescripciones en los próximos 90 días.</p>'
  return `<div class="panel panel-alertas nav-grupo alertas-grupo">
    <button class="nav-item nav-toggle alertas-toggle" type="button" aria-expanded="false">
      <span class="nav-ico">&#9888;</span>
      <span class="nav-toggle-label">Alertas (${n})</span>
      <span class="nav-flecha">&#9662;</span>
    </button>
    <div class="nav-submenu alertas-submenu hidden">${cuerpo}</div>
  </div>`
}

function renderAlertasInicio(data) {
  const el = $('#panelAlertasInicio')
  if (el) el.innerHTML = htmlAlertas(data)
}

function renderAlertasCal(data) {
  const el = $('#alertasCalendario')
  if (el) el.innerHTML = htmlAlertas(data)
}

function mostrarPanelAlertas() {
  const destino = state.vista === 'calendario' ? $('#alertasCalendario') : $('#panelAlertasInicio')
  if (state.vista !== 'inicio' && state.vista !== 'calendario') {
    cambiarVista('inicio')
    return
  }
  const grupo = destino && destino.querySelector('.alertas-grupo')
  if (grupo) abrirGrupoNav(grupo, !grupo.classList.contains('abierto'))
}

// ============ CALENDARIO ============

function mesISO(ym) {
  const [y, m] = ym.split('-').map(Number)
  return { y, m }
}

function shiftMes(ym, delta) {
  const { y, m } = mesISO(ym)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function cargarCalendario() {
  if (!state.calMes) state.calMes = hoyISO().slice(0, 7)
  const { y, m } = mesISO(state.calMes)
  const desde = `${state.calMes}-01`
  const ultimo = new Date(y, m, 0).getDate()
  const hasta = `${state.calMes}-${String(ultimo).padStart(2, '0')}`
  const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  $('#calTitulo').textContent = `${nombres[m - 1]} ${y}`
  try {
    const data = await api(`/api/calendario?desde=${desde}&hasta=${hasta}`)
    state.calEventos = data.eventos || []
    renderCalendarioGrid(y, m, ultimo)
    if (!state.calDia) state.calDia = hoyISO().slice(0, 7) === state.calMes ? hoyISO() : desde
    renderListaDia(state.calDia)
    await cargarAlertas(false)
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function renderCalendarioGrid(y, m, ultimo) {
  const primer = new Date(y, m - 1, 1).getDay()
  const offset = (primer + 6) % 7
  const hoy = hoyISO()
  const porFecha = {}
  for (const ev of state.calEventos) {
    if (!porFecha[ev.fecha]) porFecha[ev.fecha] = []
    porFecha[ev.fecha].push(ev)
  }
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  let html = dias.map((d) => `<div class="cal-dow">${d}</div>`).join('')
  for (let i = 0; i < offset; i++) html += '<div class="cal-cel cal-vacia"></div>'
  for (let d = 1; d <= ultimo; d++) {
    const iso = `${state.calMes}-${String(d).padStart(2, '0')}`
    const evs = porFecha[iso] || []
    const clases = ['cal-cel']
    if (iso === hoy) clases.push('cal-hoy')
    if (iso === state.calDia) clases.push('cal-sel')
    if (evs.length) clases.push('cal-con')
    const chips = evs.slice(0, 3).map((e) => `<div class="cal-chip">${esc((e.hora || '') + ' ' + (e.tipo_audiencia || e.titulo || '')).trim()}</div>`).join('')
    const mas = evs.length > 3 ? `<div class="cal-mas">+${evs.length - 3}</div>` : ''
    html += `<button type="button" class="${clases.join(' ')}" data-dia="${iso}">
      <div class="cal-num">${d}</div>${chips}${mas}
    </button>`
  }
  $('#calendarioGrid').innerHTML = html
}

function renderListaDia(iso) {
  state.calDia = iso
  $('#calDiaSel').textContent = iso || ''
  const evs = state.calEventos.filter((e) => e.fecha === iso)
  const admin = puedeEditar()
  if (!evs.length) {
    $('#calListaDia').innerHTML = '<p style="color:#5a6b7c">No hay audiencias agendadas este día.</p>'
    return
  }
  $('#calListaDia').innerHTML = `<div class="tabla-scroll"><table class="tabla">
    <thead><tr><th>Hora</th><th>Tipo</th><th>Proceso</th><th>Responsable</th><th>Estado</th>${admin ? '<th></th>' : ''}</tr></thead>
    <tbody>${evs.map((e) => `<tr>
      <td>${esc(e.hora || '—')}</td>
      <td>${esc(e.tipo_audiencia || e.titulo || '')}</td>
      <td>${esc(e.proceso || '')}</td>
      <td>${esc(e.responsable || '')}</td>
      <td>${esc(e.estado || '')}</td>
      ${admin ? `<td>
        <button class="btn-link" onclick="abrirAgenda(${e.id})">Editar</button>
        <button class="btn-link rojo" onclick="eliminarAgenda(${e.id})">Quitar</button>
      </td>` : ''}
    </tr>`).join('')}</tbody>
  </table></div>`
}

function abrirAgenda(id) {
  $('#formAgenda').reset()
  $('#agId').value = id || ''
  $('#agFecha').value = state.calDia || hoyISO()
  $('#agAlerta').checked = true
  $('#agEstado').value = 'programada'
  if (id) {
    const ev = state.calEventos.find((e) => Number(e.id) === Number(id))
    if (ev) {
      $('#agFecha').value = ev.fecha
      $('#agHora').value = ev.hora || ''
      $('#agTipo').value = ev.tipo_audiencia || ev.titulo || ''
      $('#agProceso').value = ev.proceso || ''
      $('#agResp').value = ev.responsable || ''
      $('#agEstado').value = ev.estado || 'programada'
      $('#agNotas').value = ev.notas || ''
      $('#agAlerta').checked = Number(ev.alerta) !== 0
    }
  }
  $('#modalAgendaTitulo').textContent = id ? 'Editar audiencia' : 'Agendar audiencia'
  abrirModal('modalAgenda')
}

async function guardarAgenda(e) {
  e.preventDefault()
  const id = $('#agId').value
  const body = {
    fecha: $('#agFecha').value,
    hora: $('#agHora').value,
    titulo: $('#agTipo').value || 'Audiencia',
    tipo_audiencia: $('#agTipo').value,
    proceso: $('#agProceso').value,
    responsable: $('#agResp').value,
    estado: $('#agEstado').value,
    notas: $('#agNotas').value,
    alerta: $('#agAlerta').checked ? 1 : 0
  }
  try {
    if (id) await api('/api/calendario/' + id, { method: 'PUT', body: JSON.stringify(body) })
    else await api('/api/calendario', { method: 'POST', body: JSON.stringify(body) })
    mostrarToast('Agenda actualizada.', 'success')
    cerrarModal('modalAgenda')
    state.calDia = body.fecha
    await cargarCalendario()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

async function eliminarAgenda(id) {
  if (!confirm('¿Quitar este evento del calendario?')) return
  try {
    await api('/api/calendario/' + id, { method: 'DELETE' })
    mostrarToast('Evento eliminado.', 'success')
    await cargarCalendario()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

// ============ USUARIOS ============

async function cargarUsuarios() {
  const data = await api('/api/usuarios')
  $('#tablaUsuarios').innerHTML = data.usuarios
    .map((u) => `<tr>
        <td><strong>${esc(u.nombre_completo)}</strong></td>
        <td>${esc(u.username)}</td>
        <td>${badgeRol(u.rol)}</td>
        <td>${u.activo ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-off">Inactivo</span>'}</td>
        <td>${esc(u.creado_en || '')}</td>
        <td>
          <button class="btn-link" onclick="abrirModalUsuario(${u.id})">Editar</button>
          <button class="btn-link" onclick="cambiarPassword(${u.id})">Contraseña</button>
          <button class="btn-link rojo" onclick="eliminarUsuario(${u.id})">Eliminar</button>
        </td>
      </tr>`)
    .join('')
}

function badgeRol(rol) {
  const cls = rol === 'administrador' ? '' : rol === 'usuario' ? 'badge-rol-usuario' : 'badge-rol-consulta'
  const lbl = rol === 'administrador' ? 'Administrador' : rol === 'usuario' ? 'Usuario' : 'Consulta'
  return `<span class="badge badge-rol ${cls}">${lbl}</span>`
}

async function abrirModalUsuario(id) {
  $('#modalUsuarioTitulo').textContent = id ? 'Editar usuario' : 'Nuevo usuario'
  $('#formUsuario').reset()
  $('#uId').value = id || ''
  $('#uPassword').placeholder = id ? '(dejar en blanco para no cambiar)' : ''
  if (id) {
    const data = await api('/api/usuarios')
    const u = data.usuarios.find((x) => x.id === id)
    if (u) {
      $('#uNombre').value = u.nombre_completo
      $('#uUsername').value = u.username
      $('#uRol').value = u.rol
      $('#uActivo').value = String(u.activo)
    }
  }
  $('#modalUsuario').classList.remove('hidden')
}

async function guardarUsuario(e) {
  e.preventDefault()
  const id = $('#uId').value
  const body = { nombre_completo: $('#uNombre').value, rol: $('#uRol').value, activo: $('#uActivo').value === '1' }
  try {
    if (id) {
      await api('/api/usuarios/' + id, { method: 'PUT', body: JSON.stringify(body) })
      mostrarToast('Usuario actualizado correctamente.', 'success')
    } else {
      const username = $('#uUsername').value.trim()
      const password = $('#uPassword').value
      if (!username) return mostrarToast('Debe indicar el usuario de inicio de sesión.', 'error')
      if (!password) return mostrarToast('Debe indicar la contraseña para el nuevo usuario.', 'error')
      const chequeo = validarClaveSegura(password, { username, nombre: $('#uNombre').value })
      if (!chequeo.ok) return mostrarToast(chequeo.errores[0], 'error')
      await api('/api/usuarios', { method: 'POST', body: JSON.stringify({ ...body, username, password }) })
      mostrarToast('Usuario creado correctamente.', 'success')
    }
    cerrarModal('modalUsuario')
    cargarUsuarios()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function cambiarPassword(id) {
  const pass = prompt('Ingrese la nueva contraseña.\nDebe tener mínimo 6 caracteres, con mayúscula, minúscula, número y carácter especial. Ejemplo: Ab3$xy')
  if (pass === null) return
  const chequeo = validarClaveSegura(pass, {})
  if (!chequeo.ok) return mostrarToast(chequeo.errores[0], 'error')
  api('/api/usuarios/' + id + '/password', { method: 'PUT', body: JSON.stringify({ password: pass }) })
    .then(() => mostrarToast('Contraseña actualizada.', 'success'))
    .catch((e) => mostrarToast(e.message, 'error'))
}

async function eliminarUsuario(id) {
  if (!confirm('¿Está seguro de eliminar este usuario?')) return
  try {
    await api('/api/usuarios/' + id, { method: 'DELETE' })
    mostrarToast('Usuario eliminado.', 'success')
    cargarUsuarios()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

// ============ BASE DE DATOS ============

function descargarRespaldo() {
  window.location.href = '/api/backup'
}

async function restaurarBase() {
  const file = $('#inputRestaurar').files[0]
  if (!file) {
    mostrarToast('Seleccione primero un archivo de respaldo (.db).', 'error')
    return
  }
  if (!confirm('Se reemplazará toda la base de datos actual por el respaldo. La aplicación se reiniciará. ¿Desea continuar?')) return

  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = String(reader.result).split(',')[1]
    try {
      const r = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: base64 })
      })
      if (r.ok) {
        mostrarToast('Base de datos restaurada. La aplicación se reiniciará.', 'success')
        setTimeout(() => { window.location.reload() }, 1500)
      } else {
        const d = await r.json().catch(() => ({}))
        mostrarToast((d && d.error) || 'Error al restaurar.', 'error')
      }
    } catch (e) {
      mostrarToast(e.message, 'error')
    }
  }
  reader.readAsDataURL(file)
}

function exportarBaseDatos(formato) {
  window.location.href = '/api/backups/exportar?formato=' + encodeURIComponent(formato)
}

function formatearBytes(n) {
  const v = Number(n) || 0
  if (v < 1024) return v + ' B'
  if (v < 1048576) return (v / 1024).toFixed(1) + ' KB'
  return (v / 1048576).toFixed(2) + ' MB'
}

function cambiarTabBd(tab) {
  $$('#vista-bd .tab-bd').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
  $$('#vista-bd .tab-panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab))
}

function pintarProgramacion(config) {
  state.bdConfig = config
  $('#progActivo').checked = !!config.activo
  $('#progFrecuencia').value = config.frecuencia || 'diaria'
  $('#progHora').value = config.hora || '22:00'
  $('#progDiaSemana').value = String(config.dia_semana == null ? 1 : config.dia_semana)
  $('#progDiaMes').value = config.dia_mes || 1
  $('#progHoras').value = config.intervalo_custom_horas || 24
  $('#progMaxCopias').value = config.max_copias || 30
  $('#progCifrado').checked = !!config.cifrado
  $('#progRedundancia').checked = !!config.redundancia
  actualizarCamposFrecuencia()
  const info = []
  if (config.proximo_ejecutado) info.push('Próxima ejecución: ' + config.proximo_ejecutado)
  if (config.ultimo_ejecutado) info.push('Última ejecución: ' + config.ultimo_ejecutado)
  info.push('Zona horaria: America/Bogota (Colombia).')
  $('#progInfo').textContent = info.join('  |  ')
}

async function ejecutarProgramacionAhora() {
  const btn = $('#btnEjecutarAhora')
  if (btn) { btn.disabled = true; btn.textContent = 'Ejecutando...' }
  try {
    const r = await api('/api/backups/ejecutar-ahora', { method: 'POST' })
    const correo = r.correo ? ' Correo: ' + r.correo.estado + '.' : ''
    mostrarToast('Copia programada #' + r.backup.id + ' generada.' + correo, 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ejecutar ahora' }
  }
}

function pintarBoveda(data) {
  const cadena = (data && data.cadena) || {}
  const punto = data && data.puntoLimpio
  const estado = $('#bovedaEstado')
  const pl = $('#bovedaPuntoLimpio')
  if (estado) {
    estado.textContent = cadena.ok
      ? 'Cadena íntegra: ' + (cadena.copias || 0) + ' copias selladas. Hash SHA-256 verificado.'
      : 'Incidencias en la bóveda: ' + ((cadena.rotas || []).length) + '. Revise los hashes.'
  }
  if (pl) {
    pl.textContent = punto
      ? 'Punto limpio: ' + punto.nombre + ' (' + (punto.fecha || punto.actualizado) + ') checksum ' + String(punto.checksum || '').slice(0, 16) + '…'
      : 'Aún no hay punto limpio. Se marca automáticamente en cada copia programada, o use una copia verificada.'
  }
  const filas = ((data && data.copias) || []).map((c) => `<tr>
    <td>${esc(c.ts || c.fecha || '')}</td>
    <td>${esc(c.nombre || '')}</td>
    <td title="${esc(c.checksum)}">${esc(String(c.checksum || '').slice(0, 16))}…</td>
    <td title="${esc(c.eslabon)}">${esc(String(c.eslabon || '').slice(0, 12))}…</td>
  </tr>`).join('')
  const tbody = $('#tablaBoveda')
  if (tbody) tbody.innerHTML = filas || '<tr><td colspan="4">La bóveda aún no tiene copias selladas.</td></tr>'
}

async function cargarBoveda() {
  try {
    pintarBoveda(await api('/api/vault'))
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function verificarBoveda() {
  try {
    const r = await api('/api/vault/verificar', { method: 'POST' })
    mostrarToast(r.ok ? 'Bóveda íntegra (' + r.copias + ' copias).' : 'Bóveda con incidencias.', r.ok ? 'success' : 'error')
    cargarBoveda()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function exportarOffline() {
  try {
    const r = await api('/api/vault/offline', { method: 'POST' })
    mostrarToast('Paquete offline generado: ' + r.destino, 'success')
    cargarBoveda()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

function actualizarCamposFrecuencia() {
  const f = $('#progFrecuencia').value
  $('#progDiaSemanaCampo').style.display = f === 'semanal' ? '' : 'none'
  $('#progDiaMesCampo').style.display = f === 'mensual' ? '' : 'none'
  $('#progHorasCampo').style.display = f === 'personalizada' ? '' : 'none'
  $('#progHora').parentElement.style.display = f === 'personalizada' ? 'none' : ''
}

const SMTP_PROVEEDORES = {
  outlook: {
    host: 'smtp.office365.com',
    puerto: 587,
    seguro: false,
    ayuda: 'Outlook / Microsoft 365: smtp.office365.com, puerto 587, SSL directo desmarcado (STARTTLS). Usuario y remitente = el mismo correo completo. Con MFA use una contraseña de aplicación y active SMTP AUTH en el buzón.'
  },
  gmail: {
    host: 'smtp.gmail.com',
    puerto: 587,
    seguro: false,
    ayuda: 'Gmail: smtp.gmail.com, puerto 587, SSL directo desmarcado (STARTTLS). Usuario y remitente = su Gmail completo. Debe activar verificación en 2 pasos y crear una contraseña de aplicación (16 caracteres). La contraseña normal de Gmail no funciona.'
  }
}

function detectarProveedorSmtp(host, puerto, seguro) {
  const h = String(host || '').trim().toLowerCase()
  if (h === 'smtp.gmail.com') return 'gmail'
  if (h === 'smtp.office365.com' || h === 'smtp-mail.outlook.com') return 'outlook'
  return ''
}

function aplicarProveedorSmtp(nombre, soloAyuda) {
  const p = SMTP_PROVEEDORES[nombre]
  const ayuda = $('#smtpAyudaProveedor')
  if (!p) {
    if (ayuda) ayuda.textContent = 'Outlook: smtp.office365.com, puerto 587, SSL directo desmarcado. Gmail: smtp.gmail.com, puerto 587, SSL directo desmarcado. En ambos el usuario y el remitente deben ser el mismo correo completo. Con verificación en dos pasos use una contraseña de aplicación, no la contraseña normal.'
    return
  }
  if (!soloAyuda) {
    $('#smtpHost').value = p.host
    $('#smtpPuerto').value = p.puerto
    $('#smtpSeguro').checked = !!p.seguro
  }
  if (ayuda) ayuda.textContent = p.ayuda
}

function pintarCorreo(data) {
  const correo = data.correo || {}
  const envio = data.envio || data.config || {}
  $('#correoActivo').checked = !!envio.correo_activo
  $('#correoDestinatarios').value = (envio.correos || []).join('; ')
  $('#correoAsunto').value = envio.asunto || ''
  $('#correoAdjuntoMax').value = envio.adjunto_max_mb || 20
  $('#correoReintentos').value = envio.reintentos || 3
  $('#smtpActivo').checked = !!correo.activo
  $('#smtpHost').value = correo.host || ''
  $('#smtpPuerto').value = correo.puerto || 587
  $('#smtpSeguro').checked = !!correo.seguro
  $('#smtpUsuario').value = correo.usuario || ''
  $('#smtpPassword').value = ''
  $('#smtpRemitente').value = correo.remitente || ''
  $('#smtpRemitenteNombre').value = correo.remitente_nombre || ''
  const proveedor = detectarProveedorSmtp(correo.host)
  if ($('#smtpProveedor')) $('#smtpProveedor').value = proveedor
  aplicarProveedorSmtp(proveedor, true)
  pintarEnvios(data.envios || [])
}

function pintarEnvios(envios) {
  const filas = envios.map((e) => {
    const badge = e.estado === 'enviado' ? 'badge-ok'
      : e.estado === 'simulado' ? 'badge-simulado'
      : e.estado === 'omitido' ? 'badge-off' : 'badge-fallo'
    return `<tr>
      <td>${esc(e.fecha)}</td>
      <td>${e.backup_id ? '#' + e.backup_id : '—'}</td>
      <td>${esc(e.destinatarios || '')}</td>
      <td>${esc(e.asunto || '')}</td>
      <td><span class="badge ${badge}">${esc(e.estado)}</span></td>
      <td>${esc(e.intentos)}</td>
      <td>${esc(e.ultimo_error || e.resumen || '')}</td>
    </tr>`
  }).join('')
  $('#tablaEnvios').innerHTML = filas || '<tr><td colspan="7">Sin envíos registrados.</td></tr>'
}

function pintarCopias(copias) {
  const filas = copias.map((c) => {
    const restaur = c.restauracion_probada
      ? '<span class="badge badge-ok">Verificada</span>'
      : '<span class="badge badge-fallo">Sin verificar</span>'
    return `<tr>
      <td>${c.id}</td>
      <td>${esc(c.fecha)}</td>
      <td>${esc(c.nombre)}${c.ruta_redundante ? ' <span class="badge badge-ok" title="Copia redundante almacenada">redundante</span>' : ''}</td>
      <td>${formatearBytes(c.tamano)}</td>
      <td>v${esc(c.version)}</td>
      <td>${esc(c.tipo)}</td>
      <td>${c.cifrado ? 'AES-256' : 'No'}</td>
      <td title="${esc(c.checksum)}">${esc(String(c.checksum || '').slice(0, 12))}…</td>
      <td>${restaur}</td>
      <td><div class="copias-acciones">
        <button class="btn-link" onclick="descargarCopia(${c.id})">Descargar</button>
        <button class="btn-link" onclick="enlaceCopia(${c.id})">Enlace</button>
        <button class="btn-link" onclick="verificarCopia(${c.id})">Verificar</button>
        <button class="btn-link rojo" onclick="eliminarCopia(${c.id})">Eliminar</button>
      </div></td>
    </tr>`
  }).join('')
  $('#tablaCopias').innerHTML = filas || '<tr><td colspan="10">Aún no se han generado copias de seguridad.</td></tr>'
}

async function cargarBaseDatos() {
  try {
    const data = await api('/api/backups')
    pintarCopias(data.copias || [])
    pintarProgramacion(data.config || {})
    pintarCorreo(data)
    cargarBoveda()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function generarCopia() {
  const btn = $('#btnGenerarCopia')
  btn.disabled = true
  btn.textContent = 'Generando copia...'
  try {
    const r = await api('/api/backups', {
      method: 'POST',
      body: JSON.stringify({
        cifrado: $('#copiaCifrar').checked,
        redundancia: $('#copiaRedundante').checked,
        enviarCorreo: $('#copiaEnviarCorreo').checked
      })
    })
    const correo = r.correo ? ` Correo: ${r.correo.estado}.` : ''
    mostrarToast(`Copia #${r.backup.id} generada (${formatearBytes(r.backup.tamano)}).${correo}`, 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Generar copia de seguridad'
  }
}

function descargarCopia(id) {
  window.location.href = '/api/backups/' + id + '/descargar'
}

async function enlaceCopia(id) {
  try {
    const r = await api('/api/backups/' + id + '/enlace')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(r.url)
      mostrarToast('Enlace seguro copiado al portapapeles (válido 72 horas).', 'success')
    } else {
      prompt('Enlace seguro de descarga (válido 72 horas):', r.url)
    }
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function verificarCopia(id) {
  try {
    const r = await api('/api/backups/' + id + '/verificar', { method: 'POST' })
    mostrarToast(r.detalle || (r.ok ? 'Verificación correcta.' : 'Verificación fallida.'), r.ok ? 'success' : 'error')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function verificarTodas() {
  try {
    const data = await api('/api/backups')
    let ok = 0
    for (const c of data.copias || []) {
      const r = await api('/api/backups/' + c.id + '/verificar', { method: 'POST' })
      if (r.ok) ok++
    }
    mostrarToast(`Verificación completada: ${ok} de ${(data.copias || []).length} copias correctas.`, 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function eliminarCopia(id) {
  if (!confirm('¿Está seguro de eliminar esta copia de seguridad? Esta acción no se puede deshacer.')) return
  try {
    await api('/api/backups/' + id, { method: 'DELETE' })
    mostrarToast('Copia eliminada.', 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function guardarProgramacion() {
  try {
    await api('/api/backups/config', {
      method: 'PUT',
      body: JSON.stringify({
        activo: $('#progActivo').checked,
        frecuencia: $('#progFrecuencia').value,
        hora: $('#progHora').value,
        dia_semana: Number($('#progDiaSemana').value),
        dia_mes: Number($('#progDiaMes').value),
        intervalo_custom_horas: Number($('#progHoras').value),
        max_copias: Number($('#progMaxCopias').value),
        cifrado: $('#progCifrado').checked,
        redundancia: $('#progRedundancia').checked
      })
    })
    mostrarToast('Programación guardada.', 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function guardarCorreo() {
  const correos = $('#correoDestinatarios').value.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
  const usuarioSmtp = $('#smtpUsuario').value.trim()
  if ($('#smtpActivo').checked && usuarioSmtp && !usuarioSmtp.includes('@')) {
    mostrarToast('El usuario SMTP debe ser el correo completo (Gmail u Outlook), no el usuario "admin" de esta aplicación.', 'error')
    return
  }
  try {
    await api('/api/correo/config', {
      method: 'PUT',
      body: JSON.stringify({
        correo_activo: $('#correoActivo').checked,
        correos,
        asunto: $('#correoAsunto').value,
        adjunto_max_mb: Number($('#correoAdjuntoMax').value),
        reintentos: Number($('#correoReintentos').value),
        activo: $('#smtpActivo').checked,
        host: $('#smtpHost').value.trim(),
        puerto: Number($('#smtpPuerto').value),
        seguro: $('#smtpSeguro').checked,
        usuario: $('#smtpUsuario').value.trim(),
        password: $('#smtpPassword').value,
        remitente: $('#smtpRemitente').value.trim(),
        remitente_nombre: $('#smtpRemitenteNombre').value.trim()
      })
    })
    $('#correoMsg').textContent = 'Configuración guardada.'
    mostrarToast('Configuración de correo guardada.', 'success')
    cargarBaseDatos()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

async function probarCorreo() {
  const btn = $('#btnProbarCorreo')
  btn.disabled = true
  try {
    const destinatarios = $('#correoDestinatarios').value.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
    const r = await api('/api/correo/prueba', {
      method: 'POST',
      body: JSON.stringify({ destinatarios, asunto: $('#correoAsunto').value })
    })
    const msg = r.estado === 'simulado'
      ? 'Correo de prueba generado localmente (sin servidor SMTP configurado).'
      : `Correo de prueba ${r.estado}.`
    $('#correoMsg').textContent = msg + (r.detalle ? ' ' + r.detalle : '')
    mostrarToast(msg, 'success')
    cargarBaseDatos()
  } catch (e) {
    $('#correoMsg').textContent = e.message
    mostrarToast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}

// ============ AUDITORÍA (solo administrador) ============

function queryAuditoria() {
  const p = new URLSearchParams()
  const campos = { desde: '#audDesde', hasta: '#audHasta', texto: '#audTexto' }
  for (const [k, sel] of Object.entries(campos)) {
    const v = $(sel).value.trim()
    if (v) p.set(k, v)
  }
  if ($('#audUsuario').value) p.set('usuario', $('#audUsuario').value)
  if ($('#audAccion').value) p.set('accion', $('#audAccion').value)
  if ($('#audModulo').value) p.set('modulo', $('#audModulo').value)
  if ($('#audExito').value !== '') p.set('exito', $('#audExito').value)
  return p
}

async function cargarOpcionesAuditoria() {
  try {
    const o = await api('/api/auditoria/opciones')
    const opt = (v) => `<option value="${esc(v)}">${esc(v)}</option>`
    $('#audUsuario').innerHTML = '<option value="">Todos los usuarios</option>' + (o.usuarios || []).map(opt).join('')
    $('#audAccion').innerHTML = '<option value="">Todas las acciones</option>' + (o.acciones || []).map(opt).join('')
    $('#audModulo').innerHTML = '<option value="">Todos los módulos</option>' + (o.modulos || []).map(opt).join('')
  } catch (e) { /* silencioso */ }
}

async function cargarAuditoria() {
  await cargarOpcionesAuditoria()
  const p = queryAuditoria()
  p.set('page', state.audPagina)
  p.set('porPagina', $('#audPorPagina').value)
  try {
    const data = await api('/api/auditoria?' + p.toString())
    state.audPaginas = data.paginas
    state.audRegistros = {}
    ;(data.registros || []).forEach((r) => { state.audRegistros[r.id] = r })
    pintarAuditoria(data)
    cargarAlertasAuditoria()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

function pintarAuditoria(data) {
  const filas = (data.registros || []).map((r) => `<tr class="${r.exito ? '' : 'fila-fallida'}">
      <td>${esc(r.fecha)}</td>
      <td>${esc(r.usuario || '—')}</td>
      <td>${esc(r.rol || '—')}</td>
      <td><strong>${esc(r.accion)}</strong></td>
      <td>${esc(r.modulo || '—')}</td>
      <td>${esc(r.registro_id || '—')}</td>
      <td>${esc(r.descripcion || '')}</td>
      <td>${esc(r.ip || '')}</td>
      <td>${esc(r.dispositivo || '')}</td>
      <td>${r.exito ? '<span class="badge badge-ok">Exitoso</span>' : '<span class="badge badge-fallo">Fallido</span>'}</td>
      <td><button class="btn-link" onclick="verDetalleAuditoria(${r.id})">Ver</button></td>
    </tr>`).join('')
  $('#tablaAuditoria').innerHTML = filas || '<tr><td colspan="11">No hay registros que coincidan con los filtros.</td></tr>'
  const fallidos = (data.registros || []).filter((r) => !r.exito).length
  $('#audResumen').innerHTML = `<span><strong>${data.total}</strong> registros en total</span>
    <span>Mostrando <strong>${(data.registros || []).length}</strong></span>
    <span>Fallidos en esta página: <strong>${fallidos}</strong></span>`
  $('#audPagInfo').textContent = `Página ${data.page} de ${data.paginas}`
  $('#audPagAnt').disabled = data.page <= 1
  $('#audPagSig').disabled = data.page >= data.paginas
}

function verDetalleAuditoria(id) {
  const r = state.audRegistros[id]
  if (!r) return
  const par = (k, v) => `<dt>${esc(k)}</dt><dd>${esc(v == null || v === '' ? '—' : v)}</dd>`
  $('#audDetalleCuerpo').innerHTML = `
    <dl class="aud-detalle-grid">
      ${par('ID', r.id)}
      ${par('Fecha y hora', r.fecha)}
      ${par('Usuario', r.usuario)}
      ${par('Rol', r.rol)}
      ${par('Acción', r.accion)}
      ${par('Módulo', r.modulo)}
      ${par('ID del registro afectado', r.registro_id)}
      ${par('Descripción', r.descripcion)}
      ${par('Resultado', r.exito ? 'Exitoso' : 'Fallido')}
      ${par('Error', r.error)}
      ${par('Dirección IP', r.ip)}
      ${par('Dispositivo', r.dispositivo)}
      ${par('Método / ruta', (r.metodo || '') + ' ' + (r.ruta || ''))}
      ${par('Checksum (SHA-256)', r.checksum)}
      ${par('Checksum previo', r.checksum_previo)}
    </dl>
    ${r.antes ? `<div class="aud-json-titulo">Valores anteriores</div><pre class="aud-json">${esc(formatearJson(r.antes))}</pre>` : ''}
    ${r.despues ? `<div class="aud-json-titulo">Valores posteriores</div><pre class="aud-json">${esc(formatearJson(r.despues))}</pre>` : ''}
  `
  abrirModal('modalAuditoriaDetalle')
}

function formatearJson(v) {
  try { return JSON.stringify(JSON.parse(v), null, 2) } catch (e) { return String(v) }
}

function exportarAuditoria(formato) {
  const p = queryAuditoria()
  p.set('formato', formato)
  window.location.href = '/api/auditoria/export?' + p.toString()
}

async function verificarIntegridadAuditoria() {
  const el = $('#audIntegridad')
  el.textContent = 'Verificando...'
  el.className = 'aud-integridad'
  try {
    const r = await api('/api/auditoria/verificar')
    if (r.ok) {
      el.textContent = `Cadena íntegra: ${r.total} registros verificados.`
      el.classList.add('ok')
      mostrarToast('La auditoría no ha sido alterada.', 'success')
    } else {
      el.textContent = `Alteración detectada a partir del registro #${r.primerError}.`
      el.classList.add('error')
      mostrarToast('Se detectaron alteraciones en la auditoría.', 'error')
    }
  } catch (e) {
    el.textContent = e.message
    el.classList.add('error')
  }
}

async function cargarAlertasAuditoria() {
  try {
    const data = await api('/api/auditoria/alertas')
    const alertas = data.alertas || []
    $('#listaAlertasAuditoria').innerHTML = alertas.length
      ? alertas.map((a) => `<div class="aud-alerta ${esc(a.severidad)} ${a.atendida ? 'atendida' : ''}">
          <div class="aud-alerta-cab">
            <h4>${esc(a.tipo)} <span class="badge badge-sev-${esc(a.severidad)}">${esc(a.severidad)}</span></h4>
            <div>
              <span class="ayuda-campo">${esc(a.fecha)}</span>
              ${a.atendida ? '<span class="badge badge-off">Atendida</span>' : `<button class="btn-link" onclick="atenderAlertaAuditoria(${a.id})">Marcar atendida</button>`}
            </div>
          </div>
          <p>${esc(a.descripcion)}</p>
          <p class="ayuda-campo">Usuario: ${esc(a.usuario || '—')} · IP: ${esc(a.ip || '—')}</p>
        </div>`).join('')
      : '<p class="ayuda-campo">No se han detectado comportamientos anómalos.</p>'
  } catch (e) { /* silencioso */ }
}

async function atenderAlertaAuditoria(id) {
  try {
    await api('/api/auditoria/alertas/' + id + '/atender', { method: 'POST' })
    mostrarToast('Alerta marcada como atendida.', 'success')
    cargarAlertasAuditoria()
  } catch (e) {
    mostrarToast(e.message, 'error')
  }
}

function cerrarModal(id) {
  $('#' + id).classList.add('hidden')
}

function abrirModal(id) {
  $('#' + id).classList.remove('hidden')
}

function toggleDropdown(btn, menu) {
  const m = $(menu)
  if (m.classList.contains('hidden')) {
    m.classList.remove('hidden')
    const cerrar = (e) => {
      if (!e.target.closest(btn) && !e.target.closest(menu)) {
        m.classList.add('hidden')
        document.removeEventListener('click', cerrar)
      }
    }
    document.addEventListener('click', cerrar)
  } else {
    m.classList.add('hidden')
  }
}

function toggleColumnaMenu(nombre, btn) {
  const menu = btn.closest('.dropdown').querySelector('.columna-menu')
  const elBtn = btn.closest('.dropdown')
  if (menu.classList.contains('hidden')) {
    cerrarMenus()
    menu.classList.remove('hidden')
    const cerrar = (e) => {
      if (!e.target.closest('.dropdown')) {
        menu.classList.add('hidden')
        document.removeEventListener('click', cerrar)
      }
    }
    document.addEventListener('click', cerrar)
  } else {
    menu.classList.add('hidden')
  }
}

function cerrarMenus() {
  $$('.dropdown-menu:not(.hidden)').forEach((m) => m.classList.add('hidden'))
}

// ============ ESTRUCTURA (solo administrador) ============

async function cargarEstructura() {
  const select = $('#estTabla')
  const modulos = tablasOrdenadas()
  const actual = select.value
  select.innerHTML = modulos
    .map((t) => `<option value="${t}">${esc(state.tablas[t].titulo)}</option>`)
    .join('')
  select.value = modulos.includes(actual) ? actual : (modulos[0] || '')
  state.estTabla = select.value || modulos[0]
  renderEstructura()
}

async function eliminarTablaActual() {
  const conf = state.tablas[state.estTabla]
  const nombre = state.estTabla
  const modulos = tablasOrdenadas()
  if (nombre === 'procesos') {
    mostrarToast('No se puede eliminar el módulo de Procesos Penales.', 'error')
    return
  }
  if (!confirm(`¿Eliminar el módulo "${conf.titulo}" completo?\nSe borrarán TODOS sus registros y la hoja desaparecerá del menú. Esta acción no se puede deshacer.`)) return
  if (!confirm(`ÚLTIMA CONFIRMACIÓN: el módulo "${conf.titulo}" se eliminará de forma permanente. ¿Continuar?`)) return
  try {
    await api(`/api/esquema/${nombre}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmar: true })
    })
    mostrarToast(`Módulo "${conf.titulo}" eliminado.`, 'success')
    await cargarTablas()
    if (modulos.length <= 1) {
      cambiarVista('inicio')
    } else {
      state.estTabla = null
      await cargarEstructura()
    }
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function renderEstructura() {
  const conf = state.tablas[state.estTabla]
  const columnas = conf.columnas

  $('#tablaColumnas').innerHTML = columnas
    .map((c, i) => {
      const nOpciones = (c.opciones || []).length
      const pos = conf.visibles.indexOf(c.nombre)
      const enOrden = pos >= 0
      const orden = enOrden ? (pos + 1) : '—'
      const up = enOrden && pos > 0
      const down = enOrden && pos < conf.visibles.length - 1
      return `<tr>
        <td>
          <span class="orden-num">${orden}</span>
          <button class="btn-link" onclick="moverColumna('${esc(c.nombre)}','up')" ${up ? '' : 'disabled style="opacity:.35"'}>&#9650;</button>
          <button class="btn-link" onclick="moverColumna('${esc(c.nombre)}','down')" ${down ? '' : 'disabled style="opacity:.35"'}>&#9660;</button>
        </td>
        <td><code>${esc(c.nombre)}</code></td>
        <td><span class="etiqueta-editable" title="Clic para cambiar el título" onclick="editarEtiqueta('${esc(c.nombre)}', this)">${esc(c.etiqueta)}</span></td>
        <td><span class="tipo tipo-${esc(c.tipo)}">${esc(c.tipo)}</span></td>
        <td>${esc(c.seccion || 'General')}</td>
        <td>${c.visible ? '<span class="ok">Sí</span>' : '<span class="no">No</span>'}</td>
        <td>${nOpciones ? `<button class="btn-link" onclick="editarOpciones('${esc(c.nombre)}')">${nOpciones} opciones</button>` : '<span style="color:#8a97a5">—</span>'}</td>
        <td>
          <div class="dropdown">
            <button class="btn-link" onclick="toggleColumnaMenu('${esc(c.nombre)}', this)">Acciones &#9662;</button>
            <div class="dropdown-menu hidden columna-menu">
              <button type="button" class="dropdown-item" onclick="abrirModalColumna('${esc(c.nombre)}')">Editar columna</button>
              <button type="button" class="dropdown-item" onclick="editarOpciones('${esc(c.nombre)}')">${nOpciones ? `Opciones de lista (${nOpciones})` : 'Agregar opciones de lista'}</button>
              <button type="button" class="dropdown-item rojo" onclick="eliminarColumna('${esc(c.nombre)}')">Eliminar columna</button>
            </div>
          </div>
        </td>
      </tr>`
    })
    .join('')
}

async function editarEtiqueta(nombre, span) {
  const conf = state.tablas[state.estTabla]
  const c = conf.columnas.find((x) => x.nombre === nombre)
  const valorAnterior = c.etiqueta
  const input = document.createElement('input')
  input.type = 'text'
  input.value = valorAnterior
  input.className = 'etiqueta-input'
  input.style.width = Math.max(valorAnterior.length * 8, 200) + 'px'
  span.replaceWith(input)
  input.focus()
  input.select()

  const guardar = async () => {
    const nuevo = input.value.trim()
    if (nuevo && nuevo !== valorAnterior) {
      try {
        await api(`/api/esquema/${state.estTabla}/columnas/${encodeURIComponent(nombre)}`, {
          method: 'PUT',
          body: JSON.stringify({ etiqueta: nuevo })
        })
        mostrarToast('Título de columna actualizado.', 'success')
      } catch (err) {
        mostrarToast(err.message, 'error')
        input.replaceWith(span)
        return
      }
    }
    await cargarTablas()
    renderEstructura()
  }

  const cancelar = () => input.replaceWith(span)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); e.preventDefault() }
    if (e.key === 'Escape') { cancelar(); input.removeEventListener('blur', guardar) }
  })
  input.addEventListener('blur', guardar)
}

async function moverColumna(nombre, direccion) {
  const conf = state.tablas[state.estTabla]
  const visibles = [...conf.visibles]
  const pos = visibles.indexOf(nombre)
  if (pos < 0) return
  const objetivo = direccion === 'up' ? pos - 1 : pos + 1
  if (objetivo < 0 || objetivo >= visibles.length) return
  ;[visibles[pos], visibles[objetivo]] = [visibles[objetivo], visibles[pos]]
  try {
    await api(`/api/esquema/${state.estTabla}`, { method: 'PUT', body: JSON.stringify({ visibles }) })
    await cargarTablas()
    renderEstructura()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function abrirModalColumna(nombre) {
  const conf = state.tablas[state.estTabla]
  const c = nombre ? conf.columnas.find((x) => x.nombre === nombre) : null
  $('#modalColumnaTitulo').textContent = c ? `Editar columna — ${c.etiqueta}` : 'Nueva columna'
  $('#colNombreOriginal').value = c ? c.nombre : ''
  $('#colNombre').value = c ? c.nombre : ''
  $('#colNombre').readOnly = false
  $('#colEtiqueta').value = c ? c.etiqueta : ''
  $('#colTipo').value = c ? c.tipo : 'texto'
  $('#colSeccion').value = c ? (c.seccion || '') : ''
  $('#colVisible').checked = c ? !!c.visible : false
  $('#colOpciones').value = c ? (c.opciones || []).join('\n') : ''
  mostrarCampoOpciones()
  $('#modalColumna').classList.remove('hidden')
  $('#colNombre').focus()
}

function mostrarCampoOpciones() {
  const tipo = $('#colTipo').value
  $('#colOpcionesCampo').style.display = tipo === 'seleccion' ? '' : 'none'
}

async function guardarColumna(e) {
  e.preventDefault()
  const conf = state.tablas[state.estTabla]
  const nombreOriginal = $('#colNombreOriginal').value
  const payload = {
    nombre: $('#colNombre').value.trim(),
    etiqueta: $('#colEtiqueta').value.trim(),
    tipo: $('#colTipo').value,
    seccion: $('#colSeccion').value.trim(),
    visible: $('#colVisible').checked,
    opciones: $('#colOpciones').value.split('\n').map((o) => o.trim()).filter(Boolean)
  }
  try {
    if (nombreOriginal) {
      await api(`/api/esquema/${state.estTabla}/columnas/${encodeURIComponent(nombreOriginal)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      mostrarToast('Columna actualizada.', 'success')
    } else {
      await api(`/api/esquema/${state.estTabla}/columnas`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      mostrarToast('Columna creada.', 'success')
    }
    cerrarModal('modalColumna')
    await cargarTablas()
    renderEstructura()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

async function eliminarColumna(nombre) {
  const conf = state.tablas[state.estTabla]
  const c = conf.columnas.find((x) => x.nombre === nombre)
  if (!confirm(`¿Eliminar la columna "${c.etiqueta}" (${nombre})? Se borrarán los datos de esa columna en todos los registros.`)) return
  try {
    await api(`/api/esquema/${state.estTabla}/columnas/${encodeURIComponent(nombre)}`, { method: 'DELETE' })
    mostrarToast('Columna eliminada.', 'success')
    await cargarTablas()
    renderEstructura()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function editarOpciones(nombre) {
  const conf = state.tablas[state.estTabla]
  const c = conf.columnas.find((x) => x.nombre === nombre)
  abrirModalColumna(nombre)
}

function abrirModalTabla() {
  if (state.vista === 'modulo' && state.modulo) state.estTabla = state.modulo
  const conf = state.tablas[state.estTabla]
  $('#modalTablaTitulo').textContent = `Configuración — ${conf.titulo}`
  $('#tTitulo').value = conf.titulo
  $('#tDescripcion').value = conf.descripcion || ''

  const columnas = conf.columnas
  const opcionesFecha = (sel, valor) => {
    sel.innerHTML = '<option value="">— Ninguno —</option>' +
      columnas.map((c) => `<option value="${c.nombre}" ${c.nombre === valor ? 'selected' : ''}>${esc(c.etiqueta)}</option>`).join('')
  }
  opcionesFecha($('#tFechaEntrada'), conf.fecha_entrada || '')
  opcionesFecha($('#tFechaSalida'), conf.fecha_salida || '')

  $('#tVisibles').innerHTML = columnas
    .map((c) => `<label class="visibles-item">
        <input type="checkbox" value="${esc(c.nombre)}" ${(conf.visibles || []).includes(c.nombre) ? 'checked' : ''} />
        ${esc(c.etiqueta)} <code>(${esc(c.nombre)})</code>
      </label>`)
    .join('')

  $('#modalTabla').classList.remove('hidden')
}

async function guardarTabla(e) {
  e.preventDefault()
  const visibles = Array.from($$('#tVisibles input:checked')).map((i) => i.value)
  const payload = {
    titulo: $('#tTitulo').value.trim(),
    descripcion: $('#tDescripcion').value.trim(),
    fecha_entrada: $('#tFechaEntrada').value || null,
    fecha_salida: $('#tFechaSalida').value || null,
    visibles
  }
  try {
    await api(`/api/esquema/${state.estTabla}`, { method: 'PUT', body: JSON.stringify(payload) })
    mostrarToast('Configuración guardada.', 'success')
    cerrarModal('modalTabla')
    await cargarTablas()
    renderEstructura()
  } catch (err) {
    mostrarToast(err.message, 'error')
  }
}

function paramsFijarFecha() {
  const p = new URLSearchParams()
  const q = ($('#ffQ').value || '').trim()
  const filtro = ($('#ffFiltro') && $('#ffFiltro').value) || 'todos'
  if (q) p.set('q', q)
  p.set('filtro', filtro)
  return p
}

function prepararFijarFecha() {
  state.ffPagina = 1
  state.ffGenerado = false
  const res = $('#ffResultado')
  if (res) {
    res.classList.add('hidden')
    const cards = $('#ffResumenCards')
    if (cards) cards.innerHTML = ''
    const resumen = $('#ffResumen')
    if (resumen) resumen.textContent = ''
    $('#ffThead').innerHTML = ''
    $('#ffTbody').innerHTML = ''
  }
}

async function cargarFijarFecha() {
  const p = paramsFijarFecha()
  p.set('page', String(state.ffPagina || 1))
  p.set('perPage', '20')
  let data
  try {
    data = await api('/api/fijar-fecha?' + p.toString())
  } catch (err) {
    mostrarToast(err.message, 'error')
    return
  }
  state.ffGenerado = true
  const cols = [{ clave: 'estado', etiqueta: 'ESTADO' }].concat(data.columnas || [])
  $('#ffThead').innerHTML = '<tr>' + cols.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('') + '</tr>'
  const etiquetaFiltro = data.filtro === 'pendientes'
    ? 'solo pendientes de fijar'
    : (data.filtro === 'anteriores' ? 'solo fecha anterior a hoy' : 'pendientes y fecha anterior')
  const cards = $('#ffResumenCards')
  if (cards) {
    cards.innerHTML = `
      <div class="reporte-stat"><span class="num">${data.pendientes || 0}</span><span class="lbl">Pendientes de fijar</span></div>
      <div class="reporte-stat"><span class="num">${data.anteriores || 0}</span><span class="lbl">Fecha anterior a hoy</span></div>
      <div class="reporte-stat"><span class="num">${data.total || 0}</span><span class="lbl">Registros del filtro</span></div>`
  }
  const resumen = $('#ffResumen')
  if (resumen) {
    resumen.textContent = `Juzgado ${data.juzgado || 'PRIMERO'} · corte ${data.hoy || ''} · filtro: ${etiquetaFiltro}. ${data.fuente || ''}`
  }
  if (!data.registros.length) {
    $('#ffTbody').innerHTML = `<tr><td colspan="${Math.max(1, cols.length)}" style="text-align:center;color:#5a6b7c;padding:24px">No se encontraron resultados para los criterios seleccionados</td></tr>`
  } else {
    $('#ffTbody').innerHTML = data.registros.map((r) => {
      const celdas = cols.map((c) => {
        const v = r[c.clave] || ''
        return `<td title="${esc(String(v).replace(/\n/g, ' · '))}">${esc(String(v).replace(/\n/g, ' / ')) || '—'}</td>`
      }).join('')
      return `<tr>${celdas}</tr>`
    }).join('')
  }
  const totalPaginas = Math.max(1, Math.ceil((data.total || 0) / (data.perPage || 20)))
  $('#infoFfPagina').textContent = `Página ${data.page} de ${totalPaginas} · ${data.total} registros`
  $('#btnFfAnterior').disabled = data.page <= 1
  $('#btnFfSiguiente').disabled = data.page >= totalPaginas
  const res = $('#ffResultado')
  if (res) res.classList.remove('hidden')
}

function generarFijarFecha() {
  state.ffPagina = 1
  cargarFijarFecha()
}

function exportarFijarFecha() {
  window.location.href = '/api/fijar-fecha/export?' + paramsFijarFecha().toString()
}

window.addEventListener('error', (e) => {
  console.error('Error capturado:', e.message)
  mostrarToast('Ocurrió un error: ' + (e.message || 'desconocido'), 'error')
})

// ============ EVENTOS ============

document.addEventListener('DOMContentLoaded', () => {
  $('#formLogin').addEventListener('submit', intentarLogin)
  if ($('#btnVerClave')) {
    $('#btnVerClave').addEventListener('click', () => {
      const inp = $('#loginPassword')
      const btn = $('#btnVerClave')
      if (!inp || !btn) return
      const mostrar = inp.type === 'password'
      inp.type = mostrar ? 'text' : 'password'
      btn.setAttribute('aria-pressed', mostrar ? 'true' : 'false')
      btn.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña')
      const ojo = btn.querySelector('.ico-ojo')
      const off = btn.querySelector('.ico-ojo-off')
      if (ojo) ojo.classList.toggle('hidden', mostrar)
      if (off) off.classList.toggle('hidden', !mostrar)
    })
  }
  if (window.location.protocol === 'https:' && $('#loginHttps')) {
    $('#loginHttps').classList.remove('hidden')
  }
  $('#btnSalir').addEventListener('click', salir)
  if ($('#btnMenuMovil')) {
    $('#btnMenuMovil').addEventListener('click', () => {
      const abierto = $('#sidebar') && $('#sidebar').classList.contains('nav-open')
      abrirNavMovil(!abierto)
    })
  }
  if ($('#navBackdrop')) $('#navBackdrop').addEventListener('click', () => abrirNavMovil(false))
  if ($('#btnColapsarNav')) $('#btnColapsarNav').addEventListener('click', alternarNavColapsado)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrirNavMovil(false)
  })
  window.addEventListener('resize', () => {
    if (!esVistaNavMovil()) {
      abrirNavMovil(false)
      let colapsado = false
      try { colapsado = localStorage.getItem(NAV_COLAPSO_KEY) === '1' } catch (e) { /* sin almacenamiento */ }
      aplicarNavColapsado(colapsado)
    } else {
      aplicarNavColapsado(false)
    }
  })
  $('#btnPassword').addEventListener('click', abrirModalPassword)
  $('#formPassword').addEventListener('submit', guardarPasswordPropia)
  $('#passNueva').addEventListener('input', () => {
    pintarRequisitosClave($('#passNueva'), {
      username: state.usuario && state.usuario.username,
      nombre: state.usuario && state.usuario.nombre
    })
  })

  const sidebar = document.querySelector('.sidebar')
  sidebar.addEventListener('click', (e) => {
    const toggle = e.target.closest('.nav-toggle')
    if (toggle) {
      if ($('#vistaApp').classList.contains('nav-collapsed') && !esVistaNavMovil()) {
        aplicarNavColapsado(false)
        try { localStorage.setItem(NAV_COLAPSO_KEY, '0') } catch (ex) { /* sin almacenamiento */ }
      }
      const grupo = toggle.closest('.nav-grupo')
      const sub = document.getElementById(toggle.dataset.submenu)
      abrirGrupoNav(grupo, !!sub && sub.classList.contains('hidden'))
      return
    }
    const subitem = e.target.closest('.nav-subitem')
    if (subitem) {
      cambiarVista(subitem.dataset.vista, subitem.dataset.modulo, subitem.dataset.oficio)
      return
    }
    const btn = e.target.closest('.nav-item')
    if (btn) cambiarVista(btn.dataset.vista, btn.dataset.modulo)
  })

  $('#btnBuscarModulo').addEventListener('click', () => { state.moduloPagina = 1; cargarModulo() })
  $('#btnLimpiarBusqueda').addEventListener('click', () => {
    $('#moduloQ').value = ''
    $('#moduloDesde').value = ''
    $('#moduloHasta').value = ''
    $('#moduloFiltroCampo').value = ''
    $('#moduloFiltroValor').value = ''
    state.moduloPagina = 1
    cargarModulo()
  })
  $('#moduloQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.moduloPagina = 1; cargarModulo() } })
  $('#moduloFiltroValor').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.moduloPagina = 1; cargarModulo() } })
  $('#moduloDesde').addEventListener('change', () => {
    if ($('#moduloDesde').value && !$('#moduloHasta').value) $('#moduloHasta').value = $('#moduloDesde').value
  })
  $('#moduloHasta').addEventListener('change', () => {
    if ($('#moduloHasta').value && !$('#moduloDesde').value) $('#moduloDesde').value = $('#moduloHasta').value
  })
  $('#btnModuloAnterior').addEventListener('click', () => { if (state.moduloPagina > 1) { state.moduloPagina--; cargarModulo() } })
  $('#btnModuloSiguiente').addEventListener('click', () => { state.moduloPagina++; cargarModulo() })
  $('#btnNuevoRegistro').addEventListener('click', () => abrirRegistro(null))
  $('#formRegistro').addEventListener('submit', guardarRegistro)
  $('#btnReporteModulo').addEventListener('click', () => {
    state.repModulo = state.modulo
    cambiarVista('reportes')
  })
  $('#btnModuloMenu').addEventListener('click', (e) => {
    e.stopPropagation()
    toggleDropdown('#btnModuloMenu', '#moduloMenu')
  })

  $('#repModulo').addEventListener('change', () => {
    const tabla = $('#repModulo').value
    if (tabla && state.tablas[tabla]) llenarSelectFechas($('#repFechaCampo'), state.tablas[tabla])
  })
  $('#compModulo').addEventListener('change', () => {
    const tabla = $('#compModulo').value || 'procesos'
    if (state.tablas[tabla]) llenarSelectFechas($('#compFechaCampo'), state.tablas[tabla])
  })
  $('#btnGenerarReporte').addEventListener('click', generarReporte)
  $('#btnExportarReporte').addEventListener('click', () => {
    const tabla = $('#repModulo').value
    const desde = $('#repDesde').value
    const hasta = $('#repHasta').value
    const fechaCampo = $('#repFechaCampo').value
    if (!desde || !hasta) return mostrarToast('Debe indicar el período (desde y hasta).', 'error')
    const qs = new URLSearchParams({ desde, hasta })
    if (fechaCampo) qs.set('fecha_campo', fechaCampo)
    window.location.href = `/api/reportes/${tabla}/export?` + qs.toString()
  })
  $('#btnExportarModulo').addEventListener('click', () => {
    const tabla = $('#repModulo').value
    window.location.href = `/api/reportes/${tabla}/export?todos=true`
  })

  $('#btnGenerarCompleto').addEventListener('click', generarCompleto)
  $('#btnExportarCompleto').addEventListener('click', exportarCompleto)
  $('#btnGenerarEstadistica').addEventListener('click', generarEstadistica)
  $('#btnExportarEstadistica').addEventListener('click', exportarEstadistica)
  $('#btnGenerarFf').addEventListener('click', generarFijarFecha)
  $('#btnLimpiarFf').addEventListener('click', () => {
    $('#ffQ').value = ''
    if ($('#ffFiltro')) $('#ffFiltro').value = 'todos'
    prepararFijarFecha()
  })
  $('#ffQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') generarFijarFecha() })
  $('#ffFiltro').addEventListener('change', () => { if (state.ffGenerado) generarFijarFecha() })
  $('#btnFfAnterior').addEventListener('click', () => { if (state.ffPagina > 1) { state.ffPagina--; cargarFijarFecha() } })
  $('#btnFfSiguiente').addEventListener('click', () => { state.ffPagina++; cargarFijarFecha() })
  $('#btnExportarFf').addEventListener('click', exportarFijarFecha)
  $('#btnBuscarOv').addEventListener('click', () => { state.ovPagina = 1; buscarOrdenVerbal() })
  $('#btnLimpiarOv').addEventListener('click', () => {
    $('#ovQ').value = ''
    state.ovPagina = 1
    state.ovId = null
    $('#ovPreviewWrap').classList.add('hidden')
    buscarOrdenVerbal()
  })
  $('#ovQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.ovPagina = 1; buscarOrdenVerbal() } })
  $('#btnOvAnterior').addEventListener('click', () => { if (state.ovPagina > 1) { state.ovPagina--; buscarOrdenVerbal() } })
  $('#btnOvSiguiente').addEventListener('click', () => { state.ovPagina++; buscarOrdenVerbal() })
  $('#btnGenerarOv').addEventListener('click', generarOrdenVerbal)
  $('#btnImprimirOv').addEventListener('click', imprimirOrdenVerbal)
  $('#btnWordOv').addEventListener('click', descargarWordOficio)
  $('#ovTipoDoc').addEventListener('change', cambiarTipoOficio)
  $('#ovActaResultado').addEventListener('change', cambiarResultadoActa)
  $('#btnCampana').addEventListener('click', mostrarPanelAlertas)
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.alertas-toggle')
    if (!toggle) return
    const grupo = toggle.closest('.alertas-grupo')
    if (grupo) abrirGrupoNav(grupo, !grupo.classList.contains('abierto'))
  })
  $('#btnCalPrev').addEventListener('click', () => { state.calMes = shiftMes(state.calMes, -1); cargarCalendario() })
  $('#btnCalNext').addEventListener('click', () => { state.calMes = shiftMes(state.calMes, 1); cargarCalendario() })
  $('#btnCalHoy').addEventListener('click', () => { state.calMes = hoyISO().slice(0, 7); state.calDia = hoyISO(); cargarCalendario() })
  $('#btnNuevaAgenda').addEventListener('click', () => abrirAgenda(null))
  $('#formAgenda').addEventListener('submit', guardarAgenda)
  $('#calendarioGrid').addEventListener('click', (e) => {
    const cel = e.target.closest('.cal-cel[data-dia]')
    if (!cel) return
    state.calDia = cel.dataset.dia
    $$('.cal-cel').forEach((c) => c.classList.toggle('cal-sel', c.dataset.dia === state.calDia))
    renderListaDia(state.calDia)
  })

  $('#btnNuevoUsuario').addEventListener('click', () => abrirModalUsuario(null))
  $('#formUsuario').addEventListener('submit', guardarUsuario)

  $('#btnDescargarRespaldo').addEventListener('click', descargarRespaldo)
  $('#btnRestaurar').addEventListener('click', restaurarBase)
  $$('#vista-bd .tab-bd').forEach((b) => b.addEventListener('click', () => cambiarTabBd(b.dataset.tab)))
  $('#progFrecuencia').addEventListener('change', actualizarCamposFrecuencia)
  $('#btnGenerarCopia').addEventListener('click', generarCopia)
  $('#btnExportarBdExcel').addEventListener('click', () => exportarBaseDatos('xlsx'))
  $('#btnExportarBdCsv').addEventListener('click', () => exportarBaseDatos('csv'))
  $('#btnGuardarProgramacion').addEventListener('click', guardarProgramacion)
  if ($('#btnEjecutarAhora')) $('#btnEjecutarAhora').addEventListener('click', ejecutarProgramacionAhora)
  if ($('#btnVerificarBoveda')) $('#btnVerificarBoveda').addEventListener('click', verificarBoveda)
  if ($('#btnExportarOffline')) $('#btnExportarOffline').addEventListener('click', exportarOffline)
  $('#btnGuardarCorreo').addEventListener('click', guardarCorreo)
  $('#btnProbarCorreo').addEventListener('click', probarCorreo)
  if ($('#smtpProveedor')) {
    $('#smtpProveedor').addEventListener('change', () => aplicarProveedorSmtp($('#smtpProveedor').value, false))
  }
  $('#btnVerificarTodas').addEventListener('click', verificarTodas)

  $('#btnAudBuscar').addEventListener('click', () => { state.audPagina = 1; cargarAuditoria() })
  $('#audPorPagina').addEventListener('change', () => { state.audPagina = 1; cargarAuditoria() })
  $('#audTexto').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.audPagina = 1; cargarAuditoria() } })
  $('#btnAudLimpiar').addEventListener('click', () => {
    ;['#audTexto', '#audDesde', '#audHasta'].forEach((s) => { $(s).value = '' })
    ;['#audUsuario', '#audAccion', '#audModulo', '#audExito'].forEach((s) => { $(s).value = '' })
    state.audPagina = 1
    cargarAuditoria()
  })
  $('#audPagAnt').addEventListener('click', () => { if (state.audPagina > 1) { state.audPagina--; cargarAuditoria() } })
  $('#audPagSig').addEventListener('click', () => { if (state.audPagina < state.audPaginas) { state.audPagina++; cargarAuditoria() } })
  $('#btnAudCsv').addEventListener('click', () => exportarAuditoria('csv'))
  $('#btnAudExcel').addEventListener('click', () => exportarAuditoria('xlsx'))
  $('#btnAudPdf').addEventListener('click', () => exportarAuditoria('pdf'))
  $('#btnAudVerificar').addEventListener('click', verificarIntegridadAuditoria)

  $('#estTabla').addEventListener('change', () => { state.estTabla = $('#estTabla').value; renderEstructura() })
  $('#btnNuevaColumna').addEventListener('click', () => abrirModalColumna(null))
  $('#btnRenombrarTitulos').addEventListener('click', abrirRenombrarTitulos)
  $('#btnConfigTabla').addEventListener('click', abrirModalTabla)
  $('#btnEliminarTabla').addEventListener('click', eliminarTablaActual)
  $('#colTipo').addEventListener('change', mostrarCampoOpciones)
  $('#formColumna').addEventListener('submit', guardarColumna)
  $('#formTabla').addEventListener('submit', guardarTabla)

  $$('[data-cerrar]').forEach((b) => b.addEventListener('click', () => cerrarModal(b.dataset.cerrar)))

  document.addEventListener('click', (e) => {
    if (e.target.closest('.dropdown-item')) cerrarMenus()
  })

  $$('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.classList.add('hidden')
  }))

  iniciar()
})
