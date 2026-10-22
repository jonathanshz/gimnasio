-- =====================================================================
-- FIT CODE · Esquema MySQL 
-- =====================================================================
CREATE DATABASE IF NOT EXISTS fitcode CHARACTER
SET
  utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fitcode;

-- ---------------------------------------------------------------------
-- Personal. `usuario` es el NÚMERO DE EMPLEADO (REC-0001, COA-0001, ADM-0001, DUE-0001).
-- Estado de la cuenta:  pendiente = activo 0 y aprobado_en NULL · activo = activo 1 · inactivo = activo 0 y aprobado_en con fecha.
-- ---------------------------------------------------------------------
CREATE TABLE
  staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    usuario VARCHAR(30) NOT NULL UNIQUE,
    rfc CHAR(13) NOT NULL UNIQUE,
    correo VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM ('RECEPCION', 'COACH', 'ADMIN', 'DUENO') NOT NULL, 
    activo TINYINT (1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL,
    telefono CHAR(10) NULL,
    tel_emergencia CHAR(10) NULL, 
    fecha_nacimiento DATE NULL, 
    servicio_medico VARCHAR(60) NULL, 
    enfermedad_cronica VARCHAR(80) NULL, 
    enfermedad_otra VARCHAR(120) NULL, 
    correo_verificado_en DATETIME NULL, 
    aprobado_en DATETIME NULL, 
    aprobado_por INT NULL,
    ultimo_acceso DATETIME NULL,
    FOREIGN KEY (aprobado_por) REFERENCES staff (id)
  ) ENGINE = InnoDB;

CREATE TABLE
  socios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(40) NOT NULL UNIQUE,
    correo VARCHAR(160) NOT NULL UNIQUE,
    telefono CHAR(10) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tipo ENUM ('MAYOR', 'MENOR') NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    apellido_paterno VARCHAR(60) NOT NULL,
    apellido_materno VARCHAR(60) NOT NULL,
    edad TINYINT UNSIGNED NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(30) NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    tel_contacto CHAR(10) NOT NULL,
    tel_emergencia CHAR(10) NOT NULL,
    servicio_medico VARCHAR(60) NOT NULL,
    enfermedad_cronica VARCHAR(80) NOT NULL DEFAULT 'NINGUNA',
    enfermedad_otra VARCHAR(120) NULL,
    tutor_nombre VARCHAR(120) NULL,
    codigo_barras CHAR(11) NULL UNIQUE,
    codigo_registro CHAR(6) NULL,
    fecha_ingreso DATE NOT NULL,
    creado_en DATETIME NOT NULL,
    correo_verificado_en DATETIME NULL, 
    activo TINYINT (1) NOT NULL DEFAULT 1 
  ) ENGINE = InnoDB;

-- Códigos de 6 dígitos que entrega recepción para que el socio se registre.
CREATE TABLE
  codigos_registro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo CHAR(6) NOT NULL,
    generado_por INT NULL,
    usado_por INT NULL,
    creado_en DATETIME NOT NULL,
    usado_en DATETIME NULL,
    expira_en DATETIME NOT NULL,
    FOREIGN KEY (generado_por) REFERENCES staff (id),
    FOREIGN KEY (usado_por) REFERENCES socios (id), 
    INDEX ix_codigo (codigo) 
  ) ENGINE = InnoDB;

CREATE TABLE
  registro_pendiente (
    codigo_id INT PRIMARY KEY,
    tipo ENUM ('MAYOR', 'MENOR') NULL,
    datos LONGTEXT NULL,
    docs LONGTEXT NULL,
    actualizado_en DATETIME NOT NULL,
    FOREIGN KEY (codigo_id) REFERENCES codigos_registro (id) ON DELETE CASCADE
  ) ENGINE = InnoDB;

CREATE TABLE
  socio_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    tipo ENUM ('CERT_MEDICO', 'ID_OFICIAL', 'ID_TUTOR', 'FIRMA') NOT NULL,
    ruta VARCHAR(120) NOT NULL,
    mime VARCHAR(60) NOT NULL,
    creado_en DATETIME NOT NULL,
    nombre_original VARCHAR(120) NULL, 
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE
  ) ENGINE = InnoDB;

-- Documentos del personal que se registra (identificación, constancia médica de coach, firma).
CREATE TABLE
  staff_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    tipo ENUM ('ID_OFICIAL', 'CERT_MEDICO', 'FIRMA') NOT NULL,
    ruta VARCHAR(120) NOT NULL,
    mime VARCHAR(60) NOT NULL,
    nombre_original VARCHAR(120) NULL,
    creado_en DATETIME NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE
  ) ENGINE = InnoDB;

-- Códigos de 6 dígitos enviados al correo para verificarlo (socios y personal).
CREATE TABLE
  verificaciones_correo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta ENUM ('SOCIO', 'STAFF') NOT NULL,
    cuenta_id INT NOT NULL,
    correo VARCHAR(160) NOT NULL,
    codigo_hash CHAR(64) NOT NULL,
    intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL,
    expira_en DATETIME NOT NULL,
    verificado_en DATETIME NULL,
    invalidado_en DATETIME NULL,
    INDEX ix_verif (cuenta, cuenta_id, creado_en)
  ) ENGINE = InnoDB;

CREATE TABLE
  planes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL,
    duracion_dias INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    descripcion VARCHAR(255),
    beneficios JSON,
    activo TINYINT (1) NOT NULL DEFAULT 1
  ) ENGINE = InnoDB;

CREATE TABLE
  membresias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    plan_id INT NOT NULL,
    inicio DATE NOT NULL,
    vence DATE NOT NULL,
    estado ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA', 'PENDIENTE') NOT NULL DEFAULT 'ACTIVA',
    asignada_por INT NULL,
    creado_en DATETIME NOT NULL,
    precio_aplicado DECIMAL(10, 2) NOT NULL DEFAULT 0, 
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES planes (id),
    FOREIGN KEY (asignada_por) REFERENCES staff (id),
    INDEX ix_memb_socio (socio_id, vence)
  ) ENGINE = InnoDB;

CREATE TABLE
  pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    membresia_id INT NULL,
    folio VARCHAR(20) NOT NULL UNIQUE,
    concepto VARCHAR(120) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    metodo VARCHAR(20) NOT NULL, -- efectivo · tarjeta (terminal) · mercadopago (en línea) · transferencia
    fecha DATETIME NOT NULL,
    registrado_por INT NULL, -- NULL = pago en línea
    plan_id INT NULL, -- [NUEVO]
    referencia_pago VARCHAR(12) NULL, -- referencia de la ficha de efectivo que se liquidó
    tarjeta_marca VARCHAR(12) NULL, -- solo marca y últimos 4: NUNCA el número completo
    tarjeta_ultimos4 CHAR(4) NULL, 
    referencia_externa VARCHAR(40) NULL, -- folio de la pasarela (Mercado Pago)
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (membresia_id) REFERENCES membresias (id),
    FOREIGN KEY (registrado_por) REFERENCES staff (id),
    FOREIGN KEY (plan_id) REFERENCES planes (id),
    INDEX ix_pagos_socio (socio_id, fecha)
  ) ENGINE = InnoDB;

-- Intentos de pago en línea (Mercado Pago). Solo cuando el pago se aprueba se crea el registro real en `pagos`
-- y la membresía; los pendientes y rechazados nunca llegan a `pagos`, así que no afectan el corte de caja.
CREATE TABLE
  IF NOT EXISTS pagos_en_linea (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(30) NOT NULL UNIQUE, -- OLyymmdd + 6 hex; es la external_reference en Mercado Pago
    socio_id INT NOT NULL,
    plan_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL, -- precio del catálogo al momento de iniciar (nunca viene del navegador)
    estado VARCHAR(15) NOT NULL DEFAULT 'pendiente', -- pendiente · pagado · rechazado · revision · error
    mp_preference_id VARCHAR(80) NULL,
    mp_payment_id BIGINT UNSIGNED NULL,
    pago_id INT NULL, -- se llena cuando se aprueba (pagos.id)
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NULL,
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES planes (id),
    FOREIGN KEY (pago_id) REFERENCES pagos (id) ON DELETE SET NULL,
    UNIQUE KEY uq_pol_mp_payment (mp_payment_id),
    INDEX ix_pol_socio (socio_id, estado)
  ) ENGINE = InnoDB;

-- Se usa como FICHA DE PAGO EN EFECTIVO: el socio solicita un plan, recibe una referencia y paga en recepción.
-- Al cobrarla se crea el pago + la membresía y la ficha pasa a PAGADA.
CREATE TABLE
  solicitudes_cambio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    plan_id INT NOT NULL,
    estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE · PAGADA · CANCELADA · EXPIRADA
    creado_en DATETIME NOT NULL,
    referencia VARCHAR(12) NOT NULL, -- EF-XXXXXXXX
    monto DECIMAL(10, 2) NOT NULL, -- precio congelado al generar la ficha
    expira_en DATETIME NOT NULL, -- 72 h
    pago_id INT NULL, -- pago generado al cobrarla
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES planes (id),
    FOREIGN KEY (pago_id) REFERENCES pagos (id),
    UNIQUE KEY uq_referencia (referencia)
  ) ENGINE = InnoDB;

-- Visitas: una fila por entrada; la salida se llena al escanear de nuevo.
CREATE TABLE
  asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    entrada DATETIME NOT NULL,
    salida DATETIME NULL,
    registrado_por INT NULL,
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES staff (id),
    INDEX ix_asist_socio (socio_id, entrada)
  ) ENGINE = InnoDB;

-- Bitácora de acceso: TODAS las lecturas del lector, incluidas las rechazadas.
CREATE TABLE
  accesos_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NULL,
    codigo_leido VARCHAR(30) NOT NULL,
    resultado ENUM (
      'PERMITIDO',
      'CODIGO_INVALIDO',
      'SIN_MEMBRESIA',
      'MEMBRESIA_VENCIDA'
    ) NOT NULL,
    motivo VARCHAR(160) NULL,
    movimiento ENUM ('ENTRADA', 'SALIDA') NULL,
    registrado_por INT NULL,
    creado_en DATETIME NOT NULL,
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE SET NULL,
    FOREIGN KEY (registrado_por) REFERENCES staff (id),
    INDEX ix_accesos_fecha (creado_en)
  ) ENGINE = InnoDB;

CREATE TABLE
  maquinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    zona VARCHAR(40) NOT NULL,
    estado ENUM ('LIBRE', 'OCUPADA', 'MANTENIMIENTO') NOT NULL DEFAULT 'LIBRE',
    actualizado_en DATETIME NULL
  ) ENGINE = InnoDB;

-- Objetivo y nivel del socio (pantalla “Avance, rutina y nutrición”).
CREATE TABLE
  expedientes (
    socio_id INT PRIMARY KEY,
    objetivo ENUM (
      'perder_grasa',
      'ganar_musculo',
      'recomposicion',
      'fuerza',
      'resistencia',
      'salud'
    ) NULL,
    nivel ENUM ('principiante', 'intermedio', 'avanzado') NULL,
    dias_entrenamiento TINYINT UNSIGNED NULL,
    actualizado_por INT NULL,
    actualizado_en DATETIME NOT NULL,
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (actualizado_por) REFERENCES staff (id)
  ) ENGINE = InnoDB;

CREATE TABLE
  mediciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    fecha DATE NOT NULL,
    peso DECIMAL(5, 1),
    grasa_corporal DECIMAL(4, 1),
    imc DECIMAL(4, 1),
    estatura DECIMAL(4, 1) NULL, -- cm
    masa_muscular DECIMAL(4, 1) NULL, -- % muscular
    registrado_por INT NULL, -- NULL = lo capturó el propio socio
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES staff (id)
  ) ENGINE = InnoDB;

CREATE TABLE
  rutinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    entrenador VARCHAR(120) NOT NULL,
    vigente_desde DATE NOT NULL,
    activa TINYINT (1) NOT NULL DEFAULT 1,
    notas_privadas TEXT,
    objetivo VARCHAR(20) NULL,
    nivel VARCHAR(12) NULL,
    dias_semana TINYINT UNSIGNED NULL, 
    coach_id INT NULL,
    vigente_hasta DATE NULL,
    FOREIGN KEY (socio_id) REFERENCES socios (id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES staff (id)
  ) ENGINE = InnoDB;

CREATE TABLE
  rutina_ejercicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rutina_id INT NOT NULL,
    dia VARCHAR(15) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    nombre VARCHAR(120) NOT NULL,
    series INT,
    repeticiones VARCHAR(12),
    descanso VARCHAR(10), -- repeticiones ahora es texto ("8-10", "30-45 s")
    dia_numero TINYINT UNSIGNED NOT NULL DEFAULT 1, -- [NUEVO]
    enfoque VARCHAR(60) NULL, -- "Tren superior · Empuje"
    FOREIGN KEY (rutina_id) REFERENCES rutinas (id) ON DELETE CASCADE
  ) ENGINE = InnoDB;

CREATE TABLE
  login_intentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identificador VARCHAR(180) NOT NULL,
    ip VARCHAR(45),
    exito TINYINT (1) NOT NULL,
    creado_en DATETIME NOT NULL,
    INDEX ix_intentos (identificador, creado_en)
  ) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- DATOS INICIALES (necesarios para operar)
-- ---------------------------------------------------------------------
-- Catálogo de planes
INSERT INTO
  planes (
    clave,
    nombre,
    duracion_dias,
    precio,
    descripcion,
    beneficios
  )
VALUES
  (
    'VISITA',
    'Visita',
    1,
    80.00,
    'Acceso por un día.',
    '["Acceso a piso de pesas","Regaderas"]'
  ),
  (
    'MENSUAL',
    'Mensual',
    30,
    549.00,
    'El plan base para entrenar todo el mes.',
    '["Acceso ilimitado","Evaluación inicial","App FIT CODE"]'
  ),
  (
    'TRIMESTRAL',
    'Trimestral',
    90,
    1499.00,
    'Tres meses con precio preferente.',
    '["Todo lo del Mensual","1 rutina personalizada","Medición mensual"]'
  ),
  (
    'ANUAL',
    'Anual',
    365,
    5490.00,
    'Doce meses al mejor precio.',
    '["Todo lo del Trimestral","Clases grupales","Casillero fijo","2 pases de invitado al mes"]'
  ),
  (
    'ESTUDIANTE',
    'Estudiante',
    30,
    399.00,
    'Mensual con credencial vigente.',
    '["Acceso L–V 6:00–16:00","App FIT CODE"]'
  );

-- Máquinas
INSERT INTO
  maquinas (nombre, zona, estado, actualizado_en)
VALUES
  ('Caminadora 01', 'Cardio', 'LIBRE', NOW()),
  ('Caminadora 02', 'Cardio', 'LIBRE', NOW()),
  ('Caminadora 03', 'Cardio', 'LIBRE', NOW()),
  ('Elíptica 01', 'Cardio', 'LIBRE', NOW()),
  ('Bicicleta fija 01', 'Cardio', 'LIBRE', NOW()),
  ('Remo 01', 'Cardio', 'LIBRE', NOW()),
  ('Rack de sentadilla 01', 'Pesas libres', 'LIBRE', NOW()),
  ('Rack de sentadilla 02', 'Pesas libres', 'LIBRE', NOW()),
  ('Banco plano 01', 'Pesas libres', 'LIBRE', NOW()),
  ('Banco inclinado 01', 'Pesas libres', 'LIBRE', NOW()),
  ('Prensa de pierna', 'Máquinas', 'LIBRE', NOW()),
  ('Polea alta', 'Máquinas', 'LIBRE', NOW()),
  ('Extensión de pierna', 'Máquinas', 'LIBRE', NOW()),
  ('Smith', 'Máquinas', 'LIBRE', NOW()),
  ('Peck deck', 'Máquinas', 'LIBRE', NOW()),
  ('Remo sentado', 'Máquinas', 'LIBRE', NOW());

-- Cuenta del DUEÑO (la única que no se registra desde la web). Entra en  app/  -> pestaña “Administración”
--   Número de empleado: DUE-0001 · correo: dueno@fitcode.mx · contraseña: Dueno#2026  
INSERT INTO
  staff (
    nombre,
    usuario,
    rfc,
    correo,
    password_hash,
    rol,
    activo,
    creado_en,
    telefono,
    correo_verificado_en,
    aprobado_en
  )
VALUES
  (
    'ROBERTO MÉNDEZ SALAS',
    'DUE-0001',
    'MESR800101',
    'dueno@fitcode.mx',
    '$2y$10$rDBgR/2WxIilB8WMz8gMduzpWckrdwO0/w6N04Xu/cKx04Mg0FXtq',
    'DUENO',
    1,
    NOW(),
    '5550000000',
    NOW(),
    NOW()
  );