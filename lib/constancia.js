'use strict'

const path = require('path')
const { leerDocx, escribirDocx } = require('./docx')
const { fechaLarga, hoyISO } = require('./dates')
const { extraerCampos } = require('./ordenVerbal')

const PLANTILLA = path.join(__dirname, '..', 'data', 'plantillas', 'constancia-audiencia.docx')
const DOCUMENTO = 'word/document.xml'

const REGLAS = [
  { texto: 'Fecha del día que se genera la constancia', campo: 'fecha_constancia' },
  { texto: 'columna AJ - FECHA AUDIENCIA)', campo: 'fecha_audiencia' },
  { texto: '(columna AK - ', campo: 'hora' },
  { texto: 'HORA)', campo: '' },
  { texto: '(columna AI - AUDIENCIA)', campo: 'audiencia' },
  { texto: '(columna J y K – RADICADO y No.)', campo: 'radicado_no' },
  { texto: '(columna O – PROCESADO(S))', campo: 'procesado_s' },
  { texto: '(columna N – DELITOS EN CONCURSO)', campo: 'delitos_en_concurso' }
]

let cache = null

function cargarPlantilla() {
  if (!cache) cache = leerDocx(PLANTILLA)
  return cache
}

function media(nombre) {
  const entradas = cargarPlantilla()
  const clave = 'word/media/' + nombre
  if (!entradas.has(clave)) return null
  return entradas.get(clave)
}

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nlHtml(s) {
  return escHtml(s).replace(/\n/g, '<br>')
}

function textoRun(valor) {
  const escapado = escXml(valor)
  if (!escapado) return ''
  return escapado.replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">')
}

function reemplazarRun(xml, textoOriginal, valor) {
  const reRun = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g
  let m
  while ((m = reRun.exec(xml))) {
    const run = m[0]
    if (run.indexOf('<w:highlight') === -1) continue
    if (run.indexOf(textoOriginal) === -1) continue
    const reT = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/
    const coincidencia = run.match(reT)
    if (!coincidencia || coincidencia[2] !== textoOriginal) continue
    let nuevo = run.replace(reT, `<w:t xml:space="preserve">${textoRun(valor)}</w:t>`)
    nuevo = nuevo.replace(/<w:highlight\b[^>]*\/>/, '')
    return xml.slice(0, m.index) + nuevo + xml.slice(m.index + run.length)
  }
  return null
}

function armarDocumento(valores) {
  const original = cargarPlantilla().get(DOCUMENTO).toString('utf8')
  let xml = original
  for (const regla of REGLAS) {
    const valor = valores[regla.campo] == null ? '' : valores[regla.campo]
    const siguiente = reemplazarRun(xml, regla.texto, valor)
    if (siguiente == null) {
      throw new Error(`No se encontró en la plantilla el campo resaltado "${regla.texto}".`)
    }
    xml = siguiente
  }
  const sobrantes = REGLAS.filter((r) => xml.indexOf(r.texto) !== -1)
  if (sobrantes.length) {
    throw new Error(`Quedaron campos sin reemplazar: ${sobrantes.map((r) => r.texto).join(', ')}`)
  }
  return xml
}

function unirLineas(valor) {
  return String(valor || '').replace(/\s*\n+\s*/g, ', ').trim()
}

function camposConstancia(row) {
  const c = extraerCampos(row)
  return {
    fecha_constancia: fechaLarga(hoyISO()),
    fecha_audiencia: c.fecha_audiencia,
    hora: c.hora,
    audiencia: c.audiencia,
    radicado_no: c.radicado_no,
    procesado_s: unirLineas(c.procesado_s),
    delitos_en_concurso: unirLineas(c.delitos_en_concurso)
  }
}

function encabezadoHtml() {
  return `<div class="ovc-header">
    <img class="ovc-logo" src="/api/oficios/constancia/media/image1.png" alt="Rama Judicial" />
    <div class="ovc-header-texto">
      <p>Juzgado Primero Penal del Circuito Especializado de Tumaco</p>
      <p>Calle Mosquera Palacio de Justicia 4º piso</p>
      <p>Tumaco-Nariño</p>
      <p>j01pcesptumaco@cendoj.ramajudicial.gov.co</p>
      <p>Celular 3177576120 - 3105585114</p>
    </div>
  </div>`
}

function pieHtml() {
  return `<div class="ovc-footer">
    <img class="ovc-pie-logo" src="/api/oficios/constancia/media/image2.jpeg" alt="Certificaciones" />
    <span class="ovc-num-pagina">Página 1 | 1</span>
  </div>`
}

function cuerpoHtml(c) {
  return `<p class="ovc-p"><strong>CONSTANCIA SECRETARIAL.-</strong> ${nlHtml(c.fecha_constancia)}. Dejo constancia que para el día ${nlHtml(c.fecha_audiencia)} a las ${nlHtml(c.hora)} se tenía programada audiencia de ${nlHtml(c.audiencia)} dentro del proceso ${nlHtml(c.radicado_no)}, seguido en contra de ${nlHtml(c.procesado_s)}, por el delito de ${nlHtml(c.delitos_en_concurso)}. </p>
    <p class="ovc-p">&nbsp;</p>
    <p class="ovc-p">La misma no se realizó por cuanto se aceptó la solicitud de aplazamiento presentada por XXX.</p>
    <p class="ovc-p">&nbsp;</p>
    <p class="ovc-p">Con orden verbal posterior se notificará la nueva fecha y hora de la audiencia.</p>
    <p class="ovc-p">&nbsp;</p>
    <p class="ovc-p">&nbsp;</p>
    <p class="ovc-p">&nbsp;</p>
    <p class="ovc-p"><strong>JACKELINE JARAMILLO MUÑOZ</strong></p>
    <p class="ovc-p">Secretaria</p>
    <p class="ovc-p">Juzgado Primero Penal del Circuito Especializado de Tumaco</p>
    <p class="ovc-p">Celular 3177576120</p>
    <p class="ovc-p">Correo electrónico j01pcesptumaco@cendoj.ramajudicial.gov.co</p>`
}

function htmlVistaPrevia(c) {
  return `<div class="ovc-pagina">${encabezadoHtml()}<div class="ovc-cuerpo">${cuerpoHtml(c)}</div>${pieHtml()}</div>`
}

function nombreArchivo(campos, id) {
  const base = ['constancia-audiencia', campos.radicado_no || '', id]
    .filter(Boolean)
    .join('-')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)
  return base || 'constancia-audiencia'
}

function construirConstancia(row) {
  const campos = camposConstancia(row)
  const entradas = new Map(cargarPlantilla())
  entradas.set(DOCUMENTO, Buffer.from(armarDocumento(campos), 'utf8'))
  return {
    id: row.id,
    tipo: 'constancia',
    campos,
    html: htmlVistaPrevia(campos),
    docx: escribirDocx(entradas),
    nombre_archivo: nombreArchivo(campos, row.id)
  }
}

module.exports = {
  cargarPlantilla,
  media,
  camposConstancia,
  armarDocumento,
  htmlVistaPrevia,
  construirConstancia,
  nombreArchivo,
  PLANTILLA
}
