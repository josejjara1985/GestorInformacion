'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { DATA_DIR } = require('./db')

const VAULT_DIR = path.join(DATA_DIR, 'vault')
const VAULT_COPIAS = path.join(VAULT_DIR, 'copias')
const VAULT_LIMPIO = path.join(VAULT_DIR, 'punto-limpio')
const VAULT_OFFLINE = path.join(VAULT_DIR, 'offline')
const MANIFIESTO = path.join(VAULT_DIR, 'MANIFIESTO.jsonl')
const CADENA = path.join(VAULT_DIR, 'CADENA.sha256')

function asegurar() {
  for (const dir of [VAULT_DIR, VAULT_COPIAS, VAULT_LIMPIO, VAULT_OFFLINE]) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 })
  }
  if (!fs.existsSync(MANIFIESTO)) fs.writeFileSync(MANIFIESTO, '', { mode: 0o644 })
  if (!fs.existsSync(CADENA)) fs.writeFileSync(CADENA, 'GENESIS\n', { mode: 0o644 })
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function sha256Archivo(ruta) {
  const hash = crypto.createHash('sha256')
  const fd = fs.openSync(ruta, 'r')
  const buf = Buffer.alloc(1024 * 1024)
  try {
    let n
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n))
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}

function ultimoEslabon() {
  asegurar()
  const lineas = fs.readFileSync(CADENA, 'utf8').trim().split('\n').filter(Boolean)
  return lineas[lineas.length - 1] || 'GENESIS'
}

function escribirInmutable(destino, datos) {
  if (fs.existsSync(destino)) {
    throw new Error('La bóveda es inmutable: el archivo ya existe y no se puede reemplazar.')
  }
  const tmp = destino + '.tmp-' + process.pid
  fs.writeFileSync(tmp, datos)
  fs.renameSync(tmp, destino)
  try { fs.chmodSync(destino, 0o444) } catch (_e) { /* ignore */ }
}

function copiarInmutable(origen, destino) {
  if (fs.existsSync(destino)) {
    throw new Error('La bóveda es inmutable: el archivo ya existe y no se puede reemplazar.')
  }
  const tmp = destino + '.tmp-' + process.pid
  fs.copyFileSync(origen, tmp)
  fs.renameSync(tmp, destino)
  try { fs.chmodSync(destino, 0o444) } catch (_e) { /* ignore */ }
}

function sellar(reg) {
  asegurar()
  if (!reg || !reg.ruta || !fs.existsSync(reg.ruta)) {
    return { ok: false, detalle: 'No hay archivo de copia para sellar.' }
  }
  const nombre = path.basename(reg.ruta)
  const destino = path.join(VAULT_COPIAS, nombre)
  if (fs.existsSync(destino)) {
    return { ok: true, yaExistia: true, ruta: destino, checksum: reg.checksum }
  }
  copiarInmutable(reg.ruta, destino)
  const checksum = sha256Archivo(destino)
  if (reg.checksum && checksum !== reg.checksum) {
    try { fs.chmodSync(destino, 0o644) } catch (_e) { /* ignore */ }
    try { fs.unlinkSync(destino) } catch (_e) { /* ignore */ }
    throw new Error('El checksum de la copia no coincide al sellar la bóveda.')
  }
  const sidecar = destino + '.sha256'
  escribirInmutable(sidecar, checksum + '  ' + nombre + '\n')

  const previo = ultimoEslabon()
  const eslabon = sha256Buffer(Buffer.from(previo + '\n' + checksum + '\n' + nombre + '\n' + (reg.fecha || '') + '\n'))
  fs.appendFileSync(CADENA, eslabon + '\n')
  const entrada = {
    ts: new Date().toISOString(),
    backup_id: reg.id,
    nombre,
    checksum,
    checksum_previo: previo,
    eslabon,
    tamano: reg.tamano,
    tipo: reg.tipo,
    cifrado: !!reg.cifrado,
    fecha: reg.fecha
  }
  fs.appendFileSync(MANIFIESTO, JSON.stringify(entrada) + '\n')
  return { ok: true, ruta: destino, checksum, eslabon }
}

function marcarPuntoLimpio(reg) {
  asegurar()
  const sello = sellar(reg)
  const marca = path.join(VAULT_LIMPIO, 'ACTUAL.json')
  const payload = JSON.stringify({
    actualizado: new Date().toISOString(),
    backup_id: reg.id,
    nombre: path.basename(reg.ruta),
    checksum: sello.checksum,
    fecha: reg.fecha,
    ruta_boveda: sello.ruta
  }, null, 2)
  const tmp = marca + '.tmp'
  fs.writeFileSync(tmp, payload)
  fs.renameSync(tmp, marca)
  const destino = path.join(VAULT_LIMPIO, path.basename(reg.ruta))
  if (!fs.existsSync(destino)) copiarInmutable(reg.ruta, destino)
  return { ok: true, punto: marca, copia: destino, checksum: sello.checksum }
}

function puntoLimpio() {
  asegurar()
  const marca = path.join(VAULT_LIMPIO, 'ACTUAL.json')
  if (!fs.existsSync(marca)) return null
  try { return JSON.parse(fs.readFileSync(marca, 'utf8')) } catch (_e) { return null }
}

function listar() {
  asegurar()
  if (!fs.existsSync(MANIFIESTO)) return []
  return fs.readFileSync(MANIFIESTO, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch (_e) { return null } })
    .filter(Boolean)
    .reverse()
}

function verificarCadena() {
  asegurar()
  const entradas = listar().slice().reverse()
  const lineas = fs.readFileSync(CADENA, 'utf8').trim().split('\n').filter(Boolean)
  const rotas = []
  let previo = 'GENESIS'
  if (lineas[0] !== 'GENESIS') rotas.push({ tipo: 'cadena', detalle: 'Falta el eslabón GENESIS.' })
  for (const e of entradas) {
    const esperado = sha256Buffer(Buffer.from(previo + '\n' + e.checksum + '\n' + e.nombre + '\n' + (e.fecha || '') + '\n'))
    if (e.eslabon !== esperado) rotas.push({ tipo: 'cadena', nombre: e.nombre, detalle: 'Eslabón alterado.' })
    const archivo = path.join(VAULT_COPIAS, e.nombre)
    if (!fs.existsSync(archivo)) {
      rotas.push({ tipo: 'faltante', nombre: e.nombre, detalle: 'Archivo ausente en la bóveda.' })
    } else {
      const actual = sha256Archivo(archivo)
      if (actual !== e.checksum) rotas.push({ tipo: 'checksum', nombre: e.nombre, detalle: 'El hash no coincide: posible alteración.' })
      try {
        const modo = fs.statSync(archivo).mode & 0o222
        if (modo) rotas.push({ tipo: 'permisos', nombre: e.nombre, detalle: 'El archivo es escribible; debería ser de solo lectura.' })
      } catch (_e) { /* ignore */ }
    }
    previo = e.eslabon
  }
  return { ok: rotas.length === 0, copias: entradas.length, rotas }
}

function exportarOffline() {
  asegurar()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destino = path.join(VAULT_OFFLINE, 'export-' + stamp)
  fs.mkdirSync(destino, { recursive: true })
  const copias = fs.readdirSync(VAULT_COPIAS)
  for (const n of copias) fs.copyFileSync(path.join(VAULT_COPIAS, n), path.join(destino, n))
  fs.copyFileSync(MANIFIESTO, path.join(destino, 'MANIFIESTO.jsonl'))
  fs.copyFileSync(CADENA, path.join(destino, 'CADENA.sha256'))
  if (fs.existsSync(path.join(VAULT_LIMPIO, 'ACTUAL.json'))) {
    fs.copyFileSync(path.join(VAULT_LIMPIO, 'ACTUAL.json'), path.join(destino, 'PUNTO-LIMPIO.json'))
  }
  const inventario = verificarCadena()
  fs.writeFileSync(path.join(destino, 'VERIFICACION.json'), JSON.stringify(inventario, null, 2))
  return { ok: inventario.ok, destino, copias: copias.filter((n) => !n.endsWith('.sha256')).length, rotas: inventario.rotas }
}

function rechazarBorrado(ruta) {
  if (!ruta) return false
  const abs = path.resolve(ruta)
  return abs.startsWith(path.resolve(VAULT_DIR) + path.sep)
}

module.exports = {
  VAULT_DIR,
  VAULT_COPIAS,
  VAULT_LIMPIO,
  VAULT_OFFLINE,
  asegurar,
  sellar,
  marcarPuntoLimpio,
  puntoLimpio,
  listar,
  verificarCadena,
  exportarOffline,
  rechazarBorrado,
  sha256Archivo
}
