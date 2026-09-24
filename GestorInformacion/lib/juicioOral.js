'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'juicio-oral', archivo: 'juicio-oral.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirJuicioOral: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
