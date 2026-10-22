<?php
class AsistenciaController
{
    /** POST asistencias/lectura {codigo} — lector de código de barras (entrada / salida) */
    public function lectura(array $p, ?array $auth): void
    {
        $codigo = trim((string)(entrada()['codigo'] ?? ''));
        if ($codigo === '') fallar('Escanea o escribe el código del socio.', 422);
        responder(Asistencia::escanear($codigo, (int)$auth['sub']));
    }

    /** GET asistencias/bitacora?dia= — todas las lecturas del día, incluidas las rechazadas */
    public function bitacora(array $p, ?array $auth): void
    {
        $dia = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['dia'] ?? '')) ? $_GET['dia'] : hoy();
        responder(['dia' => $dia, 'lecturas' => Asistencia::bitacoraDelDia($dia)]);
    }
}
