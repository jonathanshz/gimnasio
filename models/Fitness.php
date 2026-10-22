<?php

/** Expediente (objetivo/nivel), mediciones y rutinas asignadas por el coach. */
class Fitness
{
    public static function expediente(int $socioId): ?array
    {
        $st = Database::conectar()->prepare('SELECT objetivo, nivel, dias_entrenamiento, actualizado_en FROM expedientes WHERE socio_id = ?');
        $st->execute([$socioId]);
        $e = $st->fetch();
        if (!$e) return null;
        return ['objetivo_principal' => $e['objetivo'], 'nivel' => $e['nivel'], 'dias_entrenamiento' => $e['dias_entrenamiento'] === null ? null : (int)$e['dias_entrenamiento'], 'actualizado_en' => $e['actualizado_en']];
    }
    public static function guardarExpediente(int $socioId, string $objetivo, string $nivel, int $dias, ?int $staffId): void
    {
        Database::conectar()->prepare('INSERT INTO expedientes (socio_id, objetivo, nivel, dias_entrenamiento, actualizado_por, actualizado_en) VALUES (?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE objetivo = VALUES(objetivo), nivel = VALUES(nivel), dias_entrenamiento = VALUES(dias_entrenamiento), actualizado_por = VALUES(actualizado_por), actualizado_en = VALUES(actualizado_en)')
            ->execute([$socioId, $objetivo, $nivel, $dias, $staffId, ahora()]);
    }

    public static function imc(float $peso, float $estaturaCm): ?float
    {
        $m = $estaturaCm / 100;
        return $m > 0 ? round($peso / ($m * $m), 1) : null;
    }
    public static function mediciones(int $socioId): array
    {
        $st = Database::conectar()->prepare("SELECT m.*, st.nombre AS staff FROM mediciones m LEFT JOIN staff st ON st.id = m.registrado_por WHERE m.socio_id = ? ORDER BY m.fecha, m.id");
        $st->execute([$socioId]);
        return array_map(fn($m) => [
            'id' => (int)$m['id'],
            'fecha_medicion' => $m['fecha'],
            'peso_kg' => (float)$m['peso'],
            'estatura_cm' => $m['estatura'] === null ? null : (float)$m['estatura'],
            'imc' => (float)$m['imc'],
            'porcentaje_grasa' => $m['grasa_corporal'] === null ? null : (float)$m['grasa_corporal'],
            'porcentaje_musculo' => $m['masa_muscular'] === null ? null : (float)$m['masa_muscular'],
            'registro' => $m['staff'] ? explode(' ', $m['staff'])[0] : 'Tú'
        ], $st->fetchAll());
    }
    public static function registrarMedicion(int $socioId, float $peso, float $estatura, ?float $grasa, ?float $musculo, ?int $staffId): array
    {
        $imc = self::imc($peso, $estatura);
        Database::conectar()->prepare('INSERT INTO mediciones (socio_id, fecha, peso, grasa_corporal, imc, estatura, masa_muscular, registrado_por) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$socioId, hoy(), $peso, $grasa, $imc, $estatura, $musculo, $staffId]);
        return ['imc' => $imc];
    }

    public static function rutinaAsignada(int $socioId): ?array
    {
        $db = Database::conectar();
        $st = $db->prepare('SELECT * FROM rutinas WHERE socio_id = ? AND activa = 1 ORDER BY vigente_desde DESC, id DESC LIMIT 1');
        $st->execute([$socioId]);
        $r = $st->fetch();
        if (!$r) return null;
        $st = $db->prepare('SELECT * FROM rutina_ejercicios WHERE rutina_id = ? ORDER BY dia_numero, orden');
        $st->execute([$r['id']]);
        $dias = [];
        foreach ($st->fetchAll() as $e) {
            $k = (int)$e['dia_numero'];
            if (!isset($dias[$k])) $dias[$k] = ['dia_numero' => $k, 'dia' => $e['dia'], 'enfoque' => $e['enfoque'], 'ejercicios' => []];
            $dias[$k]['ejercicios'][] = ['nombre' => $e['nombre'], 'series' => (int)$e['series'], 'repeticiones' => $e['repeticiones'], 'descanso' => (int)$e['descanso']];
        }
        return ['id' => (int)$r['id'], 'nombre' => $r['nombre'], 'objetivo' => $r['objetivo'], 'desde' => $r['vigente_desde'], 'coach' => $r['entrenador'], 'dias' => array_values($dias)];
    }

    /** $plan viene del generador del navegador del coach: se valida forma y longitudes antes de guardar. */
    public static function asignarRutina(int $socioId, array $plan, array $coach): void
    {
        $semana = $plan['semana'] ?? null;
        if (!is_array($semana) || !$semana || count($semana) > 7) fallar('La rutina no es válida.', 422);
        $db = Database::conectar();
        $db->beginTransaction();
        try {
            $db->prepare('UPDATE rutinas SET activa = 0, vigente_hasta = ? WHERE socio_id = ? AND activa = 1')->execute([hoy(), $socioId]);
            $db->prepare('INSERT INTO rutinas (socio_id, nombre, entrenador, vigente_desde, activa, objetivo, nivel, dias_semana, coach_id) VALUES (?,?,?,?,1,?,?,?,?)')
                ->execute([
                    $socioId,
                    recortar((string)($plan['nombre'] ?? 'Rutina'), 120),
                    $coach['nombre'],
                    hoy(),
                    recortar((string)($plan['objetivo'] ?? ''), 20),
                    recortar((string)($plan['nivel'] ?? ''), 12),
                    (int)($plan['diasEntreno'] ?? count($semana)),
                    $coach['id']
                ]);
            $rid = (int)$db->lastInsertId();
            $ins = $db->prepare('INSERT INTO rutina_ejercicios (rutina_id, dia, orden, nombre, series, repeticiones, descanso, dia_numero, enfoque) VALUES (?,?,?,?,?,?,?,?,?)');
            foreach (array_values($semana) as $i => $d) {
                $ejs = $d['ejercicios'] ?? [];
                if (!is_array($ejs) || !$ejs || count($ejs) > 12) throw new InvalidArgumentException('Rutina inválida.');
                foreach (array_values($ejs) as $o => $x) {
                    $ins->execute([
                        $rid,
                        recortar((string)($d['dia'] ?? 'Día ' . ($i + 1)), 15),
                        $o + 1,
                        recortar((string)($x['nombre'] ?? ''), 120),
                        max(1, min(10, (int)($x['series'] ?? 3))),
                        recortar((string)($x['reps'] ?? ''), 12),
                        recortar((string)(int)($x['descanso'] ?? 60), 10),
                        $i + 1,
                        recortar((string)($d['enfoque'] ?? ''), 60)
                    ]);
                }
            }
            $db->commit();
        } catch (InvalidArgumentException $e) {
            $db->rollBack();
            fallar($e->getMessage(), 422);
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
    public static function quitarRutina(int $socioId, int $rutinaId): void
    {
        Database::conectar()->prepare('UPDATE rutinas SET activa = 0, vigente_hasta = ? WHERE id = ? AND socio_id = ? AND activa = 1')->execute([hoy(), $rutinaId, $socioId]);
    }
}
