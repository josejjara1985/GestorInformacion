'use strict'

const fs = require('fs')
const zlib = require('zlib')

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c
  }
  return tabla
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function leerDocx(ruta) {
  const zip = fs.readFileSync(ruta)
  const entradas = new Map()
  let pos = 0
  while (pos + 4 <= zip.length) {
    const firma = zip.readUInt32LE(pos)
    if (firma !== 0x04034b50) break
    const metodo = zip.readUInt16LE(pos + 8)
    const crc = zip.readUInt32LE(pos + 14)
    const compSize = zip.readUInt32LE(pos + 18)
    const size = zip.readUInt32LE(pos + 22)
    const nameLen = zip.readUInt16LE(pos + 26)
    const extraLen = zip.readUInt16LE(pos + 28)
    const nombre = zip.toString('utf8', pos + 30, pos + 30 + nameLen)
    const inicio = pos + 30 + nameLen + extraLen
    const datos = zip.subarray(inicio, inicio + compSize)
    let contenido
    if (metodo === 0) contenido = Buffer.from(datos)
    else {
      contenido = zlib.inflateRawSync(datos)
      if (contenido.length !== size) {
        // El tamaño declarado no coincide; se usa el resultado de la descompresión.
      }
    }
    if (crc32(contenido) !== crc) {
      throw new Error(`CRC inválido en la entrada ${nombre}`)
    }
    entradas.set(nombre, contenido)
    pos = inicio + compSize
  }
  if (!entradas.size) throw new Error('No se pudo leer el archivo DOCX de plantilla.')
  return entradas
}

function fechaDos(d) {
  const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  return { fecha, hora }
}

function escribirDocx(entradas) {
  const locales = []
  const central = []
  let offset = 0
  const ahora = fechaDos(new Date())
  for (const [nombre, contenido] of entradas) {
    const nombreBuf = Buffer.from(nombre, 'utf8')
    const comprimido = zlib.deflateRawSync(contenido, { level: 6 })
    const crc = crc32(contenido)
    const cabLoc = Buffer.alloc(30)
    cabLoc.writeUInt32LE(0x04034b50, 0)
    cabLoc.writeUInt16LE(20, 4)
    cabLoc.writeUInt16LE(0, 6)
    cabLoc.writeUInt16LE(8, 8)
    cabLoc.writeUInt16LE(ahora.hora, 10)
    cabLoc.writeUInt16LE(ahora.fecha, 12)
    cabLoc.writeUInt32LE(crc, 14)
    cabLoc.writeUInt32LE(comprimido.length, 18)
    cabLoc.writeUInt32LE(contenido.length, 22)
    cabLoc.writeUInt16LE(nombreBuf.length, 26)
    cabLoc.writeUInt16LE(0, 28)
    locales.push(cabLoc, nombreBuf, comprimido)

    const cabCen = Buffer.alloc(46)
    cabCen.writeUInt32LE(0x02014b50, 0)
    cabCen.writeUInt16LE(20, 4)
    cabCen.writeUInt16LE(20, 6)
    cabCen.writeUInt16LE(0, 8)
    cabCen.writeUInt16LE(8, 10)
    cabCen.writeUInt16LE(ahora.hora, 12)
    cabCen.writeUInt16LE(ahora.fecha, 14)
    cabCen.writeUInt32LE(crc, 16)
    cabCen.writeUInt32LE(comprimido.length, 20)
    cabCen.writeUInt32LE(contenido.length, 24)
    cabCen.writeUInt16LE(nombreBuf.length, 28)
    cabCen.writeUInt16LE(0, 30)
    cabCen.writeUInt16LE(0, 32)
    cabCen.writeUInt16LE(0, 34)
    cabCen.writeUInt16LE(0, 36)
    cabCen.writeUInt32LE(0, 38)
    cabCen.writeUInt32LE(offset, 42)
    central.push(cabCen, nombreBuf)

    offset += cabLoc.length + nombreBuf.length + comprimido.length
  }
  const cuerpoLocal = Buffer.concat(locales)
  const cuerpoCentral = Buffer.concat(central)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(0, 4)
  fin.writeUInt16LE(0, 6)
  fin.writeUInt16LE(entradas.size, 8)
  fin.writeUInt16LE(entradas.size, 10)
  fin.writeUInt32LE(cuerpoCentral.length, 12)
  fin.writeUInt32LE(cuerpoLocal.length, 16)
  fin.writeUInt16LE(0, 20)
  return Buffer.concat([cuerpoLocal, cuerpoCentral, fin])
}

module.exports = { leerDocx, escribirDocx, crc32 }
