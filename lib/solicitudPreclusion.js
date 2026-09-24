'use strict'

const { crear } = require('./oficioDocx')

const gen = crear({ tipo: 'solicitud-preclusion', archivo: 'solicitud-preclusion.docx' })

module.exports = {
  cargarPlantilla: gen.cargarPlantilla,
  media: gen.media,
  armarDocumento: gen.armarDocumento,
  htmlVistaPrevia: gen.htmlVistaPrevia,
  construirSolicitudPreclusion: gen.construir,
  nombreArchivo: gen.nombreArchivo,
  PLANTILLA: gen.PLANTILLA
}
