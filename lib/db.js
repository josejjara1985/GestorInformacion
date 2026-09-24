const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'juzgado.db')
const ESQUEMA_PATH = path.join(DATA_DIR, 'esquema.json')

let db
let esquema

function loadEsquema() {
  esquema = JSON.parse(fs.readFileSync(ESQUEMA_PATH, 'utf8'))
  return esquema
}

function saveEsquema() {
  fs.writeFileSync(ESQUEMA_PATH, JSON.stringify(esquema), 'utf8')
}

function getEsquema() {
  if (!esquema) loadEsquema()
  return esquema
}

function openDb() {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('temp_store = MEMORY')
  db.pragma('cache_size = -16000')
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
    ['correo_min_publico', 'TEXT']
  ])
  asegurarColumnas('tutelas', [['derecho_estadistica', 'TEXT']])
  asegurarColumnas('apelaciones', [['no', 'TEXT'], ['spoa', 'TEXT']])
  asegurarIndices(db)
  seedConfigAuditoria(db)
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

function seedConfigAuditoria(cnn) {
  cnn.prepare(`INSERT OR IGNORE INTO backup_config (id) VALUES (1)`).run()
  cnn.prepare(`INSERT OR IGNORE INTO email_config (id) VALUES (1)`).run()
}

function seedCalendarioDesdeProcesos() {
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
  BACKUPS_DIR: path.join(DATA_DIR, 'backups'),
  BACKUPS_REDUNDANTE: path.join(DATA_DIR, 'backups-redundante'),
  openDb,
  getEsquema,
  loadEsquema,
  saveEsquema,
  columnasDe,
  tablasValidas,
  rowToObj
}
