'use strict'

const path = require('path')
const { leerDocx, escribirDocx } = require('./docx')
const { extraerCampos } = require('./ordenVerbal')

const PLANTILLA = path.join(__dirname, '..', 'data', 'plantillas', 'acusacion.docx')
const DOCUMENTO = 'word/document.xml'

const REGLAS = [
  { texto: '(columna AJ - FECHA AUDIENCIA)', campo: 'fecha_audiencia' },
  { texto: '(columna J y K – RADICADO y No.)', campo: 'radicado_no' },
  { texto: '(columna N – DELITOS EN CONCURSO)', campo: 'delitos_en_concurso' },
  { texto: '(columna AK - HORA)', campo: 'hora' },
  { texto: '(columna W – FISCLAIA', campo: 'fiscalia' },
  { texto: '(columna O – PROCESADO(S))', campo: 'procesado_s' },
  { texto: '(columna AA – VICTIMA)', campo: 'victima' },
  { texto: '(columna AC – DEFENSORIA - MIN PUBLICO)', campo: 'defensoria_min_publico' },
  { texto: '(columna Y – DEFENSOR)', campo: 'defensor' }
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

function unirLineas(valor) {
  return String(valor || '').replace(/\s*\n+\s*/g, ', ').trim()
}

function textoRun(valor) {
  const escapado = escXml(valor)
  if (!escapado) return ''
  return escapado.replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">')
}

function textoDelRun(run) {
  const partes = []
  const reT = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
  let m
  while ((m = reT.exec(run))) partes.push(m[1])
  return partes.join('')
}

function reemplazarRunsAmarillos(xml, valores) {
  const mapa = new Map(REGLAS.map((r) => [r.texto, r.campo]))
  const reRun = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g
  return xml.replace(reRun, (run) => {
    if (run.indexOf('w:val="yellow"') === -1 && run.indexOf("w:val='yellow'") === -1) return run
    const original = textoDelRun(run)
    let valor
    if (mapa.has(original)) valor = valores[mapa.get(original)] == null ? '' : valores[mapa.get(original)]
    else if (original === ',' || original === 'XXX') valor = original
    else return run
    let nuevo = run.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, '')
    nuevo = nuevo.replace(/<w:highlight\b[^>]*\/>/g, '')
    const cierre = nuevo.lastIndexOf('</w:r>')
    nuevo = nuevo.slice(0, cierre) + `<w:t xml:space="preserve">${textoRun(valor)}</w:t>` + nuevo.slice(cierre)
    return nuevo
  })
}

function armarDocumento(valores) {
  const original = cargarPlantilla().get(DOCUMENTO).toString('utf8')
  const xml = reemplazarRunsAmarillos(original, valores)
  const pendientes = []
  const reRun = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g
  let m
  while ((m = reRun.exec(xml))) {
    const run = m[0]
    if (run.indexOf('yellow') === -1) continue
    const t = textoDelRun(run)
    if (t.includes('columna') || t.includes('Columna')) pendientes.push(t)
  }
  if (pendientes.length) {
    throw new Error('Quedaron campos amarillos sin reemplazar: ' + pendientes.join(' | '))
  }
  return xml
}

function camposAcusacion(row) {
  const c = extraerCampos(row)
  return {
    fecha_audiencia: c.fecha_audiencia,
    hora: c.hora,
    radicado_no: c.radicado_no,
    procesado_s: unirLineas(c.procesado_s),
    delitos_en_concurso: unirLineas(c.delitos_en_concurso),
    fiscalia: unirLineas(c.fiscalia),
    victima: unirLineas(c.victima),
    defensoria_min_publico: unirLineas(c.defensoria_min_publico),
    defensor: unirLineas(c.defensor)
  }
}

function decodeXml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function xmlAHtml(xml) {
  const cuerpo = xml.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/, '')
  const paras = cuerpo.match(/<w:p\b[\s\S]*?<\/w:p>/g) || []
  return paras.map((p) => {
    const jc = (p.match(/<w:jc w:val="([^"]+)"/) || [])[1]
    const cls = jc === 'center' ? 'ovc-center' : 'ovc-p'
    const runs = p.match(/<w:r\b[\s\S]*?<\/w:r>/g) || []
    let html = ''
    for (const r of runs) {
      const negrita = /<w:b\b/.test(r) || /<w:bCs\b/.test(r)
      if (/<w:tab\b/.test(r)) html += '&emsp;'
      const partes = []
      const reT = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
      let m
      while ((m = reT.exec(r))) partes.push(decodeXml(m[1]))
      let t = partes.join('')
      if (!t) continue
      t = escHtml(t).replace(/\n/g, '<br>')
      html += negrita ? `<strong>${t}</strong>` : t
    }
    if (!html.trim()) html = '&nbsp;'
    return `<p class="${cls}">${html}</p>`
  }).join('')
}

function encabezadoHtml() {
  return `<div class="ovc-header">
    <img class="ovc-logo" src="/api/oficios/acusacion/media/image1.png" alt="Rama Judicial" />
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
    <img class="ovc-pie-logo" src="/api/oficios/acusacion/media/image2.jpeg" alt="Certificaciones" />
    <span class="ovc-num-pagina">Página 1</span>
  </div>`
}

function htmlVistaPrevia(xml) {
  return `<div class="ovc-pagina ovc-carta">${encabezadoHtml()}<div class="ovc-cuerpo">${xmlAHtml(xml)}</div>${pieHtml()}</div>`
}

function nombreArchivo(campos, id) {
  const base = ['acusacion', campos.radicado_no || '', id]
    .filter(Boolean)
    .join('-')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)
  return base || 'acusacion'
}

function construirAcusacion(row) {
  const campos = camposAcusacion(row)
  const xml = armarDocumento(campos)
  const entradas = new Map(cargarPlantilla())
  entradas.set(DOCUMENTO, Buffer.from(xml, 'utf8'))
  return {
    id: row.id,
    tipo: 'acusacion',
    campos,
    html: htmlVistaPrevia(xml),
    docx: escribirDocx(entradas),
    nombre_archivo: nombreArchivo(campos, row.id)
  }
}

module.exports = {
  cargarPlantilla,
  media,
  camposAcusacion,
  armarDocumento,
  htmlVistaPrevia,
  construirAcusacion,
  nombreArchivo,
  PLANTILLA
}
