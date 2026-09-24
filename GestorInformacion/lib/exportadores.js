'use strict'

const zlib = require('zlib')

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function csv(columnas, filas) {
  const sep = ';'
  const celda = (valor) => {
    let s = valor == null ? '' : String(valor)
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lineas = [columnas.map((c) => celda(c.etiqueta)).join(sep)]
  for (const f of filas) lineas.push(columnas.map((c) => celda(f[c.nombre])).join(sep))
  return Buffer.concat([Buffer.from('\uFEFF', 'utf8'), Buffer.from(lineas.join('\r\n'), 'utf8')])
}

/* ------------------------------------------------------------------ */
/* XLSX (OOXML minimo, sin dependencias)                               */
/* ------------------------------------------------------------------ */

const TABLA_CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function zip(archivos) {
  const locales = []
  const centrales = []
  let offset = 0
  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, 'utf8')
    const datos = Buffer.isBuffer(a.datos) ? a.datos : Buffer.from(a.datos, 'utf8')
    const comprimido = zlib.deflateRawSync(datos)
    const crc = crc32(datos)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comprimido.length, 18)
    local.writeUInt32LE(datos.length, 22)
    local.writeUInt16LE(nombre.length, 26)
    local.writeUInt16LE(0, 28)
    locales.push(local, nombre, comprimido)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comprimido.length, 20)
    central.writeUInt32LE(datos.length, 24)
    central.writeUInt16LE(nombre.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrales.push(central, nombre)
    offset += local.length + nombre.length + comprimido.length
  }
  const cd = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(0, 4)
  fin.writeUInt16LE(0, 6)
  fin.writeUInt16LE(archivos.length, 8)
  fin.writeUInt16LE(archivos.length, 10)
  fin.writeUInt32LE(cd.length, 12)
  fin.writeUInt32LE(offset, 16)
  fin.writeUInt16LE(0, 20)
  return Buffer.concat([...locales, cd, fin])
}

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

function colLetra(n) {
  let s = ''
  let x = n
  while (x >= 0) {
    s = String.fromCharCode(65 + (x % 26)) + s
    x = Math.floor(x / 26) - 1
  }
  return s
}

function hojaXml(columnas, filas) {
  const ancho = columnas.map((c) => Math.min(60, Math.max(12, String(c.etiqueta).length + 4)))
  const colsXml = ancho.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const cab = columnas.map((c, i) => `<c r="${colLetra(i)}1" t="inlineStr" s="1"><is><t>${escXml(c.etiqueta)}</t></is></c>`).join('')
  const body = filas.map((f, fi) => {
    const celdas = columnas.map((c, ci) => {
      const v = f[c.nombre]
      return `<c r="${colLetra(ci)}${fi + 2}" t="inlineStr"><is><t>${escXml(v == null ? '' : v)}</t></is></c>`
    }).join('')
    return `<row r="${fi + 2}">${celdas}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colsXml}</cols><sheetData><row r="1">${cab}</row>${body}</sheetData></worksheet>`
}

const ESTILOS_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF043F75"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`

function nombreHojaSeguro(nombre, usados) {
  let base = String(nombre || 'Hoja').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja'
  let nombreFinal = base
  let i = 2
  while (usados.has(nombreFinal)) {
    const sufijo = ' (' + i + ')'
    nombreFinal = base.slice(0, 31 - sufijo.length) + sufijo
    i++
  }
  usados.add(nombreFinal)
  return nombreFinal
}

function xlsxLibro(hojas) {
  const lista = Array.isArray(hojas) ? hojas : [hojas]
  const usados = new Set()
  const nombres = lista.map((h) => nombreHojaSeguro(h.nombre, usados))
  const sheets = lista.map((h) => hojaXml(h.columnas || [], h.filas || []))

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  const archivos = [
    { nombre: '[Content_Types].xml', datos: contentTypes },
    { nombre: '_rels/.rels', datos: rels },
    { nombre: 'xl/workbook.xml', datos: workbook },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: wbRels },
    { nombre: 'xl/styles.xml', datos: ESTILOS_XLSX }
  ]
  sheets.forEach((s, i) => archivos.push({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: s }))
  return zip(archivos)
}

function xlsx(nombreHoja, columnas, filas) {
  return xlsxLibro([{ nombre: nombreHoja, columnas, filas }])
}

/* ------------------------------------------------------------------ */
/* PDF (Helvetica, multipagina, sin dependencias)                      */
/* ------------------------------------------------------------------ */

function escPdf(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ')
}

function anchoTexto(texto, tamano) {
  return String(texto).length * tamano * 0.5
}

function truncar(texto, anchoMax, tamano) {
  let s = String(texto == null ? '' : texto)
  const max = Math.max(1, Math.floor(anchoMax / (tamano * 0.5)))
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 3)) + '...'
}

function pdf(opciones) {
  const o = opciones || {}
  const titulo = o.titulo || 'Reporte'
  const subtitulo = o.subtitulo || ''
  const columnas = o.columnas || []
  const filas = o.filas || []
  const landscape = o.landscape !== false
  const anchoPag = landscape ? 842 : 595
  const altoPag = landscape ? 595 : 842
  const margen = 28
  const altoFila = 16
  const tamCab = 9
  const tamFila = 8
  const tamTitulo = 14
  const util = anchoPag - margen * 2
  const totalPesos = columnas.reduce((s, c) => s + (c.peso || 1), 0)
  const anchos = columnas.map((c) => util * ((c.peso || 1) / totalPesos))

  const paginas = []
  let filasPag = []
  const tope = altoPag - margen - 42
  const capacidad = Math.floor((tope - margen - 20) / altoFila)
  for (let i = 0; i < filas.length + 1; i++) {
    if (filasPag.length >= capacidad) { paginas.push(filasPag); filasPag = []; }
    if (i < filas.length) filasPag.push(filas[i])
  }
  paginas.push(filasPag)

  const totalPaginas = paginas.length
  const objetos = []
  const paginasIds = []
  const contenidoIds = []

  paginas.forEach((pag, idx) => {
    let c = ''
    c += 'BT /F2 ' + tamTitulo + ' Tf ' + margen + ' ' + (altoPag - margen) + ' Td (' + escPdf(titulo) + ') Tj ET\n'
    c += 'BT /F1 9 Tf ' + margen + ' ' + (altoPag - margen - 16) + ' Td (' + escPdf(subtitulo) + ') Tj ET\n'
    c += 'BT /F1 8 Tf ' + (anchoPag - margen - 120) + ' ' + (altoPag - margen) + ' Td (Pagina ' + (idx + 1) + ' de ' + totalPaginas + ') Tj ET\n'
    let cy = altoPag - margen - 38
    c += '0.016 0.247 0.459 rg ' + margen + ' ' + (cy - 4) + ' ' + util + ' ' + (altoFila) + ' re f 1 1 1 rg\n'
    let cx = margen + 3
    columnas.forEach((col, i) => {
      c += 'BT /F2 ' + tamCab + ' Tf ' + cx + ' ' + (cy + 3) + ' Td (' + escPdf(truncar(col.etiqueta, anchos[i] - 6, tamCab)) + ') Tj ET\n'
      cx += anchos[i]
    })
    c += '0 0 0 rg\n'
    cy -= altoFila
    pag.forEach((fila, fi) => {
      if (fi % 2 === 1) c += '0.94 0.95 0.97 rg ' + margen + ' ' + (cy - 2) + ' ' + util + ' ' + altoFila + ' re f 0 0 0 rg\n'
      let x = margen + 3
      columnas.forEach((col, i) => {
        const val = fila[col.nombre]
        c += 'BT /F1 ' + tamFila + ' Tf ' + x + ' ' + (cy + 3) + ' Td (' + escPdf(truncar(val == null ? '' : val, anchos[i] - 6, tamFila)) + ') Tj ET\n'
        x += anchos[i]
      })
      cy -= altoFila
    })
    contenidoIds.push(c)
  })

  const numPaginas = paginas.length
  objetos.push('<< /Type /Catalog /Pages 2 0 R >>')
  const kids = []
  for (let i = 0; i < numPaginas; i++) kids.push((3 + i * 2) + ' 0 R')
  objetos.push('<< /Type /Pages /Count ' + numPaginas + ' /Kids [' + kids.join(' ') + '] >>')
  paginas.forEach((_p, i) => {
    const idPagina = 3 + i * 2
    const idContenido = idPagina + 1
    objetos.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + anchoPag + ' ' + altoPag + '] /Resources << /Font << /F1 ' + (3 + numPaginas * 2) + ' 0 R /F2 ' + (3 + numPaginas * 2 + 1) + ' 0 R >> >> /Contents ' + idContenido + ' 0 R >>')
    const flujo = contenidoIds[i]
    objetos.push('<< /Length ' + Buffer.byteLength(flujo, 'latin1') + ' >>\nstream\n' + flujo + 'endstream')
  })
  objetos.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objetos.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  let salida = '%PDF-1.4\n'
  const offsets = []
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(salida, 'latin1'))
    salida += (i + 1) + ' 0 obj\n' + obj + '\nendobj\n'
  })
  const inicioXref = Buffer.byteLength(salida, 'latin1')
  salida += 'xref\n0 ' + (objetos.length + 1) + '\n0000000000 65535 f \n'
  offsets.forEach((off) => { salida += String(off).padStart(10, '0') + ' 00000 n \n' })
  salida += 'trailer\n<< /Size ' + (objetos.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + inicioXref + '\n%%EOF'
  return Buffer.from(salida, 'latin1')
}

module.exports = { csv, xlsx, xlsxLibro, pdf, crc32, zip }
