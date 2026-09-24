'use strict'

const path = require('path')
const vault = require('../lib/vault')

vault.asegurar()
const r = vault.verificarCadena()
const punto = vault.puntoLimpio()
console.log('Bóveda:', vault.VAULT_DIR)
console.log('Copias selladas:', r.copias)
console.log('Cadena:', r.ok ? 'INTEGRA' : 'ALTERADA')
if (punto) {
  console.log('Punto limpio:', punto.nombre)
  console.log('Fecha:', punto.fecha || punto.actualizado)
  console.log('Checksum:', punto.checksum)
} else {
  console.log('Punto limpio: no definido')
}
if (r.rotas && r.rotas.length) {
  console.log('Incidencias:')
  for (const x of r.rotas) console.log(' -', x.tipo, x.nombre || '', x.detalle)
  process.exit(2)
}
process.exit(0)
