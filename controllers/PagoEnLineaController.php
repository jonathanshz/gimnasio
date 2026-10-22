<?php

/**
 * Pago con tarjeta en línea por Mercado Pago (Checkout Pro). Solo se usa cuando PAGO_MODO = 'mercadopago'.
 * El socio paga en el sitio de Mercado Pago, así que por este servidor NUNCA pasan datos de tarjeta.
 *
 * Flujo:
 *   1. POST portal/pagos/en-linea {plan_id}            -> crea un intento en pagos_en_linea + preferencia en MP -> devuelve init_point
 *   2. El navegador va a init_point, paga y MP lo regresa a portal/pagos.html?folio=..&payment_id=..
 *   3. POST portal/pagos/en-linea/{folio}/verificar     > consulta el pago REAL a MP y, si está aprobado, crea membresía + pago
 *   3b. POST webhooks/mercadopago (opcional, HTTPS)     -> MP avisa por su cuenta aunque el socio cierre la ventana
 * Todo termina en aplicar(), que es idempotente (si ya está pagado no hace nada) y usa una transacción.
 */
class PagoEnLineaController
{
    /** POST portal/pagos/en-linea {plan_id} */
    public function iniciar(array $p, ?array $auth): void
    {
        if (!MercadoPago::activo()) fallar('El pago con Mercado Pago no está habilitado.', 403);
        $socioId = (int)$auth['sub'];
        $plan = Plan::porId((int)(entrada()['plan_id'] ?? 0));
        if (!$plan) fallar('Ese plan no existe.', 404);
        $socio = Socio::porId($socioId);
        $db = Database::conectar();

        $folio = 'OL' . date('ymd') . strtoupper(bin2hex(random_bytes(3)));
        $db->prepare("INSERT INTO pagos_en_linea (folio, socio_id, plan_id, monto, estado, creado_en) VALUES (?,?,?,?, 'pendiente', ?)")
            ->execute([$folio, $socioId, $plan['id'], $plan['precio'], ahora()]);     // el precio lo define el servidor

        $app  = rtrim(SITE_URL, '/') . BASE_URL;
        $back = $app . '/portal/pagos.html?folio=' . $folio;                          // MP agrega &payment_id=..&status=..
        $pref = [
            'items' => [['id' => 'plan-' . $plan['id'], 'title' => 'Membresía ' . $plan['nombre'], 'quantity' => 1, 'unit_price' => (float)$plan['precio'], 'currency_id' => 'MXN']],
            'external_reference' => $folio,
            'back_urls' => ['success' => $back, 'pending' => $back, 'failure' => $back],
        ];
        if (!empty($socio['correo'])) $pref['payer'] = ['email' => $socio['correo']];
        if (str_starts_with($app, 'https://')) {                                      // auto_return y webhook exigen HTTPS público
            $pref['auto_return'] = 'approved';
            $pref['notification_url'] = $app . '/api/v1/webhooks/mercadopago';
        }
        try {
            $r = MercadoPago::crearPreferencia($pref);
        } catch (RuntimeException $e) {
            $db->prepare("UPDATE pagos_en_linea SET estado = 'error', actualizado_en = ? WHERE folio = ?")->execute([ahora(), $folio]);
            fallar('No pudimos iniciar el pago con Mercado Pago. Inténtalo de nuevo.', 502);
        }
        $db->prepare('UPDATE pagos_en_linea SET mp_preference_id = ? WHERE folio = ?')->execute([$r['id'], $folio]);
        responder(['folio' => $folio, 'init_point' => $r['url']], 201);
    }

    /** POST portal/pagos/en-linea/{folio}/verificar {payment_id} — se llama al volver del checkout */
    public function verificar(array $p, ?array $auth): void
    {
        if (!MercadoPago::activo()) fallar('El pago con Mercado Pago no está habilitado.', 403);
        $pid = (string)(entrada()['payment_id'] ?? '');
        $this->conErrores(fn() => $this->procesarPago($pid, (string)$p['folio'], (int)$auth['sub']));
    }

    /** POST webhooks/mercadopago — PÚBLICO (sin JWT). Mercado Pago solo envía el id; el pago real se consulta a su API. */
    public function webhook(array $p, ?array $auth): void
    {
        if (!MercadoPago::activo()) responder(['ok' => true]);
        $d = entrada();
        $dataId = strtolower((string)($_GET['data_id'] ?? $_GET['data.id'] ?? $d['data']['id'] ?? ''));   // PHP convierte "data.id" en "data_id"
        $tipo = (string)($_GET['type'] ?? $d['type'] ?? '');
        if ($tipo !== 'payment' || !ctype_digit($dataId)) responder(['ok' => true]);
        if (!MercadoPago::firmaValida($dataId)) fallar('Firma no válida.', 401);
        try {
            $this->procesarPago($dataId, null, null);
        } catch (InvalidArgumentException $e) { /* pago que no es de este sistema: 200 para que MP no reintente */
        } catch (Throwable $e) {
            error_log('[MP webhook] ' . $e->getMessage());
            fallar('Error al procesar.', 500);
        }   // MP reintentará
        responder(['ok' => true]);
    }

    private function procesarPago(string $paymentId, ?string $folioEsperado, ?int $socioId): array
    {
        if (!ctype_digit($paymentId)) throw new InvalidArgumentException('El identificador de pago no es válido.', 422);
        try {
            $mp = MercadoPago::pago($paymentId);
        } catch (RuntimeException $e) {
            throw new UnexpectedValueException($e->getMessage(), 502);
        }
        $folio = (string)($mp['external_reference'] ?? '');
        if ($folio === '' || ($folioEsperado !== null && $folio !== $folioEsperado)) throw new InvalidArgumentException('El pago no corresponde a este folio.', 422);
        $resultado = match ((string)($mp['status'] ?? '')) {
            'approved' => 'aprobado',
            'rejected', 'cancelled' => 'rechazado',
            default => 'pendiente'
        };
        $monto = ($mp['currency_id'] ?? '') === 'MXN' ? (float)($mp['transaction_amount'] ?? 0) : -1.0;   // otra moneda → revisión
        $marca = strtoupper((string)($mp['payment_method_id'] ?? ''));
        $marca = ['MASTER' => 'MASTERCARD'][$marca] ?? $marca;
        return $this->aplicar($folio, $resultado, [
            'mp_payment_id' => (int)$paymentId,
            'marca' => substr($marca, 0, 12) ?: null,
            'ultimos4' => preg_match('/^\d{4}$/', (string)($mp['card']['last_four_digits'] ?? '')) ? $mp['card']['last_four_digits'] : null,
        ], $monto, $socioId);
    }

    /** ÚNICO punto que convierte un intento en pago real. Idempotente. Un 'rechazado' puede pasar a 'pagado' (reintento con otra tarjeta). */
    private function aplicar(string $folio, string $resultado, array $mp, float $montoPagado, ?int $socioId): array
    {
        $db = Database::conectar();
        $db->beginTransaction();
        try {
            $st = $db->prepare('SELECT * FROM pagos_en_linea WHERE folio = ? FOR UPDATE');
            $st->execute([$folio]);
            $i = $st->fetch();
            if (!$i || ($socioId !== null && (int)$i['socio_id'] !== $socioId)) {
                $db->rollBack();
                throw new InvalidArgumentException('No encontramos el pago.', 404);
            }
            if (!in_array($i['estado'], ['pendiente', 'rechazado'], true)) {
                $db->commit();
                return $this->salida($i['estado'], $i['pago_id'], $folio);
            }

            $estado = ['aprobado' => 'pagado', 'rechazado' => 'rechazado', 'pendiente' => 'pendiente'][$resultado];
            $pagoId = null;
            if ($resultado === 'aprobado') {
                $plan = Plan::porId((int)$i['plan_id']);
                if (!$plan || abs((float)$plan['precio'] - (float)$i['monto']) > 0.01 || abs($montoPagado - (float)$i['monto']) > 0.01) {
                    $estado = 'revision';                                              // el monto o la moneda no coinciden: lo revisa el personal
                } else {
                    $pago = Pago::cobrar((int)$i['socio_id'], $plan, 'mercadopago', null, [
                        'tarjeta_marca' => $mp['marca'],
                        'tarjeta_ultimos4' => $mp['ultimos4'],
                        'referencia_externa' => 'MP-' . $mp['mp_payment_id']
                    ]);
                    Ficha::cancelarPendientesDe((int)$i['socio_id']);
                    $pagoId = (int)$pago['id'];
                }
            }
            $db->prepare('UPDATE pagos_en_linea SET estado = ?, pago_id = ?, mp_payment_id = ?, actualizado_en = ? WHERE id = ?')
                ->execute([$estado, $pagoId, $mp['mp_payment_id'], ahora(), $i['id']]);
            $db->commit();
            return $this->salida($estado, $pagoId, $folio);
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
    }

    private function salida(string $estado, $pagoId, string $folio): array
    {
        $r = ['folio' => $folio, 'estado' => $estado, 'folio_recibo' => null];
        if ($pagoId && ($pg = Pago::porId((int)$pagoId))) $r['folio_recibo'] = $pg['folio'];
        return $r;
    }

    private function conErrores(callable $accion): void
    {
        try {
            responder($accion());
        } catch (InvalidArgumentException | UnexpectedValueException $e) {
            fallar($e->getMessage(), $e->getCode() ?: 422);
        }
    }
}
