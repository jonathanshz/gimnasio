<?php
class AdminController
{
    /** GET staff/resumen — panel de recepción */
    public function panel(array $p, ?array $auth): void
    {
        Membresia::sincronizar();
        $res = Membresia::resumenActivos();
        responder(['kpis' => Asistencia::kpisHoy(), 'por_vencer' => count($res['por_vencer']), 'fichas_pendientes' => count(Ficha::pendientes()), 'recientes' => Asistencia::recientes(6)]);
    }

    /** GET admin/resumen */
    public function resumen(array $p, ?array $auth): void
    {
        Membresia::sincronizar();
        $r = Membresia::resumenActivos();
        $pend = array_filter(Usuario::listar(), fn($u) => $u['estado'] === 'pendiente');
        responder([
            'ingresos_mes' => Pago::ingresosMes(),
            'socios_activos' => $r['activos'],
            'socios_total' => Socio::totales()['total'],
            'fichas_pendientes' => count(Ficha::pendientes()),
            'personal_pendiente' => count($pend),
            'afluencia' => Asistencia::afluenciaPorHora(),
            'por_plan' => $r['por_plan'],
            'por_vencer' => $r['por_vencer']
        ]);
    }

    /** POST codigos — genera el código de 6 dígitos para un socio nuevo */
    public function generarCodigo(array $p, ?array $auth): void
    {
        $c = Codigo::generar((int)$auth['sub']);
        responder(['codigo' => $c, 'vigencia_horas' => HORAS_CODIGO_REGISTRO], 201);
    }

    /** GET codigos */
    public function codigos(array $p, ?array $auth): void
    {
        responder(Codigo::listar(40));
    }
}
