-- =====================================================================
-- FIT CODE · Esquema MySQL / MariaDB (XAMPP · phpMyAdmin)
-- 1) Importa este archivo.  2) En includes/config.php pon DB_DRIVER = 'mysql'.
-- 3) (Opcional) Datos demo:  php database/semilla.php
-- =====================================================================
CREATE DATABASE IF NOT EXISTS fitcode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitcode;

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  usuario VARCHAR(30) NOT NULL UNIQUE,
  rfc CHAR(13) NOT NULL UNIQUE,
  correo VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('RECEPCION','ADMIN','DUENO') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE codigos_registro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo CHAR(6) NOT NULL,
  generado_por INT NULL,
  usado_por INT NULL,
  creado_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  FOREIGN KEY (generado_por) REFERENCES staff(id)
) ENGINE=InnoDB;

CREATE TABLE socios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(40) NOT NULL UNIQUE,
  correo VARCHAR(160) NOT NULL UNIQUE,
  telefono CHAR(10) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  tipo ENUM('MAYOR','MENOR') NOT NULL,
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
  creado_en DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE socio_documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  tipo ENUM('CERT_MEDICO','ID_OFICIAL','ID_TUTOR','FIRMA') NOT NULL,
  ruta VARCHAR(120) NOT NULL,
  mime VARCHAR(60) NOT NULL,
  creado_en DATETIME NOT NULL,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE planes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL,
  duracion_dias INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion VARCHAR(255),
  beneficios JSON,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE membresias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  plan_id INT NOT NULL,
  inicio DATE NOT NULL,
  vence DATE NOT NULL,
  estado ENUM('ACTIVA','VENCIDA','CANCELADA','PENDIENTE') NOT NULL DEFAULT 'ACTIVA',
  asignada_por INT NULL,
  creado_en DATETIME NOT NULL,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES planes(id),
  FOREIGN KEY (asignada_por) REFERENCES staff(id),
  INDEX ix_memb_socio (socio_id, vence)
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  membresia_id INT NULL,
  folio VARCHAR(20) NOT NULL UNIQUE,
  concepto VARCHAR(120) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(20) NOT NULL,
  fecha DATETIME NOT NULL,
  registrado_por INT NULL,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE,
  FOREIGN KEY (membresia_id) REFERENCES membresias(id),
  FOREIGN KEY (registrado_por) REFERENCES staff(id),
  INDEX ix_pagos_socio (socio_id, fecha)
) ENGINE=InnoDB;

CREATE TABLE solicitudes_cambio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  plan_id INT NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE',
  creado_en DATETIME NOT NULL,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES planes(id)
) ENGINE=InnoDB;

CREATE TABLE asistencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  entrada DATETIME NOT NULL,
  salida DATETIME NULL,
  registrado_por INT NULL,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES staff(id),
  INDEX ix_asist_socio (socio_id, entrada)
) ENGINE=InnoDB;

CREATE TABLE maquinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  zona VARCHAR(40) NOT NULL,
  estado ENUM('LIBRE','OCUPADA','MANTENIMIENTO') NOT NULL DEFAULT 'LIBRE',
  actualizado_en DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE mediciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  fecha DATE NOT NULL,
  peso DECIMAL(5,1), grasa_corporal DECIMAL(4,1), imc DECIMAL(4,1),
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rutinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  entrenador VARCHAR(120) NOT NULL,
  vigente_desde DATE NOT NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  notas_privadas TEXT,
  FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rutina_ejercicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rutina_id INT NOT NULL,
  dia VARCHAR(15) NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  nombre VARCHAR(120) NOT NULL,
  series INT, repeticiones INT, descanso VARCHAR(10),
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE login_intentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identificador VARCHAR(180) NOT NULL,
  ip VARCHAR(45),
  exito TINYINT(1) NOT NULL,
  creado_en DATETIME NOT NULL,
  INDEX ix_intentos (identificador, creado_en)
) ENGINE=InnoDB;
