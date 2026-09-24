'use strict'

const vault = require('../lib/vault')

vault.asegurar()
const r = vault.exportarOffline()
console.log('Paquete offline:', r.destino)
console.log('Copias:', r.copias)
console.log('Cadena:', r.ok ? 'INTEGRA' : 'ALTERADA')
if (r.rotas && r.rotas.length) {
  for (const x of r.rotas) console.log(' -', x.tipo, x.nombre || '', x.detalle)
  process.exit(2)
}
console.log('Copie esta carpeta a un medio desconectado (USB, disco externo) y retírelo de la red.')
process.exit(0)
