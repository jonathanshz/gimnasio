<?php
class MaquinaController
{
    /** GET maquinas — disponibilidad en tiempo real (socios y personal) */
    public function listar(array $p, ?array $auth): void
    {
        responder(Maquina::listar());
    }

    /** PUT maquinas/{id}/estado {estado}. Mantenimiento solo lo cambia administración. */
    public function cambiarEstado(array $p, ?array $auth): void
    {
        $estado = strtoupper((string)(entrada()['estado'] ?? ''));
        if (!in_array($estado, ['LIBRE', 'OCUPADA', 'MANTENIMIENTO'], true)) fallar('Estado no válido.', 422);
        $m = Maquina::porId((int)$p['id']);
        if (!$m) fallar('Máquina no encontrada.', 404);
        if (($estado === 'MANTENIMIENTO' || $m['estado'] === 'MANTENIMIENTO') && !in_array($auth['rol'], ['ADMIN', 'DUENO'], true))
            fallar('Solo administración puede enviar o sacar una máquina de mantenimiento.', 403);
        Maquina::cambiarEstado((int)$p['id'], $estado);
        responder(['id' => (int)$p['id'], 'estado' => $estado]);
    }
}
