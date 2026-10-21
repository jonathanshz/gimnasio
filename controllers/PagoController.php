<?php
class PagoController
{
    private Pago $pagos;

    public function __construct() { $this->pagos = new Pago(); }

    /**
     * Registra un cobro. Con tipo_membresia_id cobra y asigna/renueva la membresía en una sola
     * transacción; sin él registra un cobro libre (concepto + monto).
     */
    public function registrar(array $params, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['socio_id', 'metodo']);
        if (!in_array($d['metodo'], ['efectivo', 'tarjeta', 'transferencia'], true)) {
            fallar('El método de pago no es válido.', 422);
        }
        $socioId = (int)$d['socio_id'];
        if (!(new Socio())->obtener($socioId)) fallar('No encontramos al socio.', 404);

        $membresias = new Membresia();
        $db = Database::conectar();
        $db->beginTransaction();
        try {
            $membresiaId = null;
            if (!empty($d['tipo_membresia_id'])) {
                $tipo = $membresias->tipo((int)$d['tipo_membresia_id']);
                if (!$tipo) { $db->rollBack(); fallar('El tipo de membresía no existe.', 404); }
                $membresiaId = $membresias->asignar($socioId, $tipo);
                $concepto = 'Membresía ' . $tipo['nombre'];
                $monto = (float)$tipo['precio'];            // el precio lo define el servidor, no el cliente
            } else {
                exigir($d, ['concepto', 'monto']);
                $monto = round((float)$d['monto'], 2);
                if ($monto <= 0) { $db->rollBack(); fallar('El monto debe ser mayor a cero.', 422); }
                $concepto = trim($d['concepto']);
            }
            $pagoId = $this->pagos->crear($socioId, $membresiaId, $concepto, $monto, $d['metodo'], (int)$auth['sub']);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        (new Usuario())->registrarBitacora((int)$auth['sub'], 'registrar_pago', 'pagos', "Pago #$pagoId \${$monto}");
        responder($this->estructurarRecibo($this->pagos->obtener($pagoId)), 201);
    }

    private function estructurarRecibo(array $p): array
    {
        return [
            'folio'    => $p['folio'],
            'fecha'    => $p['creado_en'],
            'socio'    => ['nombre' => $p['socio'], 'credencial' => $p['codigo_credencial'],
                           'rfc' => $p['rfc'], 'razon_social' => $p['razon_social']],
            'concepto' => $p['concepto'],
            'vigencia' => $p['fecha_inicio'] ? ['desde' => $p['fecha_inicio'], 'hasta' => $p['fecha_fin']] : null,
            'monto'    => (float)$p['monto'],
            'metodo'   => $p['metodo'],
            'cajero'   => $p['cajero'],
        ];
    }

    public function recibo(array $params, ?array $auth): void
    {
        $p = $this->pagos->obtener((int)$params['id']);
        if (!$p) fallar('No encontramos el recibo.', 404);
        responder($this->estructurarRecibo($p));
    }

    public function listar(array $params, ?array $auth): void
    {
        responder($this->pagos->listar(
            !empty($_GET['socio_id']) ? (int)$_GET['socio_id'] : null,
            $_GET['desde'] ?? null,
            $_GET['hasta'] ?? null
        ));
    }

    public function corte(array $params, ?array $auth): void
    {
        $fecha = $_GET['fecha'] ?? date('Y-m-d');
        $filas = $this->pagos->corte($fecha);
        responder(['fecha' => $fecha, 'por_metodo' => $filas, 'total' => array_sum(array_column($filas, 'total'))]);
    }

    /** Portal: historial de recibos del socio que inició sesión. */
    public function misPagos(array $params, ?array $auth): void
    {
        responder($this->pagos->listar((int)$auth['sub'], null, null));
    }
}
