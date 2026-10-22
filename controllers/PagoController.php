<?php
class PagoController
{
    // ---------------------------------------------------------------- Portal del socio
    /** GET portal/pagos */
    public function misPagos(array $p, ?array $auth): void
    {
        $id = (int)$auth['sub'];
        Membresia::sincronizar();
        responder(['pagos' => Pago::porSocio($id), 'membresia' => Membresia::actual($id), 'ficha' => Ficha::pendiente($id), 'tarjeta_habilitada' => PAGO_MODO !== 'ninguno' && (PAGO_MODO === 'simulado' || MercadoPago::activo()), 'pago_modo' => PAGO_MODO]);
    }

    /** GET portal/ficha — ficha de efectivo pendiente (o null) */
    public function ficha(array $p, ?array $auth): void
    {
        responder(Ficha::pendiente((int)$auth['sub']));
    }

    /** POST portal/ficha {plan_id} — genera la ficha con referencia única */
    public function fichaCrear(array $p, ?array $auth): void
    {
        $plan = Plan::porId((int)(entrada()['plan_id'] ?? 0));
        if (!$plan) fallar('Ese plan no existe.', 404);
        responder(Ficha::crear((int)$auth['sub'], $plan), 201);
    }

    /** DELETE portal/ficha/{id} */
    public function fichaCancelar(array $p, ?array $auth): void
    {
        Ficha::cancelar((int)$auth['sub'], (int)$p['id']);
        responder(['cancelada' => true]);
    }

    /** POST portal/pagar-tarjeta — PASARELA SIMULADA (PAGO_MODO = simulado). Con PAGO_MODO = mercadopago se usa PagoEnLineaController. Nunca se guarda el número ni el CVV. */
    public function pagarTarjeta(array $p, ?array $auth): void
    {
        if (!PAGO_TARJETA_SIMULADO) fallar('El pago con tarjeta en línea no está habilitado.', 403);
        $d = entrada();
        $id = (int)$auth['sub'];
        $plan = Plan::porId((int)($d['plan_id'] ?? 0));
        if (!$plan) fallar('Ese plan no existe.', 404);
        $n = preg_replace('/\D/', '', (string)($d['numero'] ?? ''));
        $marca = preg_match('/^4/', $n) ? 'VISA' : (preg_match('/^(5[1-5]|2[2-7])/', $n) ? 'MASTERCARD' : (preg_match('/^3[47]/', $n) ? 'AMEX' : null));
        $mm = (int)substr((string)($d['exp'] ?? ''), 0, 2);
        $aa = (int)substr((string)($d['exp'] ?? ''), 3, 2);
        $cvv = (string)($d['cvv'] ?? '');
        if (strlen(mayus($d['titular'] ?? '')) < 5) fallar('Escribe el nombre del titular como aparece en la tarjeta.', 422);
        if (!$marca || strlen($n) < 15 || !luhnValido($n)) fallar('El número de tarjeta no es válido.', 422);
        if ($mm < 1 || $mm > 12 || !$aa || date('Y-m-t', mktime(0, 0, 0, $mm, 1, 2000 + $aa)) < hoy()) fallar('La fecha de vencimiento no es válida o la tarjeta ya venció.', 422);
        if (!preg_match('/^\d{3,4}$/', $cvv) || strlen($cvv) !== ($marca === 'AMEX' ? 4 : 3)) fallar('El CVV no es válido.', 422);
        if ($n === '4000000000000002') fallar('El banco rechazó la tarjeta. Prueba con otra o paga en efectivo.', 402);
        $pago = Pago::cobrar($id, $plan, 'mercadopago', null, ['tarjeta_marca' => $marca, 'tarjeta_ultimos4' => substr($n, -4), 'referencia_externa' => 'MP-SIM-' . time()]);
        Ficha::cancelarPendientesDe($id);
        responder($pago, 201);
    }

    /** GET portal/recibo/{folio} */
    public function reciboSocio(array $p, ?array $auth): void
    {
        $r = Pago::porFolio($p['folio'], (int)$auth['sub']);
        if (!$r) fallar('Recibo no encontrado.', 404);
        responder($r);
    }

    // ---------------------------------------------------------------- Personal
    /** POST pagos/mostrador {socio_id, plan_id, metodo} — cobro en caja (efectivo o terminal) */
    public function mostrador(array $p, ?array $auth): void
    {
        $d = entrada();
        $socio = Socio::porId((int)($d['socio_id'] ?? 0));
        $plan = Plan::porId((int)($d['plan_id'] ?? 0));
        $metodo = (string)($d['metodo'] ?? '');
        if (!$socio || !$socio['activo']) fallar('Socio no encontrado.', 404);
        if (!$plan) fallar('Ese plan no existe.', 404);
        if (!in_array($metodo, ['efectivo', 'tarjeta'], true)) fallar('Método de pago no válido.', 422);
        $pago = Pago::cobrar((int)$socio['id'], $plan, $metodo, (int)$auth['sub']);
        Ficha::cancelarPendientesDe((int)$socio['id']);
        responder($pago, 201);
    }

    /** POST pagos/cobrar-ficha {referencia} */
    public function cobrarFicha(array $p, ?array $auth): void
    {
        $ref = trim((string)(entrada()['referencia'] ?? ''));
        if ($ref === '') fallar('Escribe la referencia de la ficha.', 422);
        $r = Ficha::cobrar($ref, (int)$auth['sub']);
        if (!$r['ok']) fallar($r['error'], 422);
        responder($r['pago'], 201);
    }

    /** GET fichas/pendientes */
    public function fichasPendientes(array $p, ?array $auth): void
    {
        responder(Ficha::pendientes());
    }

    /** GET pagos?desde=&hasta= */
    public function listar(array $p, ?array $auth): void
    {
        $f = fn($k) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET[$k] ?? '')) ? $_GET[$k] : null;
        responder(Pago::listar($f('desde'), $f('hasta'), 300));
    }

    /** GET pagos/corte?dia=AAAA-MM-DD */
    public function corte(array $p, ?array $auth): void
    {
        $dia = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['dia'] ?? '')) ? $_GET['dia'] : hoy();
        $c = Pago::corte($dia);
        responder(['dia' => $dia, 'metodos' => $c, 'total' => array_sum(array_column($c, 'total'))]);
    }

    /** GET pagos/recibo/{folio} */
    public function recibo(array $p, ?array $auth): void
    {
        $r = Pago::porFolio($p['folio']);
        if (!$r) fallar('Recibo no encontrado.', 404);
        responder($r);
    }
}
