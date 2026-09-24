'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'sentido-fallo', archivo: 'sentido-fallo-individualizacion-pena-447.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirSentidoFallo: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
