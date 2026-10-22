-- Pagos en línea con Mercado Pago. Ejecuta UNA vez en una base que ya tenías (si importas schema.sql completo, ya viene incluida).
USE fitcode;

-- [NUEVO] Intentos de pago en línea (Mercado Pago). Solo cuando el pago se aprueba se crea el registro real en `pagos`
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