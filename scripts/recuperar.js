'use strict'

const fs = require('fs')
const path = require('path')
const vault = require('../lib/vault')
const backups = require('../lib/backups')
const { DB_PATH, DATA_DIR } = require('../lib/db')

function arg(nombre, defecto) {
  const i = process.argv.indexOf(nombre)
  if (i < 0) return defecto
  return process.argv[i + 1] || true
}

function uso() {
  console.log(`Uso:
  node scripts/recuperar.js --punto-limpio
  node scripts/recuperar.js --archivo data/vault/copias/NOMBRE.db.enc
  node scripts/recuperar.js --listar

Antes de restaurar:
  1. Detenga el servidor (no deje el Gestor en ejecución).
  2. Verifique la bóveda: node scripts/verificar-boveda.js
  3. Restaure el punto limpio o un archivo sellado.
  4. Reinicie el servidor.
  5. Cambie claves de administrador, SMTP y BACKUP_KEY.`)
}

function listar() {
  vault.asegurar()
  const copias = vault.listar()
  if (!copias.length) {
    console.log('La bóveda no tiene copias.')
    return
  }
  for (const c of copias) {
    console.log([c.ts || c.fecha, c.nombre, (c.checksum || '').slice(0, 16) + '…'].join('  '))
  }
  const p = vault.puntoLimpio()
  if (p) console.log('Punto limpio actual:', p.nombre)
}

function elegirOrigen() {
  if (arg('--listar')) return { listar: true }
  if (arg('--punto-limpio')) {
    const p = vault.puntoLimpio()
    if (!p) throw new Error('No hay punto limpio definido.')
    const ruta = p.ruta_boveda || path.join(vault.VAULT_COPIAS, p.nombre)
    return { ruta, checksum: p.checksum, nombre: p.nombre }
  }
  const archivo = arg('--archivo')
  if (archivo && archivo !== true) {
    const ruta = path.resolve(String(archivo))
    if (!fs.existsSync(ruta)) throw new Error('No existe el archivo: ' + ruta)
    return { ruta, nombre: path.basename(ruta) }
  }
  return null
}

function restaurar(origen) {
  const cadena = vault.verificarCadena()
  if (!cadena.ok) {
    console.error('ADVERTENCIA: la cadena de la bóveda no está íntegra.')
    for (const x of cadena.rotas) console.error(' -', x.tipo, x.nombre || '', x.detalle)
    if (!arg('--forzar')) {
      console.error('Abortado. Use --forzar solo si acepta el riesgo.')
      process.exit(3)
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const cuarentena = path.join(DATA_DIR, 'cuarentena-' + stamp)
  fs.mkdirSync(cuarentena, { recursive: true })
  for (const n of ['juzgado.db', 'juzgado.db-wal', 'juzgado.db-shm']) {
    const src = path.join(DATA_DIR, n)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(cuarentena, n))
  }
  console.log('Base actual movida a cuarentena:', cuarentena)

  const temporal = path.join(DATA_DIR, 'backups-tmp', 'restore-' + Date.now() + '.db')
  fs.mkdirSync(path.dirname(temporal), { recursive: true })
  const cifrado = /\.enc$/i.test(origen.ruta)
  if (cifrado) backups.descifrarArchivo(origen.ruta, temporal)
  else fs.copyFileSync(origen.ruta, temporal)

  const v = backups.verificarIntegridad(temporal)
  if (!v.ok) {
    console.error('La copia no pasa integrity_check:', v.integridad)
    process.exit(4)
  }
  const checksum = backups.sha256Archivo(temporal)
  if (origen.checksum && checksum !== origen.checksum) {
    console.error('El checksum no coincide con el punto limpio.')
    console.error('esperado', origen.checksum)
    console.error('obtenido', checksum)
    if (!arg('--forzar')) process.exit(5)
  }
  fs.copyFileSync(temporal, DB_PATH)
  try { fs.unlinkSync(temporal) } catch (_e) { /* ignore */ }
  for (const n of ['juzgado.db-wal', 'juzgado.db-shm']) {
    const extra = path.join(DATA_DIR, n)
    try { if (fs.existsSync(extra)) fs.unlinkSync(extra) } catch (_e) { /* ignore */ }
  }
  console.log('Restauración aplicada:', DB_PATH)
  console.log('Tablas:', v.tablas, '| integridad:', v.integridad)
  console.log('Checksum plano:', checksum)
  console.log('Reinicie el servidor y cambie las claves.')
}

try {
  const origen = elegirOrigen()
  if (!origen) {
    uso()
    process.exit(1)
  }
  if (origen.listar) {
    listar()
    process.exit(0)
  }
  restaurar(origen)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
