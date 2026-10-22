<?php
/** Catálogo de planes y vistas de membresía del portal del socio. */
class MembresiaController
{
    /** GET planes */
    public function planes(array $p, ?array $auth): void { responder(Plan::listar()); }

    /** GET portal/inicio — resumen de “Mi acceso” */
    public function inicio(array $p, ?array $auth): void
    {
        $id = (int)$auth['sub']; Membresia::sincronizar();
        $dentro = Asistencia::dentro($id); $vis = Asistencia::visitas($id, 60);
        $dias = []; for ($i = 13; $i >= 0; $i--) $dias[sumarDias(hoy(), -$i)] = 0;
        foreach ($vis as $v) { $k = substr($v['entrada'], 0, 10); if (isset($dias[$k])) $dias[$k]++; }
        $maq = Maquina::conteo();
        responder(['socio' => Socio::vista(Socio::porId($id)), 'membresia' => Membresia::actual($id), 'dentro' => $dentro ? $dentro['entrada'] : null,
            'ultima_visita' => $vis ? $vis[0]['entrada'] : null, 'ficha' => Ficha::pendiente($id), 'dias14' => $dias,
            'maquinas' => ['libres' => $maq['LIBRE'], 'total' => array_sum($maq)]]);
    }

    /** GET portal/membresia — “Consulta tu membresía” */
    public function membresia(array $p, ?array $auth): void
    {
        $id = (int)$auth['sub']; Membresia::sincronizar();
        $m = Membresia::actual($id);
        $vis = Asistencia::visitas($id, 500);
        $pago = null;
        if ($m) foreach (Pago::porSocio($id) as $x) if ($x['membresia_id'] === $m['id']) { $pago = $x; break; }
        $lim = sumarDias(hoy(), -30) . ' 00:00:00'; $dur = [];
        foreach ($vis as $v) if ($v['entrada'] >= $lim && $v['salida']) $dur[] = (strtotime($v['salida']) - strtotime($v['entrada'])) / 60;
        $rec = array_slice($vis, 0, 8); $horas = [];
        foreach ($rec as $v) { $h = (int)substr($v['entrada'], 11, 2); $horas[$h] = ($horas[$h] ?? 0) + 1; }
        arsort($horas);
        responder(['socio' => Socio::vista(Socio::porId($id)), 'membresia' => $m, 'siguiente' => Membresia::siguiente($id), 'historial' => Membresia::historial($id), 'pago' => $pago,
            'visitas_30' => Asistencia::contarDesde($id, 30), 'visitas_periodo' => $m ? count(array_filter($vis, fn($v) => $v['entrada'] >= $m['fecha_inicio'])) : 0,
            'promedio_min' => $dur ? (int)round(array_sum($dur) / count($dur)) : 0, 'hora_favorita' => $horas ? array_key_first($horas) : null, 'recientes' => $rec]);
    }
}
