# Auditoría, copias de seguridad y correo

Documentación del módulo administrativo de auditoría inmutable, copias de
seguridad fidedignas y envío automático por correo del
**Gestor de Información - Juzgado Primero Penal del Circuito Especializado de Tumaco**.

## 1. Auditoría

### Qué se registra

Por cada acción relevante el sistema guarda, sin excepción:

- Usuario, rol e identificador de la cuenta.
- Acción realizada (login, logout, crear/editar/eliminar, cambio de clave,
  cambio de permisos, exportaciones, backups, configuración, etc.).
- Módulo afectado e identificador del registro.
- Fecha y hora local.
- Dirección IP y dispositivo (navegador y sistema operativo inferidos).
- Valores anteriores y posteriores del registro (los campos sensibles como
  contraseñas se reemplazan por `***`).
- Resultado: exitoso o fallido, con el mensaje de error cuando aplica.
- Checksum SHA-256 encadenado con el registro anterior.

También se registran los **accesos denegados** (por ejemplo, intentos de
operaciones sin permisos) y los **inicios de sesión fallidos**.

### Inmutabilidad

La tabla `auditoria` tiene disparadores de base de datos que impiden cualquier
`UPDATE` o `DELETE`:

```
La auditoría es inmutable: no se puede modificar.
La auditoría es inmutable: no se puede eliminar.
```

La única escritura permitida es `INSERT`. La integridad de toda la cadena se
puede comprobar en cualquier momento desde la interfaz con el botón
**Verificar integridad de la auditoría** o consultando
`GET /api/auditoria/verificar`.

### Auditoría de la auditoría

La tabla `auditoria_meta` registra las acciones realizadas *sobre* la auditoría
(verificaciones de integridad, exportaciones y atención de alertas), de manera
que también ellas quedan trazadas.

### Alertas de comportamiento anómalo

El sistema analiza el flujo de eventos y genera alertas automáticas, por ejemplo:

- `intentos_fallidos`: 5 o más inicios de sesión fallidos desde la misma IP en
  10 minutos (severidad alta).
- `acceso_denegado_reiterado`: 5 o más accesos denegados del mismo usuario en
  una hora (severidad media).
- `correo_fallido`: fallo en el envío de una copia de seguridad por correo.

Las alertas se muestran en la vista **Auditoría** y pueden marcarse como
atendidas.

### Filtros, búsqueda y exportación

La vista **Auditoría** permite filtrar por texto libre, usuario, acción, módulo,
resultado y rango de fechas, con paginación. La exportación está disponible en:

- CSV (UTF-8 con BOM, separador `;`).
- Excel (`.xlsx` real, OOXML).
- PDF (multipágina, A4 horizontal).

## 2. Copias de seguridad

### Contenido y fidelidad

Cada copia se genera con la API de respaldo en línea de SQLite
(`better-sqlite3`), por lo que incluye **todas las tablas, relaciones, índices,
disparadores y vistas** sin detener el servicio.

### Garantías

- **Checksum SHA-256** del archivo para verificar su integridad.
- **Verificación de integridad** (`PRAGMA integrity_check`) de la copia.
- **Prueba de restauración** automática: la copia se abre, se valida y se
  compara su checksum antes de darse por buena.
- **Cifrado AES-256-GCM** opcional (activado por defecto).
- **Versionado** incremental de cada copia.
- **Almacenamiento redundante**: una segunda copia en
  `data/backups-redundante`.
- **Historial** completo con tamaño, versión, tipo, estado y resultado de la
  restauración.
- **Retención configurable**: se conservan las últimas N copias.

### Acciones disponibles

- Generar copia manual (con cifrado, redundancia y envío por correo opcionales).
- Descargar copia (directa o mediante enlace seguro firmado, válido 72 horas).
- Verificar restauración de una copia o de todas.
- Eliminar copias antiguas.
- Restaurar un archivo `.db` (requiere reiniciar el servicio).
- Exportar la base a **Excel** (libro con hoja de información y una hoja por
  módulo) o a **CSV/ZIP** (un CSV por módulo). Ambas quedan auditadas.

### Ubicación de archivos

```
data/backups/             copias principales
data/backups-redundante/  copias redundantes
data/backups-tmp/         archivos temporales de trabajo
data/outbox/              correos simulados (cuando no hay SMTP)
```

## 3. Programación automática

Desde la pestaña **Programación** de la vista Base de Datos se configura:

- Activar/desactivar copias automáticas.
- Frecuencia: diaria, semanal, mensual o personalizada (cada N horas).
- Hora, día de la semana o día del mes según corresponda.
- Cantidad máxima de copias a conservar.
- Cifrado y almacenamiento redundante.

El planificador revisa cada 30 segundos. Si la hora de hoy ya pasó y aún no
hay ejecución, genera la copia de inmediato (alcance). Si falla, reintenta a
los 15 minutos. El botón **Ejecutar ahora** fuerza una corrida. Cada copia
automática se sella en la bóveda inmutable (`data/vault`) y queda como punto
limpio. Detalle en `docs/RESPALDO-ANTE-INTRUSION.md`.

## 4. Envío por correo

### Configuración

En la pestaña **Correo**:

- Uno o varios destinatarios (separados por coma o punto y coma).
- Asunto personalizable.
- Activar/desactivar el envío.
- Tamaño máximo del adjunto; si la copia lo supera, se envía un **enlace
  seguro** de descarga en lugar del archivo.
- Número de reintentos ante fallos.
- Servidor SMTP: host, puerto, SSL directo, usuario, contraseña, remitente.
  Presets: Outlook (`smtp.office365.com:587`) y Gmail (`smtp.gmail.com:587`).
  En Gmail y Outlook con MFA se exige **contraseña de aplicación**.

La contraseña SMTP nunca se devuelve al navegador (se muestra enmascarada).

### Comportamiento

- El correo incluye un resumen con fecha, tamaño, checksum, estado, cifrado,
  versión y conteo de objetos de la base.
- Si no hay SMTP configurado, el mensaje se guarda en `data/outbox` en formato
  `.eml` (modo simulación) y el envío queda registrado.
- Cada intento se guarda en `correo_envios` y en la auditoría; los fallos
  generan una alerta para el administrador.
- El botón **Enviar correo de prueba** valida la configuración.

## 5. Modelo de datos

| Tabla | Propósito |
| --- | --- |
| `auditoria` | Bitácora inmutable de acciones (solo inserción). |
| `auditoria_meta` | Auditoría de la propia auditoría. |
| `alertas_auditoria` | Alertas de comportamiento anómalo. |
| `backups` | Historial de copias de seguridad. |
| `backup_config` | Programación y parámetros de copias y correo. |
| `email_config` | Configuración del servidor SMTP. |
| `correo_envios` | Historial de envíos por correo. |

## 6. Endpoints principales

```
GET    /api/auditoria                 listar con filtros y paginación
GET    /api/auditoria/opciones        valores distintos para filtros
GET    /api/auditoria/verificar       verificar la cadena de integridad
GET    /api/auditoria/export          exportar (formato=csv|xlsx|pdf)
GET    /api/auditoria/alertas         listar alertas
POST   /api/auditoria/alertas/:id/atender

GET    /api/backups                   copias + configuración + envíos
GET    /api/backups/exportar          exportar la base a Excel/CSV (formato=xlsx|csv)
GET    /api/backups/programador       estado del programador
POST   /api/backups/ejecutar-ahora    forzar la copia programada
POST   /api/backups                   generar copia
GET    /api/vault                     bóveda inmutable y punto limpio
POST   /api/vault/verificar           verificar cadena SHA-256
POST   /api/vault/punto-limpio/:id    marcar punto de restauración limpio
POST   /api/vault/offline             exportar paquete air-gap
PUT    /api/backups/config            guardar programación
GET    /api/backups/:id/descargar     descargar (sesión o enlace firmado)
GET    /api/backups/:id/enlace        generar enlace seguro
POST   /api/backups/:id/verificar     probar restauración
DELETE /api/backups/:id               eliminar copia

GET    /api/correo/config             configuración de correo
PUT    /api/correo/config             guardar configuración
POST   /api/correo/prueba             enviar correo de prueba
GET    /api/correo/envios             historial de envíos
```

Todas las rutas requieren sesión con rol **administrador**.

## 7. Seguridad

- Las contraseñas y campos sensibles nunca se almacenan en la auditoría ni se
  devuelven por la API.
- El cifrado de copias usa una clave derivada (scrypt). En producción defina la
  variable de entorno `BACKUP_KEY` (o `SESSION_SECRET`) con un valor propio.
- Los enlaces de descarga son firmados con HMAC-SHA256 y expiran.
- La auditoría es de solo lectura: no se expone ningún método para modificarla
  o eliminarla.
