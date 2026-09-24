'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'individualizacion-pena', archivo: 'individualizacion-pena-447.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirIndividualizacionPena: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
