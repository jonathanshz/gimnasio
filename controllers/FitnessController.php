<?php
/** Avance, rutina y nutrición. El mismo código sirve al socio (su propio expediente) y al coach (el de cualquier socio). */
class FitnessController
{
    const OBJETIVOS = ['perder_grasa', 'ganar_musculo', 'recomposicion', 'fuerza', 'resistencia', 'salud'];
    const NIVELES = ['principiante', 'intermedio', 'avanzado'];

    private function paquete(int $socioId): array
    {
        $s = Socio::vista(Socio::porId($socioId));
        return ['socio' => $s, 'expediente' => Fitness::expediente($socioId), 'mediciones' => Fitness::mediciones($socioId), 'rutina' => Fitness::rutinaAsignada($socioId)];
    }

    private static function num($v): ?float { return ($v === '' || $v === null) ? null : (is_numeric($v) ? (float)$v : NAN); }

    /** Valida peso/estatura/% y devuelve mensaje de error o null. */
    private static function errorMedicion(array $d, bool $exigirGrasa = true): ?string
    {
        $peso = self::num($d['peso'] ?? null); $est = self::num($d['estatura'] ?? null);
        if ($peso === null || is_nan($peso) || $peso < 25 || $peso > 300) return 'El peso debe estar entre 25 y 300 kg.';
        if ($est === null || is_nan($est) || $est < 100 || $est > 230) return 'La estatura debe estar entre 100 y 230 cm.';
        $g = self::num($d['grasa'] ?? null); $mu = self::num($d['musculo'] ?? null);
        if ($g !== null && (is_nan($g) || $g < 3 || $g > 70)) return 'El % de grasa debe estar entre 3 y 70.';
        if ($mu !== null && (is_nan($mu) || $mu < 10 || $mu > 70)) return 'El % muscular debe estar entre 10 y 70.';
        return null;
    }

    private function guardarPerfil(int $socioId, array $d, ?int $staffId): void
    {
        if (!in_array($d['objetivo'] ?? '', self::OBJETIVOS, true)) fallar('Elige un objetivo.', 422);
        $nivel = in_array($d['nivel'] ?? '', self::NIVELES, true) ? $d['nivel'] : 'principiante';
        $dias = (int)($d['dias'] ?? 3); if ($dias < 3 || $dias > 6) fallar('Los días de entrenamiento van de 3 a 6.', 422);
        if ($e = self::errorMedicion($d)) fallar($e, 422);
        Fitness::guardarExpediente($socioId, $d['objetivo'], $nivel, $dias, $staffId);
        $meds = Fitness::mediciones($socioId); $u = $meds ? end($meds) : null;
        $peso = (float)$d['peso']; $est = (float)$d['estatura'];
        $grasa = array_key_exists('grasa', $d) ? self::num($d['grasa']) : ($u['porcentaje_grasa'] ?? null);
        $musc = array_key_exists('musculo', $d) ? self::num($d['musculo']) : ($u['porcentaje_musculo'] ?? null);
        if (!$u || $u['peso_kg'] !== $peso || $u['estatura_cm'] !== $est || !empty($d['grasa']) || !empty($d['musculo']))
            Fitness::registrarMedicion($socioId, $peso, $est, $grasa, $musc, $staffId);
    }

    private function guardarMedicion(int $socioId, array $d, ?int $staffId): array
    {
        if ($e = self::errorMedicion($d)) fallar($e, 422);
        return Fitness::registrarMedicion($socioId, (float)$d['peso'], (float)$d['estatura'], self::num($d['grasa'] ?? null), self::num($d['musculo'] ?? null), $staffId);
    }

    // ---- Socio
    public function avance(array $p, ?array $auth): void { responder($this->paquete((int)$auth['sub'])); }
    public function perfilSocio(array $p, ?array $auth): void { $this->guardarPerfil((int)$auth['sub'], entrada(), null); responder($this->paquete((int)$auth['sub'])); }
    public function medicionSocio(array $p, ?array $auth): void { $r = $this->guardarMedicion((int)$auth['sub'], entrada(), null); responder($r + $this->paquete((int)$auth['sub'])); }

    // ---- Coach
    private function socio(array $p): int
    {
        $s = Socio::porId((int)$p['id']); if (!$s) fallar('Socio no encontrado.', 404); return (int)$s['id'];
    }
    public function ver(array $p, ?array $auth): void { responder($this->paquete($this->socio($p))); }
    public function perfilCoach(array $p, ?array $auth): void { $id = $this->socio($p); $this->guardarPerfil($id, entrada(), (int)$auth['sub']); responder($this->paquete($id)); }
    public function medicionCoach(array $p, ?array $auth): void { $id = $this->socio($p); $r = $this->guardarMedicion($id, entrada(), (int)$auth['sub']); responder($r + $this->paquete($id)); }
    public function asignarRutina(array $p, ?array $auth): void
    {
        $id = $this->socio($p); $plan = entrada()['plan'] ?? null;
        if (!is_array($plan)) fallar('Falta la rutina.', 422);
        Fitness::asignarRutina($id, $plan, ['id' => (int)$auth['sub'], 'nombre' => $auth['nombre']]);
        responder($this->paquete($id), 201);
    }
    public function quitarRutina(array $p, ?array $auth): void
    {
        $id = $this->socio($p); Fitness::quitarRutina($id, (int)$p['rid']); responder($this->paquete($id));
    }
}
