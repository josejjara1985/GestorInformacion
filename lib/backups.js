'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Database = require('better-sqlite3')

const { DATA_DIR, DB_PATH } = require('./db')

const BACKUPS_DIR = path.join(DATA_DIR, 'backups')
const REDUNDANTE_DIR = path.join(DATA_DIR, 'backups-redundante')
const TEMP_DIR = path.join(DATA_DIR, 'backups-tmp')

const MAGIC = Buffer.from('JZBK1')

function asegurarDirectorios() {
  for (const dir of [BACKUPS_DIR, REDUNDANTE_DIR, TEMP_DIR]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function ahoraLocal() {
  return require('./tiempo').ahoraLocal()
}

function marcaTiempo() {
  return ahoraLocal().replace(/[-: ]/g, '').slice(0, 14)
}

function claveCifrado() {
  const secreto = process.env.BACKUP_KEY || process.env.SESSION_SECRET || 'juzgado-tumaco-gestor-2026'
  return crypto.scryptSync(secreto, 'juzgado-backup-v1', 32)
}

function sha256Archivo(ruta) {
  const hash = crypto.createHash('sha256')
  const fd = fs.openSync(ruta, 'r')
  const buf = Buffer.alloc(1024 * 1024)
  try {
    let leidos
    while ((leidos = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, leidos))
    }
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}

function cifrarArchivo(origen, destino) {
  const clave = claveCifrado()
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', clave, iv)
  const entrada = fs.readFileSync(origen)
  const cifrado = Buffer.concat([cipher.update(entrada), cipher.final()])
  const tag = cipher.getAuthTag()
  fs.writeFileSync(destino, Buffer.concat([MAGIC, salt, iv, tag, cifrado]))
  return destino
}

function descifrarArchivo(origen, destino) {
  const datos = fs.readFileSync(origen)
  if (!datos.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('El archivo no tiene el formato de copia cifrada esperado.')
  }
  let off = MAGIC.length
  const salt = datos.subarray(off, off + 16); off += 16
  const iv = datos.subarray(off, off + 12); off += 12
  const tag = datos.subarray(off, off + 16); off += 16
  const cifrado = datos.subarray(off)
  const clave = crypto.scryptSync(
    process.env.BACKUP_KEY || process.env.SESSION_SECRET || 'juzgado-tumaco-gestor-2026',
    'juzgado-backup-v1', 32, { salt }
  )
  const decipher = crypto.createDecipheriv('aes-256-gcm', clave, iv)
  decipher.setAuthTag(tag)
  const plano = Buffer.concat([decipher.update(cifrado), decipher.final()])
  fs.writeFileSync(destino, plano)
  return destino
}

function conteos(db) {
  const q = (tipo) => db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type = ?").get(tipo).c
  return {
    tablas: q('table'),
    indices: q('index'),
    triggers: q('trigger'),
    vistas: q('view')
  }
}

function siguienteVersion(db) {
  const r = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM backups').get()
  return Number(r.v) + 1
}

async function respaldarBase(db, destino) {
  if (typeof db.backup === 'function') {
    await db.backup(destino)
    return
  }
  fs.copyFileSync(DB_PATH, destino)
}

function verificarIntegridad(rutaPlano) {
  let cnn
  try {
    cnn = new Database(rutaPlano, { readonly: true, fileMustExist: true })
    const integridad = cnn.prepare('PRAGMA integrity_check').get()
    const valor = integridad ? Object.values(integridad)[0] : 'desconocido'
    const tablas = cnn.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table'").get().c
    return { ok: valor === 'ok', integridad: String(valor), tablas }
  } catch (e) {
    return { ok: false, integridad: e.message, tablas: 0 }
  } finally {
    if (cnn) cnn.close()
  }
}

async function generar(opciones) {
  const o = opciones || {}
  const db = o.db
  const config = o.config || {}
  asegurarDirectorios()
  const version = siguienteVersion(db)
  const baseNombre = `juzgado-${marcaTiempo()}-v${version}`
  const plano = path.join(TEMP_DIR, baseNombre + '.db')
  const conteosBase = conteos(db)

  try {
    await respaldarBase(db, plano)
    const integridad = verificarIntegridad(plano)
    const checksum = sha256Archivo(plano)

    let archivoFinal = plano
    let cifrado = 0
    if (config.cifrado) {
      archivoFinal = path.join(BACKUPS_DIR, baseNombre + '.db.enc')
      cifrarArchivo(plano, archivoFinal)
      cifrado = 1
      fs.unlinkSync(plano)
    } else {
      archivoFinal = path.join(BACKUPS_DIR, baseNombre + '.db')
      fs.renameSync(plano, archivoFinal)
    }

    let rutaRedundante = null
    if (config.redundancia) {
      const destinoRedundante = path.join(REDUNDANTE_DIR, path.basename(archivoFinal))
      try {
        fs.copyFileSync(archivoFinal, destinoRedundante)
        rutaRedundante = destinoRedundante
      } catch (_e) { rutaRedundante = null }
    }

    const tamano = fs.statSync(archivoFinal).size
    const info = db.prepare(`
      INSERT INTO backups (fecha, nombre, ruta, ruta_redundante, tamano, checksum, checksum_verificado,
        cifrado, version, tipo, estado, tablas, indices, triggers, vistas, integridad, usuario, notas)
      VALUES (@fecha, @nombre, @ruta, @ruta_redundante, @tamano, @checksum, @checksum_verificado,
        @cifrado, @version, @tipo, @estado, @tablas, @indices, @triggers, @vistas, @integridad, @usuario, @notas)
    `).run({
      fecha: ahoraLocal(),
      nombre: baseNombre + (cifrado ? '.db.enc' : '.db'),
      ruta: archivoFinal,
      ruta_redundante: rutaRedundante,
      tamano,
      checksum,
      checksum_verificado: 0,
      cifrado,
      version,
      tipo: o.tipo || 'manual',
      estado: integridad.ok ? 'completo' : 'incompleto',
      tablas: conteosBase.tablas,
      indices: conteosBase.indices,
      triggers: conteosBase.triggers,
      vistas: conteosBase.vistas,
      integridad: integridad.integridad,
      usuario: o.usuario || '',
      notas: o.notas || ''
    })
    const id = Number(info.lastInsertRowid)

    const prueba = probarRestauracion(id)
    let registro = db.prepare('SELECT * FROM backups WHERE id = ?').get(id)
    let vault = null
    try {
      const v = require('./vault')
      vault = v.sellar(registro)
      if (o.puntoLimpio || o.tipo === 'automatico') {
        vault = { ...vault, puntoLimpio: v.marcarPuntoLimpio(registro) }
      }
    } catch (_e) { vault = { ok: false, detalle: _e.message } }
    if (config.max_copias) depurar(db, Number(config.max_copias))
    registro = db.prepare('SELECT * FROM backups WHERE id = ?').get(id)
    return { ...registro, prueba, vault }
  } catch (e) {
    try { if (fs.existsSync(plano)) fs.unlinkSync(plano) } catch (_e) { /* ignore */ }
    throw e
  }
}

function probarRestauracion(id) {
  const db = require('./db').openDb()
  const reg = db.prepare('SELECT * FROM backups WHERE id = ?').get(id)
  if (!reg) return { ok: false, detalle: 'Copia no encontrada.' }
  const temporal = path.join(TEMP_DIR, `verificacion-${id}-${Date.now()}.db`)
  try {
    if (reg.cifrado) descifrarArchivo(reg.ruta, temporal)
    else fs.copyFileSync(reg.ruta, temporal)
    const v = verificarIntegridad(temporal)
    const checksum = sha256Archivo(temporal)
    const checksumOk = checksum === reg.checksum
    const ok = v.ok && checksumOk
    const detalle = ok
      ? `Restauración verificada: ${v.tablas} tablas, integridad ${v.integridad}, checksum ${checksum.slice(0, 16)}…`
      : `Verificación fallida: integridad=${v.integridad}, checksum=${checksumOk ? 'ok' : 'no coincide'}`
    db.prepare('UPDATE backups SET restauracion_probada = ?, checksum_verificado = ?, restauracion_detalle = ? WHERE id = ?')
      .run(ok ? 1 : 0, checksumOk ? 1 : 0, detalle, id)
    return { ok, detalle }
  } catch (e) {
    db.prepare('UPDATE backups SET restauracion_probada = 0, restauracion_detalle = ? WHERE id = ?')
      .run('Error al verificar: ' + e.message, id)
    return { ok: false, detalle: 'Error al verificar: ' + e.message }
  } finally {
    try { if (fs.existsSync(temporal)) fs.unlinkSync(temporal) } catch (_e) { /* ignore */ }
  }
}

function borrarArchivoOperativo(ruta) {
  if (!ruta) return
  try {
    if (require('./vault').rechazarBorrado(ruta)) return
  } catch (_e) { /* ignore */ }
  try { if (fs.existsSync(ruta)) fs.unlinkSync(ruta) } catch (_e) { /* ignore */ }
}

function depurar(db, maxCopias) {
  const max = Math.max(1, maxCopias)
  const sobran = db.prepare('SELECT id, ruta, ruta_redundante FROM backups ORDER BY id DESC LIMIT -1 OFFSET ?').all(max)
  for (const r of sobran) {
    borrarArchivoOperativo(r.ruta)
    borrarArchivoOperativo(r.ruta_redundante)
    db.prepare('DELETE FROM backups WHERE id = ?').run(r.id)
  }
  return sobran.length
}

function listar() {
  const db = require('./db').openDb()
  return db.prepare('SELECT * FROM backups ORDER BY id DESC').all()
}

function obtener(id) {
  const db = require('./db').openDb()
  return db.prepare('SELECT * FROM backups WHERE id = ?').get(Number(id))
}

function rutaArchivo(id) {
  const reg = obtener(id)
  if (!reg) throw new Error('Copia de seguridad no encontrada.')
  if (!fs.existsSync(reg.ruta)) throw new Error('El archivo de la copia ya no está disponible.')
  return reg
}

function eliminar(id) {
  const db = require('./db').openDb()
  const reg = obtener(id)
  if (!reg) throw new Error('Copia de seguridad no encontrada.')
  borrarArchivoOperativo(reg.ruta)
  borrarArchivoOperativo(reg.ruta_redundante)
  db.prepare('DELETE FROM backups WHERE id = ?').run(id)
}

function prepararAdjunto(reg, maxMb) {
  const limite = (Number(maxMb) || 20) * 1024 * 1024
  if (reg.tamano > limite) return null
  return {
    nombre: reg.nombre,
    tipo: reg.cifrado ? 'application/octet-stream' : 'application/x-sqlite3',
    ruta: reg.ruta
  }
}

module.exports = {
  BACKUPS_DIR,
  REDUNDANTE_DIR,
  TEMP_DIR,
  asegurarDirectorios,
  generar,
  probarRestauracion,
  depurar,
  listar,
  obtener,
  rutaArchivo,
  eliminar,
  sha256Archivo,
  cifrarArchivo,
  descifrarArchivo,
  prepararAdjunto,
  verificarIntegridad,
  ahoraLocal
}
