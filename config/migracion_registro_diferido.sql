-- =====================================================================
-- MIGRACIÓN · el socio se crea hasta verificar el correo
-- Ejecútala UNA vez en tu base de datos actual (phpMyAdmin → SQL, o InfinityFree → phpMyAdmin).
-- Si instalas desde cero con config/schema.sql NO la necesitas: ya incluye estos cambios.
-- =====================================================================

-- 1) El registro en curso guarda correo, teléfono y contraseña (cifrada) mientras se espera el código.
ALTER TABLE registro_pendiente
  ADD COLUMN cuenta LONGTEXT NULL AFTER docs;

-- 2) Los códigos de verificación pueden pertenecer a un registro que aún no es socio.
ALTER TABLE verificaciones_correo
  MODIFY cuenta ENUM('SOCIO','STAFF','REGISTRO') NOT NULL;
