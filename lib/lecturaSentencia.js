'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'lectura-sentencia', archivo: 'lectura-sentencia.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirLecturaSentencia: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
