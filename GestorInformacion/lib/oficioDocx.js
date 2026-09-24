'use strict'

const path = require('path')
const { leerDocx, escribirDocx } = require('./docx')
const { extraerCampos } = require('./ordenVerbal')
const { fechaLarga, hoyISO } = require('./dates')

const DOCUMENTO = 'word/document.xml'

function unirLineas(valor) {
  return String(valor || '').replace(/\s*\n+\s*/g, ', ').trim()
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

function decodeXml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function campoDeAmarillo(texto) {
  const t = String(texto || '').toLowerCase()
  if (t.includes('fecha actual')) return 'fecha_constancia'
  if (!t.includes('columna')) return null
  if (t.includes('radicado')) return 'radicado_no'
  if (t.includes('delito')) return 'delitos_en_concurso'
  if (t.includes('matriz')) return 'matriz'
  if (t.includes('fiscl') || t.includes('fiscal')) return 'fiscalia'
  if (t.includes('procesado')) return 'procesado_s'
  if (t.includes('victima')) return 'victima'
  if (t.includes('defensoria') || t.includes('min public')) return 'defensoria_min_publico'
  if (t.includes('defensor')) return 'defensor'
  if (t.includes('detenido') || t.includes('columna s')) return 'direccion_detenido'
  if (t.includes('columna ai') || t.includes('ai -')) return 'audiencia'
  if (t.includes('aj') || t.includes('fecha')) return 'fecha_audiencia'
  if (t.includes('ak') || t.includes('hora')) return 'hora'
  return undefined
}

function camposInventario(row) {
  const c = extraerCampos(row)
  return {
    fecha_constancia: fechaLarga(hoyISO()),
    fecha_audiencia: c.fecha_audiencia,
    hora: c.hora,
    radicado_no: c.radicado_no,
    procesado_s: unirLineas(c.procesado_s),
    delitos_en_concurso: unirLineas(c.delitos_en_concurso),
    fiscalia: unirLineas(c.fiscalia),
    victima: unirLineas(c.victima),
    defensoria_min_publico: unirLineas(c.defensoria_min_publico),
    defensor: unirLineas(c.defensor),
    audiencia: unirLineas(c.audiencia),
    matriz: unirLineas(c.matriz),
    direccion_detenido: unirLineas(c.direccion_detenido)
  }
}

function reemplazarRunsAmarillos(xml, valores) {
  const reRun = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g
  return xml.replace(reRun, (run) => {
    if (run.indexOf('w:val="yellow"') === -1 && run.indexOf("w:val='yellow'") === -1) return run
    const original = textoDelRun(run)
    const campo = campoDeAmarillo(original)
    let valor
    if (campo) valor = valores[campo] == null ? '' : valores[campo]
    else if (campo === undefined) return run
    else valor = original
    let nuevo = run.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, '')
    nuevo = nuevo.replace(/<w:highlight\b[^>]*\/>/g, '')
    const cierre = nuevo.lastIndexOf('</w:r>')
    nuevo = nuevo.slice(0, cierre) + `<w:t xml:space="preserve">${textoRun(valor)}</w:t>` + nuevo.slice(cierre)
    return nuevo
  })
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

function crear(opciones) {
  const tipo = opciones.tipo
  const PLANTILLA = path.join(__dirname, '..', 'data', 'plantillas', opciones.archivo)
  let cache = null

  function cargarPlantilla() {
    if (!cache) cache = leerDocx(PLANTILLA)
    return cache
  }

  function media(nombre) {
    const entradas = cargarPlantilla()
    const clave = 'word/media/' + nombre
    if (entradas.has(clave)) return entradas.get(clave)
    if (nombre === 'image2.jpeg' && entradas.has('word/media/image2.jpg')) return entradas.get('word/media/image2.jpg')
    if (nombre === 'image2.jpg' && entradas.has('word/media/image2.jpeg')) return entradas.get('word/media/image2.jpeg')
    return null
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
      if (t.includes('columna') || t.includes('Columna') || t.includes('fecha actual')) pendientes.push(t)
    }
    if (pendientes.length) {
      throw new Error('Quedaron campos amarillos sin reemplazar: ' + pendientes.join(' | '))
    }
    return xml
  }

  function encabezadoHtml() {
    return `<div class="ovc-header">
    <img class="ovc-logo" src="/api/oficios/${tipo}/media/image1.png" alt="Rama Judicial" />
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
    <img class="ovc-pie-logo" src="/api/oficios/${tipo}/media/image2.jpeg" alt="Certificaciones" />
    <span class="ovc-num-pagina">Página 1</span>
  </div>`
  }

  function htmlVistaPrevia(xml) {
    return `<div class="ovc-pagina ovc-carta">${encabezadoHtml()}<div class="ovc-cuerpo">${xmlAHtml(xml)}</div>${pieHtml()}</div>`
  }

  function nombreArchivo(campos, id) {
    const base = [tipo, campos.radicado_no || '', id]
      .filter(Boolean)
      .join('-')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 80)
    return base || tipo
  }

  function construir(row) {
    const campos = camposInventario(row)
    const xml = armarDocumento(campos)
    const entradas = new Map(cargarPlantilla())
    entradas.set(DOCUMENTO, Buffer.from(xml, 'utf8'))
    return {
      id: row.id,
      tipo,
      campos,
      html: htmlVistaPrevia(xml),
      docx: escribirDocx(entradas),
      nombre_archivo: nombreArchivo(campos, row.id)
    }
  }

  return {
    tipo,
    PLANTILLA,
    cargarPlantilla,
    media,
    armarDocumento,
    htmlVistaPrevia,
    nombreArchivo,
    construir
  }
}

module.exports = { crear, camposInventario, campoDeAmarillo }
