const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const ROOT = path.resolve(__dirname, '..')

function cargarEnv() {
  try { require('dotenv').config({ path: path.join(ROOT, '.env') }) } catch (_e) { /* dotenv opcional */ }
  const envFile = path.join(ROOT, '.env')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v
  }
}
cargarEnv()

function resolverDbPath() {
  const dbPath = String(process.env.DB_PATH || '').trim()
  if (dbPath) return path.resolve(ROOT, dbPath)
  const dataDir = String(process.env.DATA_DIR || '').trim()
  if (dataDir) return path.join(path.resolve(ROOT, dataDir), 'juzgado.db')
  return path.resolve(ROOT, 'data', 'juzgado.db')
}

const DB_PATH = resolverDbPath()
const DATA_DIR = path.dirname(DB_PATH)
const ESQUEMA_PATH = path.join(DATA_DIR, 'esquema.json')
const CONFIRMACION_PATH = path.join(DATA_DIR, 'confirmacion-guardado.txt')

let db
let esquema
let rutaAnunciada = false

function fsyncIgnorable(err) {
  return err && (err.code === 'EPERM' || err.code === 'EBADF' || err.code === 'EINVAL' || err.code === 'EACCES')
}

function fsyncRuta(ruta) {
  if (!ruta || !fs.existsSync(ruta)) return
  let fd
  try {
    fd = fs.openSync(ruta, 'r+')
  } catch (e) {
    if (fsyncIgnorable(e)) return
    throw e
  }
  try {
    fs.fsyncSync(fd)
  } catch (e) {
    if (fsyncIgnorable(e)) return
    throw e
  } finally {
    try { fs.closeSync(fd) } catch (_e) { /* ignore */ }
  }
}

function anunciarRutas() {
  if (rutaAnunciada) return
  rutaAnunciada = true
  console.log('[persistencia] lectura y escritura usan la misma ruta absoluta')
  console.log('[persistencia] DATA_DIR=' + DATA_DIR)
  console.log('[persistencia] DB_PATH=' + DB_PATH)
  console.log('[persistencia] archivo=' + path.basename(DB_PATH))
}

function asegurarDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(ESQUEMA_PATH)) {
    const origen = path.join(ROOT, 'data', 'esquema.json')
    if (origen !== ESQUEMA_PATH && fs.existsSync(origen)) fs.copyFileSync(origen, ESQUEMA_PATH)
  }
}

function registrarConfirmacion(detalle) {
  const linea = [
    new Date().toISOString(),
    'ruta=' + DB_PATH,
    'archivo=' + path.basename(DB_PATH),
    detalle
  ].join(' ') + '\n'
  fs.appendFileSync(CONFIRMACION_PATH, linea)
  fsyncRuta(CONFIRMACION_PATH)
}

function persistir(cnn) {
  const c = cnn || db
  if (!c) return { ok: false, persistido: false, error: 'Sin conexion a la base de datos.', ruta: DB_PATH }
  try { c.pragma('synchronous = FULL') } catch (_e) { /* ignore */ }
  let ultimo = null
  try {
    const res = c.pragma('wal_checkpoint(TRUNCATE)')
    ultimo = Array.isArray(res) ? res[0] : res
  } catch (e) {
    try {
      const res = c.pragma('wal_checkpoint(FULL)')
      ultimo = Array.isArray(res) ? res[0] : res
    } catch (e2) {
      return { ok: false, persistido: false, error: e2.message, ruta: DB_PATH }
    }
  }
  try {
    fsyncRuta(DB_PATH)
    fsyncRuta(DB_PATH + '-wal')
    let dirFd
    try {
      dirFd = fs.openSync(DATA_DIR, 'r')
      try { fs.fsyncSync(dirFd) } finally { fs.closeSync(dirFd) }
    } catch (e) {
      if (!fsyncIgnorable(e)) throw e
    }
  } catch (e) {
    if (!fsyncIgnorable(e)) {
      return { ok: false, persistido: false, error: 'fsync: ' + e.message, ruta: DB_PATH, checkpoint: ultimo }
    }
  }
  if (ultimo && Number(ultimo.busy) !== 0) {
    return { ok: false, persistido: false, error: 'checkpoint ocupado', ruta: DB_PATH, checkpoint: ultimo }
  }
  return { ok: true, persistido: true, ruta: DB_PATH, archivo: path.basename(DB_PATH), checkpoint: ultimo || {} }
}

function crearConexion(ruta, opts) {
  return new Database(ruta, opts || {})
}

function abrirSoloLectura(ruta) {
  return crearConexion(ruta, { readonly: true, fileMustExist: true })
}

function getDb() {
  if (db) return db
  return openDb()
}

function closeDb() {
  if (!db) return
  try { persistir(db) } catch (e) { console.error('[persistencia] error al persistir en closeDb:', e.message) }
  try { db.close() } catch (e) { console.error('[persistencia] error al cerrar:', e.message) }
  db = null
}

function loadEsquema() {
  asegurarDataDir()
  esquema = JSON.parse(fs.readFileSync(ESQUEMA_PATH, 'utf8'))
  return esquema
}

function saveEsquema() {
  asegurarDataDir()
  const tmp = ESQUEMA_PATH + '.tmp'
  const payload = JSON.stringify(esquema)
  fs.writeFileSync(tmp, payload, 'utf8')
  const fd = fs.openSync(tmp, 'r+')
  try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(tmp, ESQUEMA_PATH)
}

function getEsquema() {
  if (!esquema) loadEsquema()
  return esquema
}

function openDb() {
  if (db) return db
  asegurarDataDir()
  anunciarRutas()
  if (fs.existsSync(DB_PATH)) {
    console.log('[persistencia] carga inicial desde disco (sin semilla): ' + DB_PATH)
  } else {
    console.log('[persistencia] no hay archivo; se crea vacio en ' + DB_PATH + ' (no se copia semilla)')
  }
  db = crearConexion(DB_PATH)
  db.pragma('busy_timeout = 8000')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = FULL')
  db.pragma('temp_store = MEMORY')
  db.pragma('cache_size = -16000')
  db.pragma('wal_autocheckpoint = 100')
  try { persistir(db) } catch (e) { /* consolidar WAL previo */ }
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT,
      titulo TEXT,
      proceso TEXT,
      tipo_audiencia TEXT,
      responsable TEXT,
      modulo TEXT,
      registro_id INTEGER,
      estado TEXT DEFAULT 'programada',
      notas TEXT,
      alerta INTEGER DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS meta_config (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );
    CREATE TABLE IF NOT EXISTS password_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      password_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      usuario_id INTEGER,
      usuario TEXT,
      rol TEXT,
      accion TEXT NOT NULL,
      modulo TEXT,
      registro_id TEXT,
      descripcion TEXT,
      antes TEXT,
      despues TEXT,
      ip TEXT,
      dispositivo TEXT,
      user_agent TEXT,
      metodo TEXT,
      ruta TEXT,
      exito INTEGER NOT NULL DEFAULT 1,
      error TEXT,
      checksum TEXT,
      checksum_previo TEXT
    );
    CREATE TABLE IF NOT EXISTS auditoria_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      usuario TEXT,
      ip TEXT,
      accion TEXT,
      detalle TEXT
    );
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      nombre TEXT NOT NULL UNIQUE,
      ruta TEXT NOT NULL,
      ruta_redundante TEXT,
      tamano INTEGER NOT NULL DEFAULT 0,
      checksum TEXT NOT NULL,
      checksum_verificado INTEGER NOT NULL DEFAULT 0,
      cifrado INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      tipo TEXT NOT NULL DEFAULT 'manual',
      estado TEXT NOT NULL DEFAULT 'completo',
      tablas INTEGER NOT NULL DEFAULT 0,
      indices INTEGER NOT NULL DEFAULT 0,
      triggers INTEGER NOT NULL DEFAULT 0,
      vistas INTEGER NOT NULL DEFAULT 0,
      integridad TEXT,
      restauracion_probada INTEGER NOT NULL DEFAULT 0,
      restauracion_detalle TEXT,
      usuario TEXT,
      notas TEXT
    );
    CREATE TABLE IF NOT EXISTS backup_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activo INTEGER NOT NULL DEFAULT 0,
      frecuencia TEXT NOT NULL DEFAULT 'diaria',
      intervalo_custom_horas INTEGER NOT NULL DEFAULT 24,
      hora TEXT NOT NULL DEFAULT '22:00',
      dia_semana INTEGER NOT NULL DEFAULT 1,
      dia_mes INTEGER NOT NULL DEFAULT 1,
      max_copias INTEGER NOT NULL DEFAULT 30,
      cifrado INTEGER NOT NULL DEFAULT 1,
      redundancia INTEGER NOT NULL DEFAULT 1,
      ruta_redundante TEXT,
      correo_activo INTEGER NOT NULL DEFAULT 0,
      correos TEXT NOT NULL DEFAULT '[]',
      asunto TEXT NOT NULL DEFAULT 'Copia de seguridad - Gestor de Información Juzgado Tumaco',
      adjunto_max_mb INTEGER NOT NULL DEFAULT 20,
      reintentos INTEGER NOT NULL DEFAULT 3,
      ultimo_ejecutado TEXT,
      proximo_ejecutado TEXT,
      actualizado_en TEXT
    );
    CREATE TABLE IF NOT EXISTS correo_envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id INTEGER,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      destinatarios TEXT,
      asunto TEXT,
      tamano INTEGER,
      checksum TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      intentos INTEGER NOT NULL DEFAULT 0,
      ultimo_error TEXT,
      resumen TEXT,
      usuario TEXT
    );
    CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activo INTEGER NOT NULL DEFAULT 0,
      host TEXT NOT NULL DEFAULT '',
      puerto INTEGER NOT NULL DEFAULT 587,
      seguro INTEGER NOT NULL DEFAULT 0,
      requiere_tls INTEGER NOT NULL DEFAULT 1,
      usuario TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      remitente TEXT NOT NULL DEFAULT '',
      remitente_nombre TEXT NOT NULL DEFAULT 'Gestor de Información Juzgado Tumaco',
      actualizado_en TEXT
    );
    CREATE TABLE IF NOT EXISTS alertas_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      tipo TEXT NOT NULL,
      severidad TEXT NOT NULL DEFAULT 'media',
      descripcion TEXT,
      usuario TEXT,
      ip TEXT,
      detalle TEXT,
      atendida INTEGER NOT NULL DEFAULT 0
    );
  `)
  try { asegurarTablasEsquema(db) } catch (e) { console.error('[arranque] asegurarTablasEsquema:', e && e.message) }
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_update
    BEFORE UPDATE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría es inmutable: no se puede modificar.');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_delete
    BEFORE DELETE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría es inmutable: no se puede eliminar.');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_auditoria_meta_no_update
    BEFORE UPDATE ON auditoria_meta
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría de auditoría es inmutable.');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_auditoria_meta_no_delete
    BEFORE DELETE ON auditoria_meta
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría de auditoría es inmutable.');
    END;
  `)
  function asegurarColumnas(tabla, extras) {
    const existentes = db.prepare(`PRAGMA table_info(${tabla})`).all().map((c) => c.name)
    if (!existentes.length) return
    for (const [name, tipo] of extras) {
      if (!existentes.includes(name)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${name} ${tipo}`)
    }
  }
  asegurarColumnas('procesos', [
    ['sexo', 'TEXT'],
    ['allanamiento', 'TEXT'],
    ['lectura_de_sentencia', 'TEXT'],
    ['tipo_salida', 'TEXT'],
    ['tipo_decision', 'TEXT'],
    ['tipo_boleta', 'TEXT'],
    ['radicado', 'TEXT'],
    ['no', 'TEXT'],
    ['cedula_defensor', 'TEXT'],
    ['tarjeta_defensor', 'TEXT'],
    ['celular_fiscal', 'TEXT'],
    ['correo_fiscal', 'TEXT'],
    ['procesados_detalle', 'TEXT'],
    ['celular_defensor', 'TEXT'],
    ['correo_defensor', 'TEXT'],
    ['celular_victima', 'TEXT'],
    ['correo_victima', 'TEXT'],
    ['rep_victima', 'TEXT'],
    ['celular_rep_victima', 'TEXT'],
    ['correo_rep_victima', 'TEXT'],
    ['direccion_rep_victima', 'TEXT'],
    ['celular_min_publico', 'TEXT'],
    ['correo_min_publico', 'TEXT'],
    ['etapa_historial', 'TEXT'],
    ['resuelve_detalle', 'TEXT'],
    ['ejecutoria_detalle', 'TEXT']
  ])
  asegurarColumnas('usuarios', [['cargo', 'TEXT']])
  asegurarColumnas('tutelas', [['derecho_estadistica', 'TEXT']])
  asegurarColumnas('apelaciones', [['no', 'TEXT'], ['spoa', 'TEXT']])
  asegurarIndices(db)
  try { seedConfigAuditoria(db) } catch (e) { console.error('[arranque] seedConfigAuditoria:', e && e.message) }
  seedCalendarioDesdeProcesos()
  return db
}

function asegurarIndices(cnn) {
  const tablas = cnn.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name)
  const colsDe = (t) => cnn.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
  function indice(tabla, nombre, col) {
    if (!tablas.includes(tabla)) return
    const cols = colsDe(tabla)
    const partes = col.split(',').map((c) => c.trim())
    if (partes.some((c) => !cols.includes(c))) return
    cnn.exec(`CREATE INDEX IF NOT EXISTS ${nombre} ON ${tabla}(${col})`)
  }
  indice('procesos', 'idx_procesos_fecha_ingreso', 'fecha_ingreso')
  indice('procesos', 'idx_procesos_codigo', 'codigo_interno')
  indice('tutelas', 'idx_tutelas_fecha_ingreso', 'fecha_ingreso')
  indice('apelaciones', 'idx_apelaciones_fecha_ingreso', 'fecha_ingreso')
  indice('ley600', 'idx_ley600_fecha_ingreso', 'fecha_de_ingreso')
  indice('disciplinarios', 'idx_disciplinarios_fecha_ingreso', 'fecha_ingreso')
  indice('calendario', 'idx_calendario_fecha', 'fecha')
  indice('calendario', 'idx_calendario_modulo_reg', 'modulo, registro_id')
  indice('usuarios', 'idx_usuarios_username', 'username')
  indice('password_historial', 'idx_password_historial_usuario', 'usuario_id')
  indice('auditoria', 'idx_auditoria_fecha', 'fecha')
  indice('auditoria', 'idx_auditoria_usuario', 'usuario_id')
  indice('auditoria', 'idx_auditoria_accion', 'accion')
  indice('auditoria', 'idx_auditoria_modulo', 'modulo')
  indice('backups', 'idx_backups_fecha', 'fecha')
  indice('correo_envios', 'idx_correo_envios_fecha', 'fecha')
  indice('alertas_auditoria', 'idx_alertas_fecha', 'fecha')
}

function existeTabla(cnn, nombre) {
  const r = cnn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(nombre)
  return !!(r && r.name)
}

function sqlIdentificador(nombre) {
  return String(nombre || '').replace(/[^a-zA-Z0-9_]/g, '')
}

function asegurarTablasEsquema(cnn) {
  cnn.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('administrador', 'usuario', 'consulta')),
      cargo TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `)
  let esquemaLocal
  try {
    esquemaLocal = getEsquema()
  } catch (e) {
    console.error('[arranque] no se pudo cargar esquema.json:', e && e.message)
    return
  }
  for (const [tabla, conf] of Object.entries(esquemaLocal || {})) {
    const t = sqlIdentificador(tabla)
    if (!t) continue
    const cols = (conf && Array.isArray(conf.columnas)) ? conf.columnas : []
    const defs = ['id INTEGER PRIMARY KEY AUTOINCREMENT']
    const seen = new Set(['id'])
    for (const c of cols) {
      const n = sqlIdentificador(c && c.nombre)
      if (!n || seen.has(n)) continue
      seen.add(n)
      defs.push(n + ' TEXT')
    }
    if (!seen.has('creado_en')) {
      defs.push("creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))")
    }
    cnn.exec('CREATE TABLE IF NOT EXISTS ' + t + ' (' + defs.join(', ') + ')')
  }
}

function seedConfigAuditoria(cnn) {
  cnn.prepare(`INSERT OR IGNORE INTO backup_config (id) VALUES (1)`).run()
  cnn.prepare(`INSERT OR IGNORE INTO email_config (id) VALUES (1)`).run()
}

function seedCalendarioDesdeProcesos() {
  try {
    if (!db) return
    if (!existeTabla(db, 'procesos') || !existeTabla(db, 'calendario')) return
    const n = db.prepare('SELECT COUNT(*) AS c FROM calendario').get().c
    if (n > 0) return
    const { parseFecha } = require('./dates')
    const rows = db.prepare(`
      SELECT id, fecha_audiencia, hora, audiencia, codigo_interno, radicado, no, procesado_s, encargado, juzgado
      FROM procesos
      WHERE fecha_audiencia IS NOT NULL AND TRIM(fecha_audiencia) != ''
    `).all()
    const ins = db.prepare(`
      INSERT INTO calendario (fecha, hora, titulo, proceso, tipo_audiencia, responsable, modulo, registro_id, estado, alerta)
      VALUES (@fecha, @hora, @titulo, @proceso, @tipo_audiencia, @responsable, 'procesos', @registro_id, 'programada', 1)
    `)
    const tx = db.transaction((items) => {
      for (const r of items) {
        const fecha = parseFecha(r.fecha_audiencia)
        if (!fecha) continue
        const proc = r.codigo_interno || r.radicado || r.no || ''
        ins.run({
          fecha,
          hora: r.hora || '',
          titulo: r.audiencia || 'Audiencia',
          proceso: proc,
          tipo_audiencia: r.audiencia || '',
          responsable: r.encargado || '',
          registro_id: r.id
        })
      }
    })
    tx(rows)
  } catch (e) {
    console.error('[arranque] seedCalendarioDesdeProcesos:', e && e.message)
  }
}

function columnasDe(tabla) {
  const conf = getEsquema()[tabla]
  if (!conf) return []
  return conf.columnas.map((c) => c.nombre)
}

function tablasValidas() {
  return Object.keys(getEsquema())
}

function rowToObj(row) {
  if (!row) return null
  const o = {}
  for (const k of Object.keys(row)) o[k] = row[k] == null ? '' : String(row[k])
  if (o.id) o.id = Number(row.id)
  return o
}

module.exports = {
  DATA_DIR,
  DB_PATH,
  ESQUEMA_PATH,
  CONFIRMACION_PATH,
  BACKUPS_DIR: path.join(DATA_DIR, 'backups'),
  BACKUPS_REDUNDANTE: path.join(DATA_DIR, 'backups-redundante'),
  openDb,
  getDb,
  closeDb,
  abrirSoloLectura,
  persistir,
  registrarConfirmacion,
  getEsquema,
  loadEsquema,
  saveEsquema,
  columnasDe,
  tablasValidas,
  rowToObj
}
