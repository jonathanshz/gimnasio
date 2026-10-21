-- GymControl · Esquema de base de datos (MySQL 5.7+ / MariaDB 10.3+)
CREATE DATABASE IF NOT EXISTS gimnasio_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gimnasio_db;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(120) NULL
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE bitacora (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  actor VARCHAR(20) NOT NULL DEFAULT 'staff',
  accion VARCHAR(60) NOT NULL,
  modulo VARCHAR(40) NOT NULL,
  detalle VARCHAR(255) NULL,
  ip VARCHAR(45) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (modulo), INDEX (creado_en)
) ENGINE=InnoDB;

CREATE TABLE socios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_credencial VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  telefono VARCHAR(20) NULL,
  fecha_nacimiento DATE NULL,
  rfc VARCHAR(13) NULL,
  razon_social VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE tipos_membresia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  duracion_dias INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion VARCHAR(150) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE membresias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NOT NULL,
  tipo_membresia_id INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado ENUM('activa','vencida','congelada','cancelada') NOT NULL DEFAULT 'activa',
  congelada_desde DATE NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (socio_id) REFERENCES socios(id),
  FOREIGN KEY (tipo_membresia_id) REFERENCES tipos_membresia(id),
  INDEX (socio_id, estado), INDEX (fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(20) NOT NULL UNIQUE,
  socio_id INT NOT NULL,
  membresia_id INT NULL,
  concepto VARCHAR(150) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo ENUM('efectivo','tarjeta','transferencia') NOT NULL,
  usuario_id INT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (socio_id) REFERENCES socios(id),
  FOREIGN KEY (membresia_id) REFERENCES membresias(id),
  INDEX (creado_en)
) ENGINE=InnoDB;

CREATE TABLE asistencias (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  socio_id INT NULL,
  codigo_leido VARCHAR(40) NOT NULL,
  resultado ENUM('permitido','denegado') NOT NULL,
  motivo VARCHAR(150) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (socio_id, creado_en), INDEX (creado_en)
) ENGINE=InnoDB;

-- Datos iniciales
INSERT INTO roles (nombre, descripcion) VALUES
 ('dueno','Acceso total'), ('administrador','Gestión del gimnasio'),
 ('recepcionista','Caja, socios y acceso'), ('instructor','Consulta de socios');

-- Usuario inicial: admin@gimnasio.com  /  Admin123!   (cámbialo al primer ingreso)
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
 ('Administrador', 'admin@gimnasio.com', '$2b$10$tT/uZCRmLXNGf4zxs.Pnx.RXnYnGyET2OiaeSoh0eBryTFYwEL7tm', 1);

INSERT INTO tipos_membresia (nombre, duracion_dias, precio, descripcion) VALUES
 ('Mensual', 30, 500.00, 'Acceso ilimitado por 30 días'),
 ('Trimestral', 90, 1350.00, 'Acceso ilimitado por 90 días'),
 ('Anual', 365, 4800.00, 'Acceso ilimitado por un año'),
 ('Visita', 1, 80.00, 'Acceso por un día');
