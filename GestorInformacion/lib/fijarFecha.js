'use strict'

const path = require('path')
const { leerDocx, escribirDocx } = require('./docx')
const { parseFecha, extraerFechaEnTexto, hoyISO } = require('./dates')

const PLANTILLA = path.join(__dirname, '..', 'data', 'plantillas', 'reporte-fijar-fecha.xlsx')
const JUZGADO = 'PRIMERO'

const COLUMNAS = [
  { clave: 'fecha_prescripcion', etiqueta: 'FECHA PRESCRIPCION' },
  { clave: 'radicado', etiqueta: 'RADICADO' },
  { clave: 'no', etiqueta: 'No.' },
  { clave: 'delitos_en_concurso', etiqueta: 'DELITOS EN CONCURSO' },
  { clave: 'procesado_s', etiqueta: 'PROCESADO(S)' },
  { clave: 'fiscalia', etiqueta: 'FISCALIA' },
  { clave: 'defensor', etiqueta: 'DEFENSOR' },
  { clave: 'audiencia', etiqueta: 'AUDIENCIA' },
  { clave: 'fecha_audiencia', etiqueta: 'FECHA AUDIENCIA' },
  { clave: 'hora', etiqueta: 'HORA' },
  { clave: 'reparto_secretaria_audiencia', etiqueta: 'REPARTO SECRETARÍA AUDIENCIA' },
  { clave: 'observacion', etiqueta: 'OBSERVACION' }
]

const ESTILOS_DATO = {
  A: '8',
  B: '9',
  C: '14',
  D: '10',
  E: '10',
  F: '10',
  G: '10',
  H: '11',
  I: '12',
  J: '11',
  K: '11',
  L: '17'
}

const ESTILOS_ENCABEZADO = {
  A: '1',
  B: '4',
  C: '2',
  D: '3',
  E: '5',
  F: '3',
  G: '3',
  H: '2',
  I: '6',
  J: '2',
  K: '2',
  L: '7'
}

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function texto(v) {
  return v == null ? '' : String(v)
}

function esJuzgadoPrimero(valor) {
  return texto(valor).trim().toUpperCase() === JUZGADO
}

function fechaAudienciaIso(valor) {
  const raw = texto(valor).trim()
  if (!raw) return null
  return parseFecha(raw) || extraerFechaEnTexto(raw)
}

function pendienteDeFijar(valor) {
  const raw = texto(valor).trim()
  if (!raw) return true
  if (/pendiente/i.test(raw) && !fechaAudienciaIso(raw)) return true
  return !fechaAudienciaIso(raw)
}

function motivoRegistro(row, hoy) {
  if (!esJuzgadoPrimero(row.juzgado)) return ''
  const raw = texto(row.fecha_audiencia).trim()
  if (pendienteDeFijar(raw)) return 'pendiente'
  const iso = fechaAudienciaIso(raw)
  if (iso && iso < hoy) return 'anterior'
  return ''
}

function incluirRegistro(row, hoy, filtro) {
  const motivo = motivoRegistro(row, hoy)
  if (!motivo) return false
  const f = String(filtro || 'todos').toLowerCase()
  if (f === 'pendiente' || f === 'pendientes') return motivo === 'pendiente'
  if (f === 'anterior' || f === 'anteriores') return motivo === 'anterior'
  return true
}

function formatoFechaMostrar(valor) {
  const raw = texto(valor).trim()
  if (!raw) return 'Pendiente'
  const iso = fechaAudienciaIso(raw)
  if (!iso) return raw
  const [y, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

function excelSerial(iso) {
  const parsed = parseFecha(iso)
  if (!parsed) return null
  const [y, m, d] = parsed.split('-').map(Number)
  const dt = Date.UTC(y, m - 1, d)
  const epoch = Date.UTC(1899, 11, 30)
  return Math.round((dt - epoch) / 86400000)
}

function filaReporte(row) {
  return {
    id: row.id,
    fecha_prescripcion: texto(row.fecha_prescripcion).trim(),
    radicado: texto(row.radicado).trim(),
    no: texto(row.no).trim(),
    delitos_en_concurso: texto(row.delitos_en_concurso).trim(),
    procesado_s: texto(row.procesado_s).trim(),
    fiscalia: texto(row.fiscalia).trim(),
    defensor: texto(row.defensor).trim(),
    audiencia: texto(row.audiencia).trim(),
    fecha_audiencia: formatoFechaMostrar(row.fecha_audiencia),
    fecha_audiencia_origen: texto(row.fecha_audiencia).trim(),
    estado: '',
    hora: texto(row.hora).trim(),
    reparto_secretaria_audiencia: texto(row.reparto_secretaria_audiencia).trim(),
    observacion: texto(row.observacion || row.observaciones).trim()
  }
}

function consultar(rows, hoy, filtro) {
  const corte = hoy || hoyISO()
  const f = String(filtro || 'todos').toLowerCase()
  const lista = []
  let pendientes = 0
  let anteriores = 0
  for (const row of rows) {
    const motivo = motivoRegistro(row, corte)
    if (!motivo) continue
    if (motivo === 'pendiente') pendientes++
    if (motivo === 'anterior') anteriores++
    if (!incluirRegistro(row, corte, f)) continue
    const item = filaReporte(row)
    item.estado = motivo === 'pendiente' ? 'Pendiente de fijar' : 'Fecha anterior'
    lista.push(item)
  }
  lista.sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'Pendiente de fijar' ? -1 : 1
    const pa = (a.procesado_s || '').localeCompare(b.procesado_s || '', 'es', { sensitivity: 'base' })
    if (pa) return pa
    return String(a.radicado || '').localeCompare(String(b.radicado || ''))
  })
  return {
    hoy: corte,
    total: lista.length,
    pendientes,
    anteriores,
    filtro: f === 'pendiente' || f === 'pendientes' ? 'pendientes' : (f === 'anterior' || f === 'anteriores' ? 'anteriores' : 'todos'),
    juzgado: JUZGADO,
    fuente: 'Inventario definitivo 18-09-26 · Ley 906 · procesos',
    columnas: COLUMNAS,
    registros: lista
  }
}

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function siShared(textoValor) {
  const t = String(textoValor == null ? '' : textoValor)
  if (/\s$/.test(t) || /^\s/.test(t) || t.includes('\n')) {
    return `<si><t xml:space="preserve">${escXml(t)}</t></si>`
  }
  return `<si><t>${escXml(t)}</t></si>`
}

function celdaTexto(ref, estilo, indice) {
  return `<c r="${ref}" s="${estilo}" t="s"><v>${indice}</v></c>`
}

function celdaNumero(ref, estilo, valor) {
  return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`
}

function indiceShared(mapa, lista, valor) {
  const t = String(valor == null ? '' : valor)
  if (mapa.has(t)) return mapa.get(t)
  const i = lista.length
  mapa.set(t, i)
  lista.push(t)
  return i
}

function construirExcel(data) {
  const entradas = new Map(leerDocx(PLANTILLA))
  const encabezados = COLUMNAS.map((c) => c.etiqueta)
  const strings = []
  const mapa = new Map()
  for (const h of encabezados) indiceShared(mapa, strings, h)

  const filasXml = []
  filasXml.push(
    `<row r="1" spans="1:12" ht="50.1" customHeight="1" x14ac:dyDescent="0.25">` +
    LETRAS.map((letra, i) => celdaTexto(`${letra}1`, ESTILOS_ENCABEZADO[letra], indiceShared(mapa, strings, encabezados[i]))).join('') +
    `</row>`
  )

  data.registros.forEach((r, idx) => {
    const n = idx + 2
    const valores = [
      r.fecha_prescripcion,
      r.radicado,
      r.no,
      r.delitos_en_concurso,
      r.procesado_s,
      r.fiscalia,
      r.defensor,
      r.audiencia,
      r.fecha_audiencia,
      r.hora,
      r.reparto_secretaria_audiencia,
      r.observacion
    ]
    const celdas = LETRAS.map((letra, i) => {
      const ref = `${letra}${n}`
      const estilo = ESTILOS_DATO[letra]
      const valor = valores[i]
      if (letra === 'A') {
        const serial = excelSerial(valor)
        if (serial != null) return celdaNumero(ref, estilo, serial)
      }
      if ((letra === 'B' || letra === 'C') && valor && /^\d+$/.test(valor) && valor.length <= 15) {
        return celdaNumero(ref, estilo, valor)
      }
      if (!valor) return `<c r="${ref}" s="${estilo}"/>`
      return celdaTexto(ref, estilo, indiceShared(mapa, strings, valor))
    }).join('')
    filasXml.push(
      `<row r="${n}" spans="1:12" s="13" customFormat="1" ht="50.1" customHeight="1" x14ac:dyDescent="0.25">${celdas}</row>`
    )
  })

  const ultima = Math.max(1, data.registros.length + 1)
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac xr xr2 xr3" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3"><dimension ref="A1:L${ultima}"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr baseColWidth="10" defaultRowHeight="15" x14ac:dyDescent="0.25"/><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="15.42578125" customWidth="1"/><col min="4" max="4" width="22.7109375" customWidth="1"/><col min="5" max="5" width="22.85546875" customWidth="1"/><col min="6" max="6" width="23.140625" customWidth="1"/><col min="7" max="7" width="29.28515625" customWidth="1"/><col min="8" max="8" width="23.28515625" customWidth="1"/><col min="9" max="9" width="33.28515625" customWidth="1"/><col min="12" max="12" width="43.28515625" customWidth="1"/></cols><sheetData>${filasXml.join('')}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`

  const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map(siShared).join('')}</sst>`

  entradas.set('xl/worksheets/sheet1.xml', Buffer.from(sheet, 'utf8'))
  entradas.set('xl/sharedStrings.xml', Buffer.from(sst, 'utf8'))
  entradas.delete('xl/comments1.xml')
  entradas.delete('xl/drawings/vmlDrawing1.vml')
  entradas.delete('xl/worksheets/_rels/sheet1.xml.rels')

  const types = entradas.get('[Content_Types].xml').toString('utf8')
    .replace(/<Override PartName="\/xl\/comments1\.xml"[^/]*\/>/, '')
    .replace(/<Override PartName="\/xl\/drawings\/vmlDrawing1\.vml"[^/]*\/>/, '')
  entradas.set('[Content_Types].xml', Buffer.from(types, 'utf8'))

  return escribirDocx(entradas)
}

function nombreArchivo(hoy) {
  return `reporte-fijar-fecha-${hoy || hoyISO()}`
}

module.exports = {
  consultar,
  construirExcel,
  nombreArchivo,
  incluirRegistro,
  motivoRegistro,
  COLUMNAS,
  JUZGADO,
  PLANTILLA
}
