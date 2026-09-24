const { fechaLarga } = require('./dates')

function texto(v) {
  if (v == null) return ''
  return String(v).replace(/\r\n/g, '\n').trim()
}

function fechaOficio(valor) {
  return fechaLarga(valor)
}

function procesoRadicado(row) {
  const r = texto(row.radicado)
  const n = texto(row.no)
  if (r && n) return `${r}-${n}`
  return r || n
}

function extraerCampos(row) {
  return {
    no_orden_verbal: texto(row.no_orden_verbal),
    fecha_orden_verbal: fechaOficio(row.fecha_orden_verbal),
    audiencia: texto(row.audiencia),
    fecha_audiencia: fechaOficio(row.fecha_audiencia),
    hora: texto(row.hora),
    radicado_no: procesoRadicado(row),
    radicado: texto(row.radicado),
    no: texto(row.no),
    matriz: texto(row.matriz),
    procesado_s: texto(row.procesado_s),
    delitos_en_concurso: texto(row.delitos_en_concurso),
    fiscalia: texto(row.fiscalia),
    direccion_fiscal: texto(row.direccion_fiscal),
    defensoria_min_publico: texto(row.defensoria_min_publico),
    direccion_min_publico: texto(row.direccion_min_publico),
    victima: texto(row.victima),
    direccion_victima: texto(row.direccion_victima),
    defensor: texto(row.defensor),
    direccion_defensor: texto(row.direccion_defensor),
    direccion_detenido: texto(row.direccion_detenido)
  }
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl(s) {
  return escHtml(s).replace(/\n/g, '<br>')
}

const TIPOS_OFICIO = ['orden', 'recordatorio', 'acta']
const RESULTADOS_ACTA = ['REALIZO', 'APLAZO', 'FRACASO']

function normalizarTipo(tipo) {
  return TIPOS_OFICIO.includes(tipo) ? tipo : 'orden'
}

function normalizarResultado(valor) {
  const v = texto(valor).toUpperCase()
  return RESULTADOS_ACTA.includes(v) ? v : RESULTADOS_ACTA[0]
}

function campoManual(valor, dataCampo) {
  const v = texto(valor)
  if (v) return nl(v)
  const attr = dataCampo ? ` data-campo="${dataCampo}"` : ''
  return `<span class="ov-manual" contenteditable="true" spellcheck="false"${attr}>&nbsp;</span>`
}

function cuerpoOficio(campos) {
  const c = campos
  return `
    <p class="ov-titulo">ORDEN VERBAL No. ${nl(c.no_orden_verbal)}</p>
    <p>Buen día,</p>
    <p class="ov-just">Por orden verbal del señor Juez, me permito notificarles la audiencia ${nl(c.audiencia)} de programada para el día ${nl(c.fecha_audiencia)} a partir de las ${nl(c.hora)} en el proceso ${nl(c.radicado_no)}, seguido en contra de ${nl(c.procesado_s)}, por el delito de ${nl(c.delitos_en_concurso)}, la cual se realizará de forma virtual a través de Teams si la actual situación de virtualidad sigue igual, de lo contrario se realizará en la Sala de Audiencias del Juzgado en la ciudad de Tumaco.</p>
    <p><strong>FISCALÍA:</strong> ${nl(c.fiscalia)},<br>
    <strong>NOTIFICACIÓN:</strong> ${nl(c.direccion_fiscal)},</p>
    <p><strong>MIN. PUBLICO:</strong> ${nl(c.defensoria_min_publico)},<br>
    <strong>NOTIFICACIÓN:</strong> ${nl(c.direccion_min_publico)},</p>
    <p><strong>VICTIMA:</strong> ${nl(c.victima)},<br>
    <strong>NOTIFICACIÓN:</strong> ${nl(c.direccion_victima)},</p>
    <p><strong>DEFENSA:</strong> ${nl(c.defensor)},<br>
    <strong>NOTIFICACIÓN:</strong> ${nl(c.direccion_defensor)},</p>
    <p><strong>PROCESADOS:</strong> ${nl(c.procesado_s)},<br>
    <strong>NOTIFICACIÓN:</strong> ${nl(c.direccion_detenido)},</p>
    <p class="ov-just"><strong>OBSERVACIONES:</strong> SE DEBE INFORMAR INMEDIATAMENTE SI EXISTE CAMBIO EN FISCAL, DEFENSOR, VICTIMA, LUGAR DE UBICACIÓN DE LOS PROCESADOS.</p>
    <p class="ov-just">SE REQUIERE AL INPEC INFORME A LOS PROCESADOS DE LA FECHA Y HORA DE LA DILIGENCIA.</p>
    <p><strong>OBSERVACIÓN:</strong> ${nl(c.direccion_victima)},</p>
    <p>Link del proceso</p>
    <p class="ov-linea">&nbsp;</p>
    <p>Link de la audiencia</p>
    <p class="ov-linea">&nbsp;</p>
    <p>Reciba un cordial saludo,</p>
    <p class="ov-firma"><strong>JACKELINE JARAMILLO MUÑOZ</strong><br>
    Secretaria<br>
    Celular 3177576120 - 3105585114<br>
    Correo electrónico j01pcesptumaco@cendoj.ramajudicial.gov.co</p>
  `.replace(/^\s+/gm, '').trim()
}

function cuerpoRecordatorio(campos) {
  const c = campos
  return `
    <p class="ov-just">Buen día, la presente para recordarle la audiencia de ${nl(c.audiencia)} programada para el día ${nl(c.fecha_audiencia)} a partir de las ${nl(c.hora)} en el proceso ${nl(c.radicado_no)}, seguido en contra de ${nl(c.procesado_s)}, por el delito de ${nl(c.delitos_en_concurso)}, la cual fue notificada mediante orden verbal ${nl(c.no_orden_verbal)} del ${nl(c.fecha_orden_verbal)} y se realizará de forma virtual a través de Teams si la actual situación de virtualidad sigue igual, de lo contrario se realizará en la Sala de Audiencias del Juzgado en la ciudad de Tumaco.</p>
    <p>&nbsp;</p>
    <p class="ov-just">Si están interesados en sostener un dialogo entre Fiscalía y defensa técnica y material, lo hagan con anticipación y solicitarles se conecten de manera puntual. Gracias.</p>
    <p>&nbsp;</p>
    <p><strong>OBSERVACIONES:</strong> Por orden verbal del señor Juez le solicitamos <strong>SE INFORME INMEDIATAMENTE SI EXISTE CAMBIO EN FISCAL, DEFENSOR, VICTIMA, LUGAR DE UBICACIÓN DE LOS PROCESADOS.</strong></p>
    <p>&nbsp;</p>
    <p class="ov-just">Se envía link del proceso para su información y fines pertinentes</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p class="ov-just">Antes de la hora fijada de la diligencia por favor unirse al siguiente LINK: </p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p class="ov-just">Reciba un cordial saludo, </p>
    <p>&nbsp;</p>
    <p>JACKELINE JARAMILLO MUÑOZ </p>
    <p>Oficial Mayor </p>
    <p>Juzgado Primero Penal del Circuito Especializado de Tumaco</p>
    <p>Celular 3177576120 - 3105585114</p>
    <p>Correo electrónico j01pcesptumaco@cendoj.ramajudicial.gov.co</p>
  `.replace(/^\s+/gm, '').trim()
}

function cuerpoActa(campos, opciones) {
  const c = campos
  const op = opciones || {}
  const resultado = normalizarResultado(op.resultado)
  return `
    <p class="ov-just">Acta No. ${campoManual(op.no_acta, 'no_acta')}, el día ${nl(c.fecha_audiencia)} a las ${nl(c.hora)}, se <span class="ov-resultado">${nl(resultado)}</span> la audiencia de ${nl(c.audiencia)}&nbsp; en el proceso ${nl(c.radicado_no)}, seguido en contra de ${nl(c.procesado_s)}, por el delito de ${nl(c.delitos_en_concurso)}, en la cual se realizó: </p>
    <p>&nbsp;</p>
    <p class="ov-just">${campoManual(op.realizado, 'realizado')}</p>
    <p>&nbsp;</p>
    <p class="ov-just">Y se fijo como fecha y hora para la audiencia ${campoManual(op.prox_audiencia, 'prox_audiencia')} el día ${campoManual(op.prox_fecha, 'prox_fecha')} a las ${campoManual(op.prox_hora, 'prox_hora')}, la cual fue notificada en estrados.</p>
    <p>&nbsp;</p>
    <p class="ov-just">No se presentaron cambios en las partes.</p>
  `.replace(/^\s+/gm, '').trim()
}

const ESTILOS_OFICIO = `
  .ov-papel { font-family: "Times New Roman", Times, serif; font-size: 16px; line-height: 1.55; color: #111; }
  .ov-titulo { text-align: center; font-weight: 700; font-size: 18px; margin: 0 0 28px; letter-spacing: 0.03em; }
  .ov-just { text-align: justify; }
  .ov-papel p { margin: 0 0 16px; }
  .ov-linea { border-bottom: 1px solid #333; min-height: 22px; margin: 0 0 18px; }
  .ov-firma { margin-top: 28px; }
  .ov-resultado { font-weight: 700; }
  .ov-manual { display: inline-block; min-width: 110px; border-bottom: 1px solid #333; padding: 0 4px; outline: none; }
  .ov-manual:focus { background: #fff9d6; border-bottom-color: #123f6d; }
`

function cuerpoPorTipo(campos, tipo, opciones) {
  if (tipo === 'recordatorio') return cuerpoRecordatorio(campos)
  if (tipo === 'acta') return cuerpoActa(campos, opciones)
  return cuerpoOficio(campos)
}

function htmlVistaPrevia(campos, tipo, opciones) {
  return `<div class="ov-papel">${cuerpoPorTipo(campos, normalizarTipo(tipo), opciones)}</div>`
}

const PREFIJOS_ARCHIVO = {
  orden: 'orden-verbal',
  recordatorio: 'recordatorio-audiencia',
  acta: 'reporte-audiencias'
}

function nombreArchivo(campos, id, tipo) {
  const t = normalizarTipo(tipo)
  const prefijo = PREFIJOS_ARCHIVO[t]
  const base = [prefijo, campos.no_orden_verbal !== 'Pendiente' ? campos.no_orden_verbal : '', campos.radicado_no || campos.radicado || '', id]
    .filter(Boolean)
    .join('-')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)
  return base || prefijo
}

function tituloDocumento(campos, tipo) {
  if (tipo === 'recordatorio') return 'RECORDATORIO DE AUDIENCIA'
  if (tipo === 'acta') return 'REPORTE AUDIENCIAS'
  return 'ORDEN VERBAL No. ' + escHtml(campos.no_orden_verbal)
}

function htmlDocumento(campos, tipo, opciones) {
  const t = normalizarTipo(tipo)
  const titulo = tituloDocumento(campos, t)
  const cuerpo = cuerpoPorTipo(campos, t, opciones)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${titulo}</title>
  <style>
    @page { size: letter; margin: 25mm 22mm; }
    body { margin: 0; background: #ece7dc; }
    ${ESTILOS_OFICIO}
    .ov-toolbar { background: #123f6d; color: #fff; padding: 10px 16px; display: flex; gap: 8px; align-items: center; font-family: "Segoe UI", Arial, sans-serif; }
    .ov-toolbar button { padding: 8px 14px; border: 0; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .ov-wrap { background: #fff; max-width: 720px; margin: 18px auto; padding: 36px 44px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
    @media print {
      body { background: #fff; }
      .ov-toolbar { display: none; }
      .ov-wrap { box-shadow: none; margin: 0; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="ov-toolbar">
    <button type="button" onclick="window.print()">Imprimir</button>
    <span>${titulo}</span>
  </div>
  <div class="ov-wrap ov-papel">${cuerpo}</div>
</body>
</html>`
}

function construirOficio(row, tipo, opciones) {
  const t = normalizarTipo(tipo)
  const campos = extraerCampos(row)
  return {
    id: row.id,
    tipo: t,
    campos,
    html: htmlVistaPrevia(campos, t, opciones),
    documento: htmlDocumento(campos, t, opciones),
    nombre_archivo: nombreArchivo(campos, row.id, t)
  }
}

function construirOrdenVerbal(row, opciones) {
  return construirOficio(row, 'orden', opciones)
}

function construirRecordatorio(row, opciones) {
  return construirOficio(row, 'recordatorio', opciones)
}

function construirActa(row, opciones) {
  return construirOficio(row, 'acta', opciones)
}

function construirDocumento(row, tipo, opciones) {
  return construirOficio(row, tipo, opciones)
}

module.exports = {
  extraerCampos,
  construirOrdenVerbal,
  construirRecordatorio,
  construirActa,
  construirDocumento,
  htmlDocumento,
  htmlVistaPrevia,
  nombreArchivo,
  normalizarTipo,
  normalizarResultado,
  RESULTADOS_ACTA,
  TIPOS_OFICIO
}
