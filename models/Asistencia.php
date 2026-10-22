<?php
/** Visitas (asistencias), bitácora de lecturas (accesos_log) y estado de las máquinas. */
class Asistencia
{
    private static function limiteEstancia(): string { return date('Y-m-d H:i:s', time() - HORAS_MAX_ESTANCIA * 3600); }

    /** Visita abierta (sin salida) y reciente, o null. */
    public static function dentro(int $socioId): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM asistencias WHERE socio_id = ? AND salida IS NULL AND entrada > ? ORDER BY id DESC LIMIT 1');
        $st->execute([$socioId, self::limiteEstancia()]); return $st->fetch() ?: null;
    }

    public static function visitas(int $socioId, int $n = 999): array
    {
        $st = Database::conectar()->prepare('SELECT id, entrada, salida FROM asistencias WHERE socio_id = ? ORDER BY entrada DESC, id DESC LIMIT ' . (int)$n);
        $st->execute([$socioId]); return $st->fetchAll();
    }
    public static function contarDesde(int $socioId, int $dias): int
    {
        $st = Database::conectar()->prepare('SELECT COUNT(*) FROM asistencias WHERE socio_id = ? AND entrada >= ?');
        $st->execute([$socioId, sumarDias(hoy(), -$dias) . ' 00:00:00']); return (int)$st->fetchColumn();
    }

    private static function log(?int $socioId, string $codigo, string $resultado, ?string $motivo, ?string $mov, ?int $staffId): void
    {
        Database::conectar()->prepare('INSERT INTO accesos_log (socio_id, codigo_leido, resultado, motivo, movimiento, registrado_por, creado_en) VALUES (?,?,?,?,?,?,?)')
            ->execute([$socioId, recortar($codigo, 30), $resultado, $motivo, $mov, $staffId, ahora()]);
    }

    /** Lector de código: alterna ENTRADA / SALIDA y registra también los intentos rechazados. */
    public static function escanear(string $codigo, int $staffId): array
    {
        $codigo = strtoupper(trim($codigo));
        if (!codigoBarrasValido($codigo)) { self::log(null, $codigo, 'CODIGO_INVALIDO', 'Dígito verificador incorrecto', null, $staffId); return ['ok' => false, 'motivo' => 'Código de barras no válido o mal leído.']; }
        $s = Socio::porCodigo($codigo);
        if (!$s || !$s['activo']) { self::log(null, $codigo, 'CODIGO_INVALIDO', 'No pertenece a ningún socio activo', null, $staffId); return ['ok' => false, 'motivo' => 'El código no pertenece a ningún socio.']; }
        $socio = Socio::vista($s); $id = (int)$s['id'];

        $db = Database::conectar(); $db->beginTransaction();
        try {
            $db->prepare('SELECT id FROM socios WHERE id = ? FOR UPDATE')->execute([$id]);      // evita dos lecturas simultáneas del mismo socio
            Membresia::sincronizar();
            $m = Membresia::actual($id);
            $dentro = self::dentro($id);
            if ($dentro) {
                $db->prepare('UPDATE asistencias SET salida = ? WHERE id = ?')->execute([ahora(), $dentro['id']]);
                self::log($id, $codigo, 'PERMITIDO', null, 'SALIDA', $staffId);
                $db->commit();
                return ['ok' => true, 'tipo' => 'SALIDA', 'socio' => $socio, 'm' => $m, 'hora' => ahora(), 'minutos' => (int)round((time() - strtotime($dentro['entrada'])) / 60)];
            }
            if (!$m || $m['estado'] !== 'activa') {
                $motivo = !$m ? 'El socio no tiene membresía asignada.' : 'Membresía ' . $m['estado'] . ' (vence ' . $m['fecha_fin'] . ').';
                self::log($id, $codigo, !$m ? 'SIN_MEMBRESIA' : 'MEMBRESIA_VENCIDA', $motivo, 'ENTRADA', $staffId);
                $db->commit();
                return ['ok' => false, 'socio' => $socio, 'm' => $m, 'motivo' => $motivo];
            }
            $db->prepare('INSERT INTO asistencias (socio_id, entrada, registrado_por) VALUES (?,?,?)')->execute([$id, ahora(), $staffId]);
            self::log($id, $codigo, 'PERMITIDO', null, 'ENTRADA', $staffId);
            $db->commit();
            return ['ok' => true, 'tipo' => 'ENTRADA', 'socio' => $socio, 'm' => $m, 'hora' => ahora()];
        } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    }

    public static function kpisHoy(): array
    {
        $db = Database::conectar(); $h = hoy() . ' 00:00:00';
        $q = fn(string $sql, array $p) => (function () use ($db, $sql, $p) { $st = $db->prepare($sql); $st->execute($p); return (int)$st->fetchColumn(); })();
        return ['dentro' => $q('SELECT COUNT(*) FROM asistencias WHERE salida IS NULL AND entrada >= ? AND entrada > ?', [$h, self::limiteEstancia()]),
                'entradas' => $q('SELECT COUNT(*) FROM asistencias WHERE entrada >= ?', [$h]),
                'rechazos' => $q("SELECT COUNT(*) FROM accesos_log WHERE resultado <> 'PERMITIDO' AND creado_en >= ?", [$h])];
    }
    public static function recientes(int $n = 6): array
    {
        return Database::conectar()->query("SELECT a.socio_id, a.creado_en, LOWER(a.movimiento) AS tipo_movimiento, TRIM(CONCAT(s.nombre,' ',s.apellido_paterno,' ',s.apellido_materno)) AS socio
            FROM accesos_log a JOIN socios s ON s.id = a.socio_id WHERE a.resultado = 'PERMITIDO' ORDER BY a.id DESC LIMIT " . (int)$n)->fetchAll();
    }
    public static function afluenciaPorHora(): array
    {
        $h = array_fill(5, 18, 0);
        $st = Database::conectar()->prepare('SELECT HOUR(entrada) AS h, COUNT(*) AS n FROM asistencias WHERE entrada >= ? GROUP BY HOUR(entrada)');
        $st->execute([sumarDias(hoy(), -30) . ' 00:00:00']);
        foreach ($st->fetchAll() as $r) if (isset($h[(int)$r['h']])) $h[(int)$r['h']] = (int)$r['n'];
        return $h;
    }
    public static function bitacoraDelDia(string $dia): array
    {
        $st = Database::conectar()->prepare("SELECT a.id, a.codigo_leido, LOWER(a.resultado) AS resultado, a.motivo, LOWER(a.movimiento) AS tipo_movimiento, a.creado_en,
                COALESCE(TRIM(CONCAT(s.nombre,' ',s.apellido_paterno,' ',s.apellido_materno)), '—') AS socio, COALESCE(st.nombre, '—') AS registro
            FROM accesos_log a LEFT JOIN socios s ON s.id = a.socio_id LEFT JOIN staff st ON st.id = a.registrado_por
            WHERE a.creado_en BETWEEN ? AND ? ORDER BY a.id DESC LIMIT 500");
        $st->execute(["$dia 00:00:00", "$dia 23:59:59"]); return $st->fetchAll();
    }
}

class Maquina
{
    public static function listar(): array
    {
        return array_map(fn($m) => ['id' => (int)$m['id'], 'nombre' => $m['nombre'], 'zona' => $m['zona'], 'disponibilidad' => $m['estado'], 'estado' => $m['estado'], 'actualizado_en' => $m['actualizado_en']],
            Database::conectar()->query('SELECT * FROM maquinas ORDER BY zona, nombre')->fetchAll());
    }
    public static function cambiarEstado(int $id, string $estado): bool
    {
        $st = Database::conectar()->prepare('UPDATE maquinas SET estado = ?, actualizado_en = ? WHERE id = ?'); $st->execute([$estado, ahora(), $id]);
        $e = Database::conectar()->prepare('SELECT 1 FROM maquinas WHERE id = ?'); $e->execute([$id]); return (bool)$e->fetchColumn();
    }
    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM maquinas WHERE id = ?'); $st->execute([$id]); return $st->fetch() ?: null;
    }
    public static function conteo(): array
    {
        $c = ['LIBRE' => 0, 'OCUPADA' => 0, 'MANTENIMIENTO' => 0];
        foreach (Database::conectar()->query('SELECT estado, COUNT(*) n FROM maquinas GROUP BY estado')->fetchAll() as $r) $c[$r['estado']] = (int)$r['n'];
        return $c;
    }
}
