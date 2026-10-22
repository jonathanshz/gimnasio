<?php

/** Consulta de socios por el personal (búsqueda, ficha, documentos). */
class SocioController
{
    /** GET socios?q= — lista con membresía y, para coaches, objetivo/IMC/rutina */
    public function listar(array $p, ?array $auth): void
    {
        Membresia::sincronizar();
        $db = Database::conectar();
        $filas = Socio::buscar(trim((string)($_GET['q'] ?? '')));
        $obj = [];
        foreach ($db->query('SELECT socio_id, objetivo FROM expedientes WHERE objetivo IS NOT NULL')->fetchAll() as $r) $obj[$r['socio_id']] = $r['objetivo'];
        $imc = [];
        foreach ($db->query('SELECT m.socio_id, m.imc FROM mediciones m JOIN (SELECT socio_id, MAX(id) mid FROM mediciones GROUP BY socio_id) x ON x.mid = m.id')->fetchAll() as $r) $imc[$r['socio_id']] = (float)$r['imc'];
        $rut = array_flip($db->query('SELECT DISTINCT socio_id FROM rutinas WHERE activa = 1')->fetchAll(PDO::FETCH_COLUMN));
        $out = [];
        foreach ($filas as $s) {
            $v = Socio::vista($s);
            $id = $v['id'];
            $m = Membresia::actual($id);
            $v['membresia'] = $m ? ['plan' => $m['plan'], 'estado' => $m['estado'], 'fecha_fin' => $m['fecha_fin'], 'por_vencer' => $m['por_vencer']] : null;
            $v['objetivo'] = $obj[$id] ?? null;
            $v['imc'] = $imc[$id] ?? null;
            $v['con_rutina'] = isset($rut[$id]);
            unset($v['telefono_emergencia'], $v['enfermedad_cronica'], $v['enfermedad_otra'], $v['servicio_medico']);
            $out[] = $v;
        }
        responder($out);
    }

    /** GET socios/{id} — ficha completa para recepción/administración */
    public function ver(array $p, ?array $auth): void
    {
        $s = Socio::porId((int)$p['id']);
        if (!$s) fallar('Socio no encontrado.', 404);
        $id = (int)$s['id'];
        Membresia::sincronizar();
        $dentro = Asistencia::dentro($id);
        responder([
            'socio' => Socio::vista($s),
            'membresia' => Membresia::actual($id),
            'dentro' => $dentro ? $dentro['entrada'] : null,
            'visitas' => Asistencia::visitas($id, 10),
            'pagos' => array_slice(Pago::porSocio($id), 0, 10),
            'documentos' => Socio::documentos($id),
            'ficha' => Ficha::pendiente($id)
        ]);
    }

    /** GET socios/{id}/documentos/{doc} — entrega el archivo (solo con sesión y rol de caja) */
    public function documento(array $p, ?array $auth): void
    {
        $d = Socio::documento((int)$p['id'], (int)$p['doc']);
        if (!$d) fallar('Documento no encontrado.', 404);
        Almacen::enviar($d['ruta'], $d['mime'], strtolower($d['tipo']) . '-' . $d['socio_id']);
    }
}
