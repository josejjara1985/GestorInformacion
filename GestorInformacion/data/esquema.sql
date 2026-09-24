CREATE INDEX idx_alertas_fecha ON alertas_auditoria(fecha);

CREATE INDEX idx_apelaciones_fecha ON apelaciones(fecha_ingreso);

CREATE INDEX idx_apelaciones_fecha_ingreso ON apelaciones(fecha_ingreso);

CREATE INDEX idx_auditoria_accion ON auditoria(accion);

CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);

CREATE INDEX idx_auditoria_modulo ON auditoria(modulo);

CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);

CREATE INDEX idx_backups_fecha ON backups(fecha);

CREATE INDEX idx_cal_fecha ON calendario(fecha);

CREATE INDEX idx_cal_modulo ON calendario(modulo, registro_id);

CREATE INDEX idx_calendario_fecha ON calendario(fecha);

CREATE INDEX idx_calendario_modulo_reg ON calendario(modulo, registro_id);

CREATE INDEX idx_correo_envios_fecha ON correo_envios(fecha);

CREATE INDEX idx_disciplinarios_fecha_ingreso ON disciplinarios(fecha_ingreso);

CREATE INDEX idx_ley600_fecha_ingreso ON ley600(fecha_de_ingreso);

CREATE INDEX idx_ley600_radicado ON ley600(radicado);

CREATE INDEX idx_password_historial_usuario ON password_historial(usuario_id);

CREATE INDEX idx_procesos_codigo ON procesos(codigo_interno);

CREATE INDEX idx_procesos_fecha_audiencia ON procesos(fecha_audiencia);

CREATE INDEX idx_procesos_fecha_ingreso ON procesos(fecha_ingreso);

CREATE INDEX idx_procesos_juzgado ON procesos(juzgado);

CREATE INDEX idx_procesos_radicado ON procesos(radicado);

CREATE INDEX idx_tutelas_fecha ON tutelas(fecha_ingreso);

CREATE INDEX idx_tutelas_fecha_ingreso ON tutelas(fecha_ingreso);

CREATE INDEX idx_tutelas_radicado ON tutelas(radicado_interno_consecutivo_juzgado);

CREATE INDEX idx_usuarios_username ON usuarios(username);

CREATE TABLE alertas_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      tipo TEXT NOT NULL,
      severidad TEXT NOT NULL DEFAULT 'media',
      descripcion TEXT,
      usuario TEXT,
      ip TEXT,
      detalle TEXT,
      atendida INTEGER NOT NULL DEFAULT 0
    );

CREATE TABLE apelaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sustanciacion TEXT,
    fecha_ingreso TEXT,
    forma_de_ingreso TEXT,
    codigo_interno TEXT,
    matriz TEXT,
    delito_estadistica TEXT,
    procesado_s TEXT,
    c_c TEXT,
    detenido TEXT,
    carcel TEXT,
    direccion_detenido TEXT,
    celular TEXT,
    no_hombres TEXT,
    no_mujeres TEXT,
    juzgado_ejecucion_de_penas TEXT,
    defensor TEXT,
    direccion_defensor TEXT,
    auto_apelado TEXT,
    no_carpetas TEXT,
    no_folios TEXT,
    no_cd TEXT,
    decision TEXT,
    fecha TEXT,
    cumplimiento TEXT,
    devolucion_expediente TEXT,
    spoa TEXT,
    no TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      usuario_id INTEGER,
      usuario TEXT,
      rol TEXT,
      accion TEXT NOT NULL,
      modulo TEXT,
      registro_id TEXT,
      descripcion TEXT,
      antes TEXT,
      despues TEXT,
      ip TEXT,
      dispositivo TEXT,
      user_agent TEXT,
      metodo TEXT,
      ruta TEXT,
      exito INTEGER NOT NULL DEFAULT 1,
      error TEXT,
      checksum TEXT,
      checksum_previo TEXT
    );

CREATE TABLE auditoria_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      usuario TEXT,
      ip TEXT,
      accion TEXT,
      detalle TEXT
    );

CREATE TABLE backup_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activo INTEGER NOT NULL DEFAULT 0,
      frecuencia TEXT NOT NULL DEFAULT 'diaria',
      intervalo_custom_horas INTEGER NOT NULL DEFAULT 24,
      hora TEXT NOT NULL DEFAULT '22:00',
      dia_semana INTEGER NOT NULL DEFAULT 1,
      dia_mes INTEGER NOT NULL DEFAULT 1,
      max_copias INTEGER NOT NULL DEFAULT 30,
      cifrado INTEGER NOT NULL DEFAULT 1,
      redundancia INTEGER NOT NULL DEFAULT 1,
      ruta_redundante TEXT,
      correo_activo INTEGER NOT NULL DEFAULT 0,
      correos TEXT NOT NULL DEFAULT '[]',
      asunto TEXT NOT NULL DEFAULT 'Copia de seguridad - Gestor de Información Juzgado Tumaco',
      adjunto_max_mb INTEGER NOT NULL DEFAULT 20,
      reintentos INTEGER NOT NULL DEFAULT 3,
      ultimo_ejecutado TEXT,
      proximo_ejecutado TEXT,
      actualizado_en TEXT
    );

CREATE TABLE backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      nombre TEXT NOT NULL UNIQUE,
      ruta TEXT NOT NULL,
      ruta_redundante TEXT,
      tamano INTEGER NOT NULL DEFAULT 0,
      checksum TEXT NOT NULL,
      checksum_verificado INTEGER NOT NULL DEFAULT 0,
      cifrado INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      tipo TEXT NOT NULL DEFAULT 'manual',
      estado TEXT NOT NULL DEFAULT 'completo',
      tablas INTEGER NOT NULL DEFAULT 0,
      indices INTEGER NOT NULL DEFAULT 0,
      triggers INTEGER NOT NULL DEFAULT 0,
      vistas INTEGER NOT NULL DEFAULT 0,
      integridad TEXT,
      restauracion_probada INTEGER NOT NULL DEFAULT 0,
      restauracion_detalle TEXT,
      usuario TEXT,
      notas TEXT
    );

CREATE TABLE calendario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT,
      titulo TEXT,
      proceso TEXT,
      tipo_audiencia TEXT,
      responsable TEXT,
      modulo TEXT,
      registro_id INTEGER,
      estado TEXT DEFAULT 'programada',
      notas TEXT,
      alerta INTEGER DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE correo_envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id INTEGER,
      fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      destinatarios TEXT,
      asunto TEXT,
      tamano INTEGER,
      checksum TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      intentos INTEGER NOT NULL DEFAULT 0,
      ultimo_error TEXT,
      resumen TEXT,
      usuario TEXT
    );

CREATE TABLE defensores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      defensa TEXT, direccion TEXT, no_cedula TEXT, no_tarjeta_profesional TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE directorio_victimas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      victima TEXT, notificacion TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE disciplinarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_ingreso TEXT,
    forma_de_ingreso TEXT,
    radicado_interno_consecutivo_juzgado TEXT,
    quejoso_compulsa TEXT,
    disciplinable TEXT,
    indagacion_preliminar_art_150 TEXT,
    investigacion_disciplinaria_art_152_al_160a TEXT,
    pliego_de_cargos_art_161_al_163 TEXT,
    fallo TEXT,
    archivo TEXT,
    observaciones TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE email_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activo INTEGER NOT NULL DEFAULT 0,
      host TEXT NOT NULL DEFAULT '',
      puerto INTEGER NOT NULL DEFAULT 587,
      seguro INTEGER NOT NULL DEFAULT 0,
      requiere_tls INTEGER NOT NULL DEFAULT 1,
      usuario TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      remitente TEXT NOT NULL DEFAULT '',
      remitente_nombre TEXT NOT NULL DEFAULT 'Gestor de Información Juzgado Tumaco',
      actualizado_en TEXT
    );

CREATE TABLE fiscales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal TEXT, direccion TEXT, asistente TEXT, contacto TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE inpec (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_del_resposable TEXT, oficina TEXT, ciudad TEXT, direccion TEXT,
      telefono TEXT, correo_electronico_virtuales TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE ley600 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      radicado TEXT,
    fecha_de_ingreso TEXT,
    procesado_s TEXT,
    direccion_de_notificacion_procesado TEXT,
    fiscalia TEXT,
    direccion_notificacion_fiscal TEXT,
    delito_y_articulo TEXT,
    defensor TEXT,
    direccion_de_notificacion_defensa TEXT,
    inicio_noticia_criminis TEXT,
    apertura_de_instruccion TEXT,
    definicion_situacion_juridica TEXT,
    cierre_de_instruccion TEXT,
    alegatos_quienes_presentaron TEXT,
    resolucion_de_acusacion TEXT,
    notificacion_como_se_hizo TEXT,
    fecha_ejecutoria_res_acusacion TEXT,
    fecha_ingreso_al_juzgado TEXT,
    traslado_art_400 TEXT,
    fecha_aud_preparatoria TEXT,
    fecha_audiencia_publica TEXT,
    sentencia TEXT,
    ultima_actuacion TEXT,
    cuadernos TEXT,
    anotaciones TEXT,
    observacion TEXT,
    juzgado TEXT,
    audiencia TEXT,
    fecha_audiencia TEXT,
    hora TEXT,
    auto_sustanciacion TEXT,
    fecha_orden_verbal TEXT,
    reponsable_expediente_y_audiencias TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE meta_config (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );

CREATE TABLE password_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      password_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE procesos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_ingreso TEXT,
    no_acta_reparto TEXT,
    ingreso TEXT,
    fecha_de_los_hechos TEXT,
    fecha_imputacion TEXT,
    fecha_prescripcion TEXT,
    forma_de_ingreso TEXT,
    reparto_secretaria_audiencia TEXT,
    codigo_interno TEXT,
    matriz TEXT,
    delito_estadistica TEXT,
    delitos_en_concurso TEXT,
    procesado_s TEXT,
    c_c TEXT,
    detenido TEXT,
    carcel TEXT,
    direccion_detenido TEXT,
    celular TEXT,
    no_hombres TEXT,
    no_mujeres TEXT,
    fiscalia TEXT,
    direccion_fiscal TEXT,
    defensor TEXT,
    direccion_defensor TEXT,
    victima TEXT,
    direccion_victima TEXT,
    defensoria_min_publico TEXT,
    direccion_min_publico TEXT,
    caja TEXT,
    no_carpetas TEXT,
    no_folios TEXT,
    no_cd TEXT,
    audiencia TEXT,
    fecha_audiencia TEXT,
    hora TEXT,
    reparto_secretaria_audiencia_2 TEXT,
    no_orden_verbal TEXT,
    fecha_orden_verbal TEXT,
    observacion_orden_verbal TEXT,
    observacion TEXT,
    juzgado TEXT,
    fecha_acusacion TEXT,
    fecha_preparatoria TEXT,
    auto_de_pruebas TEXT,
    fecha_juicio TEXT,
    sentido_del_fallo TEXT,
    fecha_preacuerdo TEXT,
    fecha_individualizacion_447 TEXT,
    fecha_preclusion TEXT,
    n_numero_sentencia_o_auto TEXT,
    pena_meses TEXT,
    sancion_multa_smlv TEXT,
    pago_perjuicios_victima TEXT,
    fecha_ejecutoria_sentencia TEXT,
    fecha_de_sentencia_auto TEXT,
    observaciones_sentencia TEXT,
    a_otros_despachos_por_impedimentos_recusacion_competencia TEXT,
    otras_salidas TEXT,
    fecha_remision TEXT,
    confirma TEXT,
    modifica TEXT,
    revoca TEXT,
    devolucion TEXT,
    no_acta_de_obligaciones TEXT,
    no_boleta_domiciliaria TEXT,
    no_boleta_encarcela TEXT,
    no_boleta_de_libertad TEXT,
    no_orden_de_captura TEXT,
    no_despacho_comisorio_remision_buchely TEXT,
    no_oficio_remite_cobro_coac TEXT,
    fecha_envio_cobro_coactivo TEXT,
    fecha_cumplimiento TEXT,
    fecha_envio_centro_de_servicios TEXT,
    n_numero_oficio TEXT,
    fecha_repato_archivo TEXT,
    encargado TEXT,
    radicado_interno TEXT,
    pena_cumplida TEXT,
    fecha_de_archivo TEXT,
    envio_centro_de_servicios TEXT,
    no_oficio TEXT,
    no_carpetas_2 TEXT,
    no_folios_2 TEXT,
    no_cd_2 TEXT,
    observaciones TEXT,
    infromes_audiencias TEXT,
    sexo TEXT,
    allanamiento TEXT,
    lectura_de_sentencia TEXT,
    tipo_salida TEXT,
    tipo_decision TEXT,
    tipo_boleta TEXT,
    radicado TEXT,
    no TEXT,
    cedula_defensor TEXT,
    tarjeta_defensor TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    , celular_fiscal TEXT, correo_fiscal TEXT, procesados_detalle TEXT);

CREATE TABLE procuradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      procuraduria TEXT, procurador TEXT, correo_institucional TEXT, direccion TEXT,
      celular TEXT, telefono_oficina TEXT, sustanciador TEXT, celular_sustanciador TEXT,
      telefono_oficina_sustanciador TEXT, correo_sustanciador TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE rama_judicial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT, lugar TEXT, direccion TEXT, telefono TEXT, fax TEXT, correo_electronico TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE tutelas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      responable TEXT,
    fecha_ingreso TEXT,
    forma_de_ingreso TEXT,
    no_acta_reparto_centro_servicios TEXT,
    radicado_interno_consecutivo_juzgado TEXT,
    accionante TEXT,
    accionado TEXT,
    derecho_estadistica TEXT,
    derecho_vulnerado TEXT,
    tutela TEXT,
    incidente TEXT,
    habeas_corpus TEXT,
    admision TEXT,
    inadmision TEXT,
    pruebas TEXT,
    sentencia TEXT,
    numero_s TEXT,
    tutela_2 TEXT,
    improcedente TEXT,
    abstiene TEXT,
    niega_o_no_concede TEXT,
    hecho_superado TEXT,
    sanciona TEXT,
    se_va_a_impugnacion_o_consulta TEXT,
    impugnacion_o_consulta TEXT,
    confirma TEXT,
    revoca_o_nulidad TEXT,
    modifica TEXT,
    corte TEXT,
    archivo TEXT,
    otras_salidas TEXT,
    observaciones TEXT,
    presentacion_proyecto TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('administrador', 'usuario', 'consulta')),
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

CREATE TRIGGER trg_auditoria_meta_no_delete
    BEFORE DELETE ON auditoria_meta
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría de auditoría es inmutable.');
    END;

CREATE TRIGGER trg_auditoria_meta_no_update
    BEFORE UPDATE ON auditoria_meta
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría de auditoría es inmutable.');
    END;

CREATE TRIGGER trg_auditoria_no_delete
    BEFORE DELETE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría es inmutable: no se puede eliminar.');
    END;

CREATE TRIGGER trg_auditoria_no_update
    BEFORE UPDATE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'La auditoría es inmutable: no se puede modificar.');
    END;
