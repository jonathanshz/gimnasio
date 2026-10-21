<?php
class AsistenciaController
{
    /** Recibe el código que lee el escáner y responde si el socio puede entrar. */
    public function lectura(array $params, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['codigo']);
        $codigo = strtoupper(trim($d['codigo']));

        $asistencias = new Asistencia();
        $socio = (new Socio())->buscarPorCodigo($codigo);

        if (!$socio || !$socio['activo']) {
            $asistencias->registrar(null, $codigo, 'denegado', 'Credencial no registrada');
            responder(['acceso' => false, 'motivo' => 'Credencial no registrada', 'codigo' => $codigo, 'hora' => date('H:i:s')]);
        }

        $m = (new Membresia())->estadoSocio((int)$socio['id']);
        $persona = ['nombre' => $socio['nombre'] . ' ' . $socio['apellidos'], 'codigo' => $socio['codigo_credencial']];
        $base = ['socio' => $persona, 'membresia' => $m, 'hora' => date('H:i:s')];

        $motivo = match ($m['estado']) {
            'vencida'       => 'Membresía vencida el ' . date('d/m/Y', strtotime($m['vigente_hasta'])),
            'congelada'     => 'Membresía congelada',
            'sin_membresia' => 'El socio no tiene membresía',
            default         => null,
        };

        if ($motivo) {
            $asistencias->registrar((int)$socio['id'], $codigo, 'denegado', $motivo);
            responder($base + ['acceso' => false, 'motivo' => $motivo]);
        }

        $duplicado = $asistencias->entradaReciente((int)$socio['id']);
        if (!$duplicado) $asistencias->registrar((int)$socio['id'], $codigo, 'permitido', null);

        $aviso = $m['estado'] === 'por_vencer'
            ? ($m['dias_restantes'] === 0 ? 'Tu membresía vence hoy.' : "Tu membresía vence en {$m['dias_restantes']} días.")
            : null;
        responder($base + ['acceso' => true, 'duplicado' => $duplicado, 'aviso' => $aviso]);
    }

    public function listar(array $params, ?array $auth): void
    {
        responder((new Asistencia())->listarPorFecha($_GET['fecha'] ?? date('Y-m-d')));
    }
}
