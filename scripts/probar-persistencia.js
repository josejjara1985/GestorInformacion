'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const ORIGEN = path.join(ROOT, 'data', 'juzgado.db')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gestor-persist-'))
const destino = path.join(tmp, 'juzgado.db')
fs.copyFileSync(ORIGEN, destino)
fs.copyFileSync(path.join(ROOT, 'data', 'esquema.json'), path.join(tmp, 'esquema.json'))

function runNode(code) {
  const r = spawnSync(process.execPath, ['-e', code], {
    cwd: ROOT,
    env: { ...process.env, DATA_DIR: tmp, NODE_PATH: path.join(ROOT, 'node_modules') },
    encoding: 'utf8'
  })
  process.stdout.write(r.stdout || '')
  process.stderr.write(r.stderr || '')
  if (r.status !== 0) process.exit(r.status || 1)
  return r.stdout
}

runNode(`
  const dbmod = require('./lib/db')
  const db = dbmod.openDb()
  const n = db.prepare('SELECT COUNT(*) AS c FROM procesos').get().c
  const info = db.prepare("INSERT INTO procesos (codigo_interno, radicado, procesado_s, observacion) VALUES (?, ?, ?, ?)")
    .run('TEST-REINICIO', '999999999999', 'PRUEBA REINICIO', 'persistencia')
  dbmod.persistir(db)
  const row = db.prepare('SELECT id, codigo_interno FROM procesos WHERE id = ?').get(Number(info.lastInsertRowid))
  if (!row) { console.error('INSERT no visible'); process.exit(2) }
  console.log('INSERT_OK', row.id, row.codigo_interno, 'prev', n)
  dbmod.closeDb()
`)

runNode(`
  const dbmod = require('./lib/db')
  const db = dbmod.openDb()
  const row = db.prepare("SELECT id, codigo_interno, procesado_s FROM procesos WHERE codigo_interno = 'TEST-REINICIO'").get()
  if (!row) { console.error('PERDIDO_TRAS_REABRIR'); process.exit(3) }
  console.log('REOPEN_OK', row.id, row.codigo_interno)
  db.prepare('DELETE FROM procesos WHERE id = ?').run(row.id)
  dbmod.persistir(db)
  const gone = db.prepare("SELECT id FROM procesos WHERE codigo_interno = 'TEST-REINICIO'").get()
  if (gone) { console.error('NO_LIMPIO'); process.exit(4) }
  const n = db.prepare('SELECT COUNT(*) AS c FROM procesos').get().c
  console.log('CLEAN_OK count', n)
  dbmod.closeDb()
`)

console.log('PERSISTENCIA_OK')
