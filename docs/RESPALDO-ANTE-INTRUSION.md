# Estrategia de respaldo y recuperación ante intrusión

Gestor de Información — Juzgado Primero Penal del Circuito Especializado de Tumaco.

## 1. Modelo de amenaza

Un atacante con acceso a la aplicación o al servidor puede:

- Borrar o cifrar la base operativa (`data/juzgado.db`).
- Eliminar copias desde el panel (solo afectan el historial operativo).
- Alterar programación, SMTP o usuarios.

No debe poder borrar ni modificar las copias **selladas** en la bóveda ni un paquete **offline** que ya salió del servidor.

## 2. Capas de respaldo

| Capa | Dónde | Qué garantiza |
| --- | --- | --- |
| Operativa | `data/backups/` | Historial reciente, cifrado AES-256-GCM, checksum, prueba de restauración. Se puede depurar. |
| Redundante | `data/backups-redundante/` | Segunda copia local del mismo archivo. |
| Bóveda inmutable | `data/vault/copias/` | Archivos de solo lectura, hash SHA-256, cadena encadenada, manifiesto. El panel no puede borrarlas. |
| Punto limpio | `data/vault/punto-limpio/` | Última copia automática verificada, lista para restaurar. |
| Offline / air-gap | `data/vault/offline/` + USB | Paquete exportado para sacar de la red. |

Cada copia sellada tiene sidecar `.sha256` y un eslabón en `data/vault/CADENA.sha256`. Si un hacker altera un byte, `verificar-boveda.js` lo detecta.

## 3. Programación automática

El programador:

- Revisa cada 30 segundos al estar el servicio en marcha.
- Si la hora de hoy ya pasó y no hay `ultimo_ejecutado` de ese slot, **ejecuta de inmediato** (alcance).
- Si falla, reintenta a los 15 minutos (no salta al día siguiente).
- Cada copia automática se sella en la bóveda y se marca como punto limpio.
- Puede forzarse con **Ejecutar ahora** en Base de Datos → Programación.

## 4. Verificación de integridad

- `PRAGMA integrity_check` sobre la copia restaurada en temporal.
- SHA-256 del archivo plano, guardado en el historial y en la bóveda.
- Cadena HMAC-estilizada (hash encadenado) de todas las copias selladas.

```
node scripts/verificar-boveda.js
```

Salida esperada: `Cadena: INTEGRA`.

## 5. Paquete offline (air-gap)

```
node scripts/exportar-offline.js
```

Copia `data/vault/offline/export-...` a un USB o disco externo. Desconéctelo. Ese medio es el respaldo que un ransomware en el servidor no puede tocar.

## 6. Plan de recuperación (paso a paso)

1. **Aislar.** Detenga el Gestor. No use `data/juzgado.db` si hay sospecha de intrusión.
2. **Verificar.** `node scripts/verificar-boveda.js`
3. **Elegir punto limpio** anterior al ataque (fecha/hora anterior al incidente).
   `node scripts/recuperar.js --listar`
4. **Restaurar.**
   `node scripts/recuperar.js --punto-limpio`
   o
   `node scripts/recuperar.js --archivo data/vault/copias/NOMBRE.db.enc`
5. El script mueve la base actual a `data/cuarentena-...`, descifra, verifica integrity_check y checksum, y escribe `data/juzgado.db`.
6. **Reiniciar** el servidor.
7. **Rotar secretos:** clave de administrador, contraseña SMTP / de aplicación, `BACKUP_KEY` / `SESSION_SECRET`.
8. Revisar auditoría (`vista Auditoría`) y usuarios.

Si la cadena está rota y aun así debe restaurar: `--forzar` (último recurso).

## 7. Qué no hace esta estrategia

- No sustituye un backup fuera de sitio (nube institucional o cinta).
- Un root en el mismo disco puede forzar el borrado de la bóveda; por eso el USB offline es obligatorio.
- No reescribe historial de auditoría (es inmutable por triggers SQLite).
