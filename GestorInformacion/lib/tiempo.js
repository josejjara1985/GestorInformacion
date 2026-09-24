'use strict'

const ZONA = 'America/Bogota'

function pad(n) {
  return String(n).padStart(2, '0')
}

function partesZona(fecha, zona) {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona || ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23'
  })
  const mapa = {}
  for (const p of fmt.formatToParts(d)) mapa[p.type] = p.value
  const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[mapa.weekday] ?? d.getDay()
  return {
    year: Number(mapa.year),
    month: Number(mapa.month),
    day: Number(mapa.day),
    hour: Number(mapa.hour),
    minute: Number(mapa.minute),
    second: Number(mapa.second),
    weekday
  }
}

function fmt(fecha, zona) {
  const p = partesZona(fecha || new Date(), zona)
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

function ahoraLocal() {
  return fmt(new Date())
}

function parseHora(hora) {
  const [h, m] = String(hora || '22:00').split(':').map((n) => Number(n) || 0)
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) }
}

function instanteEnZona(p, h, m, s, zona) {
  const objetivo = `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(h)}:${pad(m)}:${pad(s || 0)}`
  let guess = Date.UTC(p.year, p.month - 1, p.day, h + 5, m, s || 0)
  for (let i = 0; i < 4; i++) {
    const actual = fmt(new Date(guess), zona)
    if (actual === objetivo) return new Date(guess)
    const a = partesZona(new Date(guess), zona)
    const deltaMin = ((h * 60 + m) - (a.hour * 60 + a.minute))
    guess += deltaMin * 60 * 1000 + ((s || 0) - a.second) * 1000
  }
  return new Date(guess)
}

function conHora(fecha, hora, zona) {
  const p = partesZona(fecha || new Date(), zona)
  const hm = parseHora(hora)
  return instanteEnZona(p, hm.h, hm.m, 0, zona)
}

function masDias(fecha, dias, zona) {
  const p = partesZona(fecha, zona)
  const utc = Date.UTC(p.year, p.month - 1, p.day + Number(dias || 0), 12, 0, 0)
  return partesZona(new Date(utc), zona)
}

function parseTs(ts) {
  if (!ts) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(ts))
  if (!m) return null
  return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +(m[6] || 0) }
}

module.exports = {
  ZONA,
  pad,
  partesZona,
  fmt,
  ahoraLocal,
  parseHora,
  conHora,
  instanteEnZona,
  masDias,
  parseTs
}
