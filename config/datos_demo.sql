-- =====================================================================
-- FIT CODE · Datos de demostración (OPCIONAL)
-- Importar DESPUÉS de schema.sql y sobre una base recién creada (usa ids fijos 1, 2 y 3 para los socios).
-- Las fechas son relativas a la fecha de importación (CURDATE / NOW), así que siempre se ven vigentes.
--   Personal : ADM-0001 admin@fitcode.mx / Admin#2026 · REC-0001 recepcion@fitcode.mx / Recep#2026 · COA-0001 coach@fitcode.mx / Coach#2026
--   Socios   : ANAPP-150398 (activa) · LUISRM-020901 (vence en 2 días, con ficha de efectivo) · SOFIAHL-110510 (menor, membresía vencida) — contraseña Socio#2026
--   Códigos de registro para probar: 482915 y 731004
-- No cargues este archivo en producción.
-- =====================================================================
USE fitcode;
SET NAMES utf8mb4;

INSERT INTO staff (nombre, usuario, rfc, correo, password_hash, rol, activo, creado_en, telefono, tel_emergencia, fecha_nacimiento, servicio_medico, enfermedad_cronica, correo_verificado_en, aprobado_en) VALUES
('LAURA GÓMEZ TORRES', 'ADM-0001', 'GOTL850101', 'admin@fitcode.mx', '$2y$10$e8o4kE83/JxLAayEq/oD..Y6cA8bkALQGH6BOBDrjAplOKFCOmBRe', 'ADMIN', 1, NOW(), '5551110001', NULL, NULL, NULL, NULL, NOW(), NOW()),
('CARLOS RUIZ SOTO', 'REC-0001', 'RUSC900202', 'recepcion@fitcode.mx', '$2y$10$Rd8PrlPpAGfdZ8CPv7x6G.12Y50mRf4YWYYTAnY84L07SR5BrYmSS', 'RECEPCION', 1, NOW(), '5551110002', NULL, NULL, NULL, NULL, NOW(), NOW()),
('DIEGO HERRERA LUNA', 'COA-0001', 'HELD920303', 'coach@fitcode.mx', '$2y$10$gS/wJW0xb5qiOtdWWRYWzOI1tNYuiGx.brr/RKXkTVk.IsfhU8O.S', 'COACH', 1, NOW(), '5551110003', '5551110099', '1992-03-03', 'IMSS', 'NINGUNA', NOW(), NOW());
SET @adm = (SELECT id FROM staff WHERE usuario = 'ADM-0001');
SET @rec = (SELECT id FROM staff WHERE usuario = 'REC-0001');
SET @coa = (SELECT id FROM staff WHERE usuario = 'COA-0001');
SET @mensual = (SELECT id FROM planes WHERE clave = 'MENSUAL');

INSERT INTO socios (id, usuario, correo, telefono, password_hash, tipo, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento, genero, sexo, tel_contacto, tel_emergencia, servicio_medico, enfermedad_cronica, enfermedad_otra, tutor_nombre, codigo_barras, codigo_registro, fecha_ingreso, creado_en, correo_verificado_en, activo) VALUES
(1,'ANAPP-150398','ana@correo.mx','5512345678','$2y$10$n9KvcB7RbHeuCxfgPMkL1uh5MxZUprj/atIncg9DYsI3by8nICRd2','MAYOR','ANA','PÉREZ','PÉREZ',28,'1998-03-15','FEMENINO','MUJER','5512345678','5598765432','IMSS','NINGUNA',NULL,NULL,'FC260000013',NULL,CURDATE() - INTERVAL 200 DAY,NOW(),NOW(),1),
(2,'LUISRM-020901','luis@correo.mx','5523456789','$2y$10$n9KvcB7RbHeuCxfgPMkL1uh5MxZUprj/atIncg9DYsI3by8nICRd2','MAYOR','LUIS','RAMÍREZ','MENDOZA',25,'2001-09-02','MASCULINO','HOMBRE','5523456789','5587654321','ISSSTE','NINGUNA',NULL,NULL,'FC260000021',NULL,CURDATE() - INTERVAL 120 DAY,NOW(),NOW(),1),
(3,'SOFIAHL-110510','sofia@correo.mx','5534567890','$2y$10$n9KvcB7RbHeuCxfgPMkL1uh5MxZUprj/atIncg9DYsI3by8nICRd2','MENOR','SOFÍA','HERNÁNDEZ','LÓPEZ',16,'2010-05-11','FEMENINO','MUJER','5534567890','5576543210','NINGUNO','NINGUNA',NULL,'MARÍA LÓPEZ GARCÍA','FC260000039',NULL,CURDATE() - INTERVAL 60 DAY,NOW(),NOW(),1);

INSERT INTO expedientes (socio_id, objetivo, nivel, dias_entrenamiento, actualizado_por, actualizado_en) VALUES (1,'recomposicion','intermedio',4,@coa,NOW()),(2,NULL,NULL,NULL,NULL,NOW()),(3,NULL,NULL,NULL,NULL,NOW());

INSERT INTO membresias (id, socio_id, plan_id, inicio, vence, estado, asignada_por, creado_en, precio_aplicado) VALUES
(1, 1, @mensual, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 19 DAY, 'ACTIVA', @rec, NOW() - INTERVAL 10 DAY, 549.00),
(2, 2, @mensual, CURDATE() - INTERVAL 27 DAY, CURDATE() + INTERVAL 2 DAY, 'ACTIVA', @rec, NOW() - INTERVAL 27 DAY, 549.00),
(3, 3, @mensual, CURDATE() - INTERVAL 45 DAY, CURDATE() - INTERVAL 16 DAY, 'VENCIDA', @rec, NOW() - INTERVAL 45 DAY, 549.00);
INSERT INTO pagos (id, socio_id, membresia_id, folio, concepto, monto, metodo, fecha, registrado_por, plan_id, tarjeta_marca, tarjeta_ultimos4, referencia_externa) VALUES
(1, 1, 1, 'RDEMO000001', 'Membresía Mensual', 549.00, 'efectivo', NOW() - INTERVAL 10 DAY, @rec, @mensual, NULL, NULL, NULL),
(2, 2, 2, 'RDEMO000002', 'Membresía Mensual', 549.00, 'mercadopago', NOW() - INTERVAL 27 DAY, NULL, @mensual, 'VISA', '4242', 'MP-SIM-DEMO'),
(3, 3, 3, 'RDEMO000003', 'Membresía Mensual', 549.00, 'tarjeta', NOW() - INTERVAL 45 DAY, @rec, @mensual, NULL, NULL, NULL);
INSERT INTO solicitudes_cambio (socio_id, plan_id, estado, creado_en, referencia, monto, expira_en) VALUES
(2, @mensual, 'PENDIENTE', NOW(), 'EF-DEMO2345', 549.00, NOW() + INTERVAL 72 HOUR);

INSERT INTO asistencias (socio_id, entrada, salida, registrado_por) VALUES
(1, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 07:15:00'), CONCAT(CURDATE() - INTERVAL 1 DAY, ' 08:40:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 2 DAY, ' 18:05:00'), CONCAT(CURDATE() - INTERVAL 2 DAY, ' 19:20:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 4 DAY, ' 07:20:00'), CONCAT(CURDATE() - INTERVAL 4 DAY, ' 08:35:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 5 DAY, ' 07:10:00'), CONCAT(CURDATE() - INTERVAL 5 DAY, ' 08:50:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 7 DAY, ' 18:30:00'), CONCAT(CURDATE() - INTERVAL 7 DAY, ' 19:45:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 07:25:00'), CONCAT(CURDATE() - INTERVAL 9 DAY, ' 08:30:00'), @rec),
(1, CONCAT(CURDATE() - INTERVAL 10 DAY, ' 07:15:00'), CONCAT(CURDATE() - INTERVAL 10 DAY, ' 08:45:00'), @rec),
(2, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 20:00:00'), CONCAT(CURDATE() - INTERVAL 1 DAY, ' 21:10:00'), @rec),
(2, CONCAT(CURDATE() - INTERVAL 3 DAY, ' 20:05:00'), CONCAT(CURDATE() - INTERVAL 3 DAY, ' 21:20:00'), @rec),
(2, CONCAT(CURDATE() - INTERVAL 6 DAY, ' 19:55:00'), CONCAT(CURDATE() - INTERVAL 6 DAY, ' 21:00:00'), @rec),
(2, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 20:10:00'), CONCAT(CURDATE() - INTERVAL 9 DAY, ' 21:15:00'), @rec),
(3, CONCAT(CURDATE() - INTERVAL 18 DAY, ' 16:00:00'), CONCAT(CURDATE() - INTERVAL 18 DAY, ' 17:10:00'), @rec),
(3, CONCAT(CURDATE() - INTERVAL 24 DAY, ' 16:05:00'), CONCAT(CURDATE() - INTERVAL 24 DAY, ' 17:15:00'), @rec);

INSERT INTO accesos_log (socio_id, codigo_leido, resultado, movimiento, registrado_por, creado_en) VALUES
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 07:15:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 08:40:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 2 DAY, ' 18:05:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 2 DAY, ' 19:20:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 4 DAY, ' 07:20:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 4 DAY, ' 08:35:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 5 DAY, ' 07:10:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 5 DAY, ' 08:50:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 7 DAY, ' 18:30:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 7 DAY, ' 19:45:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 07:25:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 08:30:00')),
(1, 'FC260000013', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 10 DAY, ' 07:15:00')),
(1, 'FC260000013', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 10 DAY, ' 08:45:00')),
(2, 'FC260000021', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 20:00:00')),
(2, 'FC260000021', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 21:10:00')),
(2, 'FC260000021', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 3 DAY, ' 20:05:00')),
(2, 'FC260000021', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 3 DAY, ' 21:20:00')),
(2, 'FC260000021', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 6 DAY, ' 19:55:00')),
(2, 'FC260000021', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 6 DAY, ' 21:00:00')),
(2, 'FC260000021', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 20:10:00')),
(2, 'FC260000021', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 9 DAY, ' 21:15:00')),
(3, 'FC260000039', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 18 DAY, ' 16:00:00')),
(3, 'FC260000039', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 18 DAY, ' 17:10:00')),
(3, 'FC260000039', 'PERMITIDO', 'ENTRADA', @rec, CONCAT(CURDATE() - INTERVAL 24 DAY, ' 16:05:00')),
(3, 'FC260000039', 'PERMITIDO', 'SALIDA', @rec, CONCAT(CURDATE() - INTERVAL 24 DAY, ' 17:15:00'));

INSERT INTO mediciones (socio_id, fecha, peso, grasa_corporal, imc, estatura, masa_muscular, registrado_por) VALUES
(1, CURDATE() - INTERVAL 60 DAY, 68.4, 29.0, 25.1, 165, 33.0, NULL),
(1, CURDATE() - INTERVAL 30 DAY, 66.9, 27.5, 24.6, 165, 34.0, @coa),
(1, CURDATE() - INTERVAL 3 DAY, 65.8, 26.2, 24.2, 165, 34.8, NULL);

INSERT INTO rutinas (id, socio_id, nombre, entrenador, vigente_desde, activa, objetivo, nivel, dias_semana, coach_id) VALUES (1, 1, 'Recomposición corporal · 4 días', 'DIEGO HERRERA LUNA', CURDATE() - INTERVAL 5 DAY, 1, 'recomposicion', 'intermedio', 4, @coa);

INSERT INTO rutina_ejercicios (rutina_id, dia, orden, nombre, series, repeticiones, descanso, dia_numero, enfoque) VALUES
(1, 'Lunes', 1, 'Press de banca con mancuernas', 4, '8-12', '75', 1, 'Tren superior'),
(1, 'Lunes', 2, 'Dominadas asistidas', 4, '8-12', '75', 1, 'Tren superior'),
(1, 'Lunes', 3, 'Press militar con mancuernas', 4, '8-12', '75', 1, 'Tren superior'),
(1, 'Lunes', 4, 'Remo con mancuerna a una mano', 4, '8-12', '75', 1, 'Tren superior'),
(1, 'Lunes', 5, 'Elevaciones laterales con mancuerna', 3, '12-15', '60', 1, 'Tren superior'),
(1, 'Martes', 1, 'Sentadilla goblet', 4, '8-12', '75', 2, 'Tren inferior'),
(1, 'Martes', 2, 'Peso muerto rumano con barra', 4, '8-12', '75', 2, 'Tren inferior'),
(1, 'Martes', 3, 'Zancadas con mancuernas', 4, '8-12', '75', 2, 'Tren inferior'),
(1, 'Martes', 4, 'Curl femoral acostado', 3, '12-15', '60', 2, 'Tren inferior'),
(1, 'Martes', 5, 'Hip thrust con barra', 4, '8-12', '75', 2, 'Tren inferior'),
(1, 'Jueves', 1, 'Press de banca con mancuernas', 4, '8-12', '75', 3, 'Tren superior'),
(1, 'Jueves', 2, 'Dominadas asistidas', 4, '8-12', '75', 3, 'Tren superior'),
(1, 'Jueves', 3, 'Press militar con mancuernas', 4, '8-12', '75', 3, 'Tren superior'),
(1, 'Jueves', 4, 'Remo con mancuerna a una mano', 4, '8-12', '75', 3, 'Tren superior'),
(1, 'Jueves', 5, 'Elevaciones laterales con mancuerna', 3, '12-15', '60', 3, 'Tren superior'),
(1, 'Viernes', 1, 'Sentadilla goblet', 4, '8-12', '75', 4, 'Tren inferior'),
(1, 'Viernes', 2, 'Peso muerto rumano con barra', 4, '8-12', '75', 4, 'Tren inferior'),
(1, 'Viernes', 3, 'Zancadas con mancuernas', 4, '8-12', '75', 4, 'Tren inferior'),
(1, 'Viernes', 4, 'Curl femoral acostado', 3, '12-15', '60', 4, 'Tren inferior'),
(1, 'Viernes', 5, 'Hip thrust con barra', 4, '8-12', '75', 4, 'Tren inferior');

INSERT INTO codigos_registro (codigo, generado_por, creado_en, expira_en) VALUES ('482915', @rec, NOW(), NOW() + INTERVAL 72 HOUR), ('731004', @rec, NOW(), NOW() + INTERVAL 72 HOUR);
