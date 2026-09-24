'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'solicitud-defensor', archivo: 'solicitud-defensor.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirSolicitudDefensor: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
