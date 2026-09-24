# Despliegue de GestorInformacion

Servidor Node.js (`server.js`) en `0.0.0.0` y `process.env.PORT`. Health: `GET /api/health`. Interfaz: `GET /`.

Repositorio: `https://github.com/josejjara/GestorInformacion.git`

## 1. Subir a GitHub

En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Deploy inicial"
git branch -M main
git remote add origin https://github.com/josejjara/GestorInformacion.git
git push -u origin main
```

O ejecute `./deploy.sh`.

Cree antes el repositorio vacio `GestorInformacion` en GitHub (sin README). Autentiquese con un Personal Access Token (`repo`), no con la contrasena de la cuenta.

## 2. Render

1. https://dashboard.render.com — inicie sesion con GitHub.
2. New + Web Service.
3. Conecte `josejjara/GestorInformacion`.
4. Name: `GestorInformacion`
5. Branch: `main`
6. Runtime: Node
7. Build Command: `npm ci`
8. Start Command: `node server.js`
9. Instance: Free
10. Health Check Path: `/api/health`
11. Environment:
    - `NODE_ENV` = `production`
    - `TZ` = `America/Bogota`
    - `SESSION_SECRET` = Generate
    - `BACKUP_KEY` = Generate
    - No defina `PORT`
12. Create Web Service.

Si `better-sqlite3` falla al compilar, cambie Runtime a Docker (Dockerfile en la raiz). El `Dockerfile` instala python3/make/g++ y copia `juzgado.db` y plantillas.

Disco persistente (recomendado para no perder SQLite al redeploy):

- Mount path: `/opt/render/project/src/data`
- Size: 1 GB o mas

Comprobacion: `curl -sS -o /dev/null -w '%{http_code}\n' https://<servicio>.onrender.com/` debe imprimir `200`.

El plan Free se duerme sin trafico; el primer acceso puede tardar.

## 3. Railway

1. https://railway.app — inicie sesion con GitHub.
2. New Project — Deploy from GitHub repo — `GestorInformacion`.
3. Start Command: `node server.js`
4. Builder: Nixpacks (`nixpacks.toml` instala python3/make/g++) o Dockerfile.
5. Variables:
    - `NODE_ENV` = `production`
    - `TZ` = `America/Bogota`
    - `SESSION_SECRET` = secreto largo
    - `BACKUP_KEY` = secreto largo
    - No defina `PORT`
6. Settings — Networking — Generate Domain.

Volumen persistente:

- New — Volume
- Mount: `/app/data` con Dockerfile, o `data` con Nixpacks.

## 4. Docker en VPS

```bash
cp .env.example .env
docker compose up --build -d
```

Puerto 3000. Ponga HTTPS (Caddy/Nginx) delante. El volumen `gestor-data` conserva la base.

## 5. Restaurar datos del Juzgado

El repositorio incluye `data/juzgado.db` (inventario y usuarios actuales). En un volumen vacio, el entrypoint Docker copia esa base la primera vez.

Respaldo posterior: modulo Base de Datos — copias cifradas y restauracion. No borre `data/esquema.json` ni `data/plantillas/`.

## 6. Fallos frecuentes

- 502: el proceso no arranco. Revise logs de `better-sqlite3` y que `SESSION_SECRET` exista.
- 521 en preview de MonkeyCode: fallo del tunel de la plataforma, no de esta aplicacion.
- Login no entra: usuarios van en `juzgado.db`. Si arranco con base vacia, cree el administrador en el modulo Usuarios tras restaurar un respaldo.
