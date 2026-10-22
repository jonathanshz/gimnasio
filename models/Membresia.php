<?php

/** Catálogo de planes y membresías de los socios. */
class Plan
{
    public static function vista(array $p): array
    {
        return [
            'id' => (int)$p['id'],
            'clave' => $p['clave'],
            'nombre' => $p['nombre'],
            'duracion_dias' => (int)$p['duracion_dias'],
            'precio' => (float)$p['precio'],
            'descripcion' => $p['descripcion'],
            'beneficios' => json_decode($p['beneficios'] ?: '[]', true) ?: [],
            'activo' => (int)$p['activo']
        ];
    }
    public static function listar(): array
    {
        return array_map([self::class, 'vista'], Database::conectar()->query('SELECT * FROM planes WHERE activo = 1 ORDER BY precio')->fetchAll());
    }
    public static function porId(int $id, bool $soloActivos = true): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM planes WHERE id = ?' . ($soloActivos ? ' AND activo = 1' : ''));
        $st->execute([$id]);
        $p = $st->fetch();
        return $p ? self::vista($p) : null;
    }
}

class Membresia
{
    /** Marca como VENCIDAS las que ya pasaron su fecha (se llama al consultar; no hace falta un proceso programado). */
    public static function sincronizar(): void
    {
        Database::conectar()->prepare("UPDATE membresias SET estado = 'VENCIDA' WHERE estado = 'ACTIVA' AND vence < ?")->execute([hoy()]);
    }

    /** Añade estado calculado, días restantes, porcentaje y datos del plan. Mismas claves que usaba el prototipo. */
    public static function enriquecer(array $m): array
    {
        $h = hoy();
        $ini = $m['inicio'];
        $fin = $m['vence'];
        $estado = strtolower($m['estado']);
        if ($estado === 'activa' && $h > $fin) $estado = 'vencida';
        if ($estado === 'activa' && $h < $ini) $estado = 'pendiente';
        $total = max(1, diasEntre($ini, $fin) + 1);
        $restan = $h > $fin ? 0 : diasEntre($h < $ini ? $ini : $h, $fin) + 1;
        return [
            'id' => (int)$m['id'],
            'socio_id' => (int)$m['socio_id'],
            'plan_id' => (int)$m['plan_id'],
            'fecha_inicio' => $ini,
            'fecha_fin' => $fin,
            'estado' => $estado,
            'plan' => $m['plan_nombre'],
            'precio' => (float)$m['plan_precio'],
            'precio_aplicado' => (float)$m['precio_aplicado'],
            'beneficios' => json_decode($m['plan_beneficios'] ?: '[]', true) ?: [],
            'descripcion' => $m['plan_descripcion'],
            'dias_totales' => $total,
            'dias_restantes' => $restan,
            'porcentaje' => (int)round(min(100, $restan / $total * 100)),
            'por_vencer' => $estado === 'activa' && $restan <= DIAS_AVISO_VENCIMIENTO,
            'creado_en' => $m['creado_en']
        ];
    }

    private static function filas(int $socioId): array
    {
        $st = Database::conectar()->prepare("SELECT m.*, p.nombre AS plan_nombre, p.precio AS plan_precio, p.beneficios AS plan_beneficios, p.descripcion AS plan_descripcion
            FROM membresias m JOIN planes p ON p.id = m.plan_id WHERE m.socio_id = ? ORDER BY m.inicio DESC, m.id DESC");
        $st->execute([$socioId]);
        return array_map([self::class, 'enriquecer'], $st->fetchAll());
    }

    public static function historial(int $socioId): array
    {
        return self::filas($socioId);
    }

    public static function actual(int $socioId): ?array
    {
        $ms = array_values(array_filter(self::filas($socioId), fn($m) => $m['estado'] !== 'cancelada'));
        if (!$ms) return null;
        foreach ($ms as $m) if ($m['estado'] === 'activa') return $m;
        usort($ms, fn($a, $b) => strcmp($b['fecha_fin'], $a['fecha_fin']));
        return $ms[0];
    }

    /** Membresía ya pagada que empezará en el futuro. */
    public static function siguiente(int $socioId): ?array
    {
        $f = array_filter(self::filas($socioId), fn($m) => $m['estado'] === 'pendiente');
        usort($f, fn($a, $b) => strcmp($a['fecha_inicio'], $b['fecha_inicio']));
        return $f ? array_values($f)[0] : null;
    }

    /** Fecha en que empezaría una compra hoy: el día siguiente al fin de la membresía vigente, o hoy. */
    public static function inicioParaNueva(int $socioId): string
    {
        $st = Database::conectar()->prepare("SELECT MAX(vence) FROM membresias WHERE socio_id = ? AND estado = 'ACTIVA' AND vence >= ?");
        $st->execute([$socioId, hoy()]);
        $vig = $st->fetchColumn();
        return $vig ? sumarDias($vig, 1) : hoy();
    }

    /** Crea la membresía dentro de la transacción del llamador. Devuelve el id. */
    public static function crear(int $socioId, array $plan, ?int $staffId): int
    {
        $db = Database::conectar();
        $ini = self::inicioParaNueva($socioId);
        $db->prepare("INSERT INTO membresias (socio_id, plan_id, inicio, vence, estado, asignada_por, creado_en, precio_aplicado) VALUES (?,?,?,?,'ACTIVA',?,?,?)")
            ->execute([$socioId, $plan['id'], $ini, sumarDias($ini, $plan['duracion_dias'] - 1), $staffId, ahora(), $plan['precio']]);
        return (int)$db->lastInsertId();
    }

    public static function resumenActivos(): array
    {
        $db = Database::conectar();
        self::sincronizar();
        $h = hoy();
        $activos = (int)$db->query("SELECT COUNT(DISTINCT socio_id) FROM membresias WHERE estado = 'ACTIVA' AND inicio <= '$h' AND vence >= '$h'")->fetchColumn();
        $porPlan = $db->query("SELECT p.nombre, COUNT(DISTINCT m.socio_id) n FROM membresias m JOIN planes p ON p.id = m.plan_id
            WHERE m.estado = 'ACTIVA' AND m.inicio <= '$h' AND m.vence >= '$h' GROUP BY p.id, p.nombre ORDER BY n DESC")->fetchAll();
        $lim = sumarDias($h, DIAS_AVISO_VENCIMIENTO - 1);
        $venc = $db->query("SELECT s.id, TRIM(CONCAT(s.nombre,' ',s.apellido_paterno,' ',s.apellido_materno)) AS nombre_completo, p.nombre AS plan, m.vence AS fecha_fin
            FROM membresias m JOIN socios s ON s.id = m.socio_id JOIN planes p ON p.id = m.plan_id
            WHERE m.estado = 'ACTIVA' AND m.inicio <= '$h' AND m.vence BETWEEN '$h' AND '$lim'
              AND NOT EXISTS (SELECT 1 FROM membresias n WHERE n.socio_id = m.socio_id AND n.estado = 'ACTIVA' AND n.inicio > m.vence)
            ORDER BY m.vence")->fetchAll();
        return ['activos' => $activos, 'por_plan' => $porPlan, 'por_vencer' => $venc];
    }
}
