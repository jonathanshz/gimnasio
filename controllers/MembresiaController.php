<?php
class MembresiaController
{
    private Membresia $membresias;

    public function __construct() { $this->membresias = new Membresia(); }

    public function tipos(array $params, ?array $auth): void
    {
        responder($this->membresias->tipos());
    }

    public function estadoDeSocio(array $params, ?array $auth): void
    {
        $id = (int)$params['id'];
        responder([
            'resumen'   => $this->membresias->estadoSocio($id),
            'historial' => $this->membresias->historial($id),
        ]);
    }

    /** Asignación sin cobro (cortesía). Para cobrar se usa POST /pagos. */
    public function asignar(array $params, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['socio_id', 'tipo_membresia_id']);
        if (!(new Socio())->obtener((int)$d['socio_id'])) fallar('No encontramos al socio.', 404);
        $tipo = $this->membresias->tipo((int)$d['tipo_membresia_id']);
        if (!$tipo) fallar('El tipo de membresía no existe.', 404);

        $id = $this->membresias->asignar((int)$d['socio_id'], $tipo);
        (new Usuario())->registrarBitacora((int)$auth['sub'], 'asignar_membresia', 'membresias', "Membresía #$id (cortesía)");
        responder($this->membresias->obtener($id), 201);
    }

    /** Cambia el estado: congelar, reactivar o cancelar. */
    public function cambiarEstado(array $params, ?array $auth): void
    {
        $id = (int)$params['id'];
        $d = entrada();
        exigir($d, ['estado']);
        $m = $this->membresias->obtener($id);
        if (!$m) fallar('No encontramos la membresía.', 404);

        $permitidas = [
            'activa'    => ['congelada', 'cancelada'],
            'congelada' => ['activa', 'cancelada'],
        ];
        if (!in_array($d['estado'], $permitidas[$m['estado']] ?? [], true)) {
            fallar("No se puede pasar de {$m['estado']} a {$d['estado']}.", 422);
        }
        match ($d['estado']) {
            'congelada' => $this->membresias->congelar($id),
            'activa'    => $this->membresias->reactivar($id),
            'cancelada' => $this->membresias->cancelar($id),
        };
        (new Usuario())->registrarBitacora((int)$auth['sub'], 'estado_membresia', 'membresias', "#$id -> {$d['estado']}");
        responder($this->membresias->obtener($id));
    }

    /** Activa -> Vencida. Se llama al abrir el dashboard y puede programarse cada noche. */
    public function actualizarEstados(array $params, ?array $auth): void
    {
        responder(['vencidas' => $this->membresias->marcarVencidas()]);
    }

    public function porVencer(array $params, ?array $auth): void
    {
        responder($this->membresias->porVencer(DIAS_AVISO_VENCIMIENTO));
    }
}
