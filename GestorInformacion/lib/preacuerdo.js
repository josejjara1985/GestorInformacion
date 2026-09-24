'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'preacuerdo', archivo: 'preacuerdo.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirPreacuerdo: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
