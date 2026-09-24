# GestorInformacion

Gestor institucional del Juzgado Primero Penal del Circuito Especializado de Tumaco (Rama Judicial de Colombia).

Aplicacion web unica (frontend + API) para inventario de procesos, tutelas, apelaciones, Ley 600, disciplinarios, directorios, calendario, oficios, actas, reportes, auditoria inmutable, respaldos cifrados, correo SMTP nativo y programador de copias.

## Stack

- Node.js 20 o 22
- Express 4
- SQLite (`better-sqlite3`) en `data/juzgado.db`
- Sesiones en cookie (`express-session`)
- SMTP propio (`lib/mailer.js`, sin Nodemailer)
- Plantillas DOCX/XLSX en `data/plantillas/`
- Interfaz en `public/` (HTML + CSS + JS, sin bundler)
- Zona horaria: America/Bogota

Puerto: `process.env.PORT` (por defecto 3000). Escucha en `0.0.0.0`.

## Requisitos

- Node.js 20+ (recomendado 22)
- npm
- Python 3, make y g++ solo para compilar `better-sqlite3` en el primer `npm ci`
- Docker opcional

## Instalacion local

```bash
git clone https://github.com/josejjara/GestorInformacion.git
cd GestorInformacion
npm ci
cp .env.example .env
```

Edite `.env` y asigne `SESSION_SECRET` y, si cifra respaldos, `BACKUP_KEY`.

```bash
npm start
```

Abra http://127.0.0.1:3000

Comprobacion:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
curl -sS http://127.0.0.1:3000/api/health
```

`GET /` debe ser HTTP 200. `GET /api/health` debe responder JSON de estado.

## Configuracion de .env

Copie `.env.example` a `.env`. Variables:

| Variable | Obligatorio | Uso |
| --- | --- | --- |
| `PORT` | No | Puerto HTTP. En Render/Railway lo inyecta la plataforma. |
| `NODE_ENV` | Recomendado | `production` o `development` |
| `TZ` | Recomendado | `America/Bogota` |
| `SESSION_SECRET` | Si en produccion | Secreto de cookie de sesion |
| `BACKUP_KEY` | Recomendado | Cifrado de copias. Si se omite se usa `SESSION_SECRET` |
| `PUBLIC_URL` | No | URL publica para enlaces del programador |

El SMTP institucional se configura dentro de la aplicacion (seccion Base de Datos / correo). No se piden claves SMTP en `.env`.

## Comandos

Desarrollo y produccion usan el mismo arranque (no hay bundler):

```bash
npm start
npm run dev
```

Docker:

```bash
docker compose up --build -d
```

El volumen `gestor-data` persiste `data/`. Si el volumen esta vacio, el entrypoint copia `juzgado.db`, `esquema.json` y plantillas desde la imagen.

## Base de datos

Motor: SQLite en `data/juzgado.db`.

- Esquema de negocio (columnas, etiquetas, visibilidad): `data/esquema.json`
- DDL extraido: `data/esquema.sql`
- La aplicacion crea tablas de sistema al arrancar (`calendario`, `usuarios`, `auditoria`, `backups`, `email_config`, etc.) y amplia columnas de inventario si faltan.
- Semilla de calendario: `data/calendario_seed.json`
- Plantillas de oficios y actas: `data/plantillas/`

En produccion (Render/Railway) el disco del plan gratuito es efimero. Monte un disco persistente en `data/` o restaure un respaldo desde el modulo Base de Datos despues del primer arranque.

No se versionan WAL/SHM, `.xlsx` de inventario, `data/backups/`, `data/outbox/` ni `data/vault/` (se regeneran).

## Modulos incluidos

- Login institucional (bloqueo 5 intentos / 60 s, permisos reales en API)
- Inventario: procesos Ley 906, tutelas, apelaciones, Ley 600, disciplinarios
- Directorios: fiscales, defensores, procuradores, victimas, INPEC, Rama Judicial
- Calendario y alertas
- Oficios y actas (constancia, acusacion, preparatoria, auto de pruebas, juicio oral, sentido de fallo, individualizacion de pena, lectura de sentencia, preacuerdo, preclusion, defensor)
- Reportes: consultas, completo, estadistica, fijar fecha (Excel)
- Administracion: usuarios, esquema, auditoria inmutable, respaldos cifrados, programador, SMTP, boveda

## Estructura

```
GestorInformacion/
  server.js
  package.json
  package-lock.json
  Procfile
  Dockerfile
  docker-entrypoint.sh
  docker-compose.yml
  render.yaml
  railway.json
  nixpacks.toml
  .nvmrc
  .env.example
  .gitignore
  .dockerignore
  README.md
  DEPLOY.md
  deploy.sh
  data/
    juzgado.db
    esquema.json
    esquema.sql
    calendario_seed.json
    plantillas/
  lib/
  public/
    index.html
    css/style.css
    js/app.js
  scripts/
  docs/
```

## Despliegue

Guia paso a paso: `DEPLOY.md`.

Resumen: suba este repositorio a GitHub y conectelo a Render o Railway. Start command: `node server.js`. No defina `PORT`. Defina `SESSION_SECRET`, `TZ=America/Bogota` y `NODE_ENV=production`.

## Publicar a GitHub

```bash
chmod +x deploy.sh
./deploy.sh
```

Remoto esperado: `https://github.com/josejjara/GestorInformacion.git`

GitHub ya no acepta la contrasena de la cuenta. Use un Personal Access Token con permiso `repo` cuando `git push` pida clave.
