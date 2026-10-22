<?php
/** Pagos (tabla pagos) y fichas de pago en efectivo (tabla solicitudes_cambio). */
class Pago
{
    const SELECT = "SELECT p.*, TRIM(CONCAT(s.nombre,' ',s.apellido_paterno,' ',s.apellido_materno)) AS socio, s.usuario AS socio_usuario,
            pl.nombre AS plan, m.inicio AS fecha_inicio, m.vence AS fecha_fin, st.nombre AS cajero
        FROM pagos p JOIN socios s ON s.id = p.socio_id LEFT JOIN planes pl ON pl.id = p.plan_id
        LEFT JOIN membresias m ON m.id = p.membresia_id LEFT JOIN staff st ON st.id = p.registrado_por";

    public static function vista(array $p): array
    {
        return ['id' => (int)$p['id'], 'folio' => $p['folio'], 'socio_id' => (int)$p['socio_id'], 'socio' => $p['socio'], 'socio_usuario' => $p['socio_usuario'],
            'concepto' => $p['concepto'], 'monto' => (float)$p['monto'], 'metodo' => $p['metodo'], 'estado' => 'pagado', 'plan' => $p['plan'],
            'membresia_id' => $p['membresia_id'] ? (int)$p['membresia_id'] : null, 'fecha_inicio' => $p['fecha_inicio'], 'fecha_fin' => $p['fecha_fin'],
            'creado_en' => $p['fecha'], 'pagado_en' => $p['fecha'], 'cajero' => $p['cajero'], 'tarjeta_marca' => $p['tarjeta_marca'],
            'tarjeta_ultimos4' => $p['tarjeta_ultimos4'], 'referencia_pago' => $p['referencia_pago']];
    }

    private static function folioNuevo(): string
    {
        $db = Database::conectar(); $st = $db->prepare('SELECT 1 FROM pagos WHERE folio = ?');
        do { $f = 'R' . date('ymd') . strtoupper(bin2hex(random_bytes(3))); $st->execute([$f]); } while ($st->fetchColumn());
        return $f;
    }

    /**
     * Cobra un plan: crea la membresía y el pago en UNA transacción. El precio sale del catálogo (o de la ficha), nunca del navegador.
     * $extra: referencia_pago, tarjeta_marca, tarjeta_ultimos4, referencia_externa.
     */
    public static function cobrar(int $socioId, array $plan, string $metodo, ?int $staffId, array $extra = []): array
    {
        $db = Database::conectar(); $propia = !$db->inTransaction();
        if ($propia) $db->beginTransaction();
        try {
            $mid = Membresia::crear($socioId, $plan, $staffId);
            $folio = self::folioNuevo();
            $db->prepare('INSERT INTO pagos (socio_id, membresia_id, folio, concepto, monto, metodo, fecha, registrado_por, plan_id, referencia_pago, tarjeta_marca, tarjeta_ultimos4, referencia_externa)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
               ->execute([$socioId, $mid, $folio, 'Membresía ' . $plan['nombre'], $plan['precio'], $metodo, ahora(), $staffId, $plan['id'],
                   $extra['referencia_pago'] ?? null, $extra['tarjeta_marca'] ?? null, $extra['tarjeta_ultimos4'] ?? null, $extra['referencia_externa'] ?? null]);
            $pid = (int)$db->lastInsertId();
            if ($propia) $db->commit();
            return self::porId($pid);
        } catch (Throwable $e) { if ($propia && $db->inTransaction()) $db->rollBack(); throw $e; }
    }

    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare(self::SELECT . ' WHERE p.id = ?'); $st->execute([$id]); $p = $st->fetch(); return $p ? self::vista($p) : null;
    }
    public static function porFolio(string $folio, ?int $socioId = null): ?array
    {
        $sql = self::SELECT . ' WHERE p.folio = ?' . ($socioId !== null ? ' AND p.socio_id = ?' : '');
        $st = Database::conectar()->prepare($sql); $st->execute($socioId !== null ? [$folio, $socioId] : [$folio]);
        $p = $st->fetch(); return $p ? self::vista($p) : null;
    }
    public static function porSocio(int $socioId, int $limite = 200): array
    {
        $st = Database::conectar()->prepare(self::SELECT . ' WHERE p.socio_id = ? ORDER BY p.fecha DESC, p.id DESC LIMIT ' . (int)$limite); $st->execute([$socioId]);
        return array_map([self::class, 'vista'], $st->fetchAll());
    }
    public static function listar(?string $desde = null, ?string $hasta = null, int $limite = 300): array
    {
        $w = []; $par = [];
        if ($desde) { $w[] = 'p.fecha >= ?'; $par[] = $desde . ' 00:00:00'; }
        if ($hasta) { $w[] = 'p.fecha <= ?'; $par[] = $hasta . ' 23:59:59'; }
        $st = Database::conectar()->prepare(self::SELECT . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . ' ORDER BY p.fecha DESC, p.id DESC LIMIT ' . (int)$limite);
        $st->execute($par); return array_map([self::class, 'vista'], $st->fetchAll());
    }
    public static function corte(string $dia): array
    {
        $st = Database::conectar()->prepare('SELECT metodo, COUNT(*) AS pagos, SUM(monto) AS total FROM pagos WHERE fecha BETWEEN ? AND ? GROUP BY metodo ORDER BY metodo');
        $st->execute(["$dia 00:00:00", "$dia 23:59:59"]);
        return array_map(fn($r) => ['metodo' => $r['metodo'], 'pagos' => (int)$r['pagos'], 'total' => (float)$r['total']], $st->fetchAll());
    }
    public static function ingresosMes(): float
    {
        $st = Database::conectar()->prepare('SELECT COALESCE(SUM(monto),0) FROM pagos WHERE fecha >= ?'); $st->execute([date('Y-m-01') . ' 00:00:00']); return (float)$st->fetchColumn();
    }
}

class Ficha
{
    const SELECT = "SELECT f.*, p.nombre AS plan_nombre, TRIM(CONCAT(s.nombre,' ',s.apellido_paterno,' ',s.apellido_materno)) AS socio, s.usuario AS socio_usuario
        FROM solicitudes_cambio f JOIN planes p ON p.id = f.plan_id JOIN socios s ON s.id = f.socio_id";

    public static function vista(array $f): array
    {
        return ['id' => (int)$f['id'], 'socio_id' => (int)$f['socio_id'], 'socio' => $f['socio'], 'socio_usuario' => $f['socio_usuario'], 'plan_id' => (int)$f['plan_id'],
            'plan' => $f['plan_nombre'], 'concepto' => 'Membresía ' . $f['plan_nombre'], 'monto' => (float)$f['monto'], 'referencia_pago' => $f['referencia'],
            'estado' => strtolower($f['estado']), 'metodo' => 'efectivo', 'creado_en' => $f['creado_en'], 'expira_en' => $f['expira_en']];
    }

    public static function expirar(): void
    {
        Database::conectar()->prepare("UPDATE solicitudes_cambio SET estado = 'EXPIRADA' WHERE estado = 'PENDIENTE' AND expira_en < ?")->execute([ahora()]);
    }

    public static function crear(int $socioId, array $plan): array
    {
        $db = Database::conectar(); $db->beginTransaction();
        try {
            $db->prepare("UPDATE solicitudes_cambio SET estado = 'CANCELADA' WHERE socio_id = ? AND estado = 'PENDIENTE'")->execute([$socioId]);
            $alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $st = $db->prepare('SELECT 1 FROM solicitudes_cambio WHERE referencia = ?');
            do { $ref = 'EF-'; for ($i = 0; $i < 8; $i++) $ref .= $alfabeto[random_int(0, 31)]; $st->execute([$ref]); } while ($st->fetchColumn());
            $db->prepare("INSERT INTO solicitudes_cambio (socio_id, plan_id, estado, creado_en, referencia, monto, expira_en) VALUES (?,?,'PENDIENTE',?,?,?,?)")
               ->execute([$socioId, $plan['id'], ahora(), $ref, $plan['precio'], date('Y-m-d H:i:s', time() + HORAS_FICHA_EFECTIVO * 3600)]);
            $id = (int)$db->lastInsertId(); $db->commit();
            return self::porId($id);
        } catch (Throwable $e) { $db->rollBack(); throw $e; }
    }
    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare(self::SELECT . ' WHERE f.id = ?'); $st->execute([$id]); $f = $st->fetch(); return $f ? self::vista($f) : null;
    }
    public static function pendiente(int $socioId): ?array
    {
        self::expirar();
        $st = Database::conectar()->prepare(self::SELECT . " WHERE f.socio_id = ? AND f.estado = 'PENDIENTE' ORDER BY f.id DESC LIMIT 1"); $st->execute([$socioId]);
        $f = $st->fetch(); return $f ? self::vista($f) : null;
    }
    public static function pendientes(): array
    {
        self::expirar();
        return array_map([self::class, 'vista'], Database::conectar()->query(self::SELECT . " WHERE f.estado = 'PENDIENTE' ORDER BY f.expira_en")->fetchAll());
    }
    public static function cancelar(int $socioId, int $id): void
    {
        Database::conectar()->prepare("UPDATE solicitudes_cambio SET estado = 'CANCELADA' WHERE id = ? AND socio_id = ? AND estado = 'PENDIENTE'")->execute([$id, $socioId]);
    }

    /** Cobra la ficha en recepción: crea pago + membresía y la marca PAGADA, todo en una transacción. */
    public static function cobrar(string $referencia, int $staffId): array
    {
        self::expirar();
        $db = Database::conectar(); $db->beginTransaction();
        try {
            $st = $db->prepare('SELECT * FROM solicitudes_cambio WHERE referencia = ? FOR UPDATE'); $st->execute([strtoupper(trim($referencia))]);
            $f = $st->fetch();
            if (!$f) { $db->rollBack(); return ['ok' => false, 'error' => 'No existe una ficha con esa referencia.']; }
            if ($f['estado'] !== 'PENDIENTE') { $db->rollBack(); return ['ok' => false, 'error' => 'La ficha ' . $f['referencia'] . ' está ' . strtolower($f['estado']) . '.']; }
            $plan = Plan::porId((int)$f['plan_id'], false);
            $plan['precio'] = (float)$f['monto'];                       // se respeta el precio con el que se generó la ficha
            $pago = Pago::cobrar((int)$f['socio_id'], $plan, 'efectivo', $staffId, ['referencia_pago' => $f['referencia']]);
            $db->prepare("UPDATE solicitudes_cambio SET estado = 'PAGADA', pago_id = ? WHERE id = ?")->execute([$pago['id'], $f['id']]);
            $db->commit();
            return ['ok' => true, 'pago' => $pago];
        } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    }

    public static function cancelarPendientesDe(int $socioId): void
    {
        Database::conectar()->prepare("UPDATE solicitudes_cambio SET estado = 'CANCELADA' WHERE socio_id = ? AND estado = 'PENDIENTE'")->execute([$socioId]);
    }
}
