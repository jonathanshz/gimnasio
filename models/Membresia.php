<?php
class Membresia
{
    private PDO $db;
    public function __construct() { $this->db = Database::conectar(); }

    public function tipos(): array
    {
        return $this->db->query(
            'SELECT id, nombre, duracion_dias, precio, descripcion FROM tipos_membresia WHERE activo = 1 ORDER BY duracion_dias'
        )->fetchAll();
    }

    public function tipo(int $id): ?array
    {
        $st = $this->db->prepare('SELECT * FROM tipos_membresia WHERE id = ? AND activo = 1');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    /** Fecha de fin de la membresía activa más lejana (o null). */
    private function vigenteHasta(int $socioId): ?string
    {
        $st = $this->db->prepare("SELECT MAX(fecha_fin) FROM membresias WHERE socio_id = ? AND estado = 'activa'");
        $st->execute([$socioId]);
        return $st->fetchColumn() ?: null;
    }

    /**
     * Asigna o renueva. Si aún hay membresía vigente, la nueva empieza al día siguiente de su fin.
     */
    public function asignar(int $socioId, array $tipo): int
    {
        $hoy = date('Y-m-d');
        $fin = $this->vigenteHasta($socioId);
        $inicio = ($fin && $fin >= $hoy) ? date('Y-m-d', strtotime("$fin +1 day")) : $hoy;
        $nuevoFin = date('Y-m-d', strtotime("$inicio +" . ((int)$tipo['duracion_dias'] - 1) . ' days'));

        $st = $this->db->prepare(
            "INSERT INTO membresias (socio_id, tipo_membresia_id, fecha_inicio, fecha_fin, estado)
             VALUES (?,?,?,?, 'activa')");
        $st->execute([$socioId, $tipo['id'], $inicio, $nuevoFin]);
        return (int)$this->db->lastInsertId();
    }

    public function obtener(int $id): ?array
    {
        $st = $this->db->prepare(
            'SELECT m.*, t.nombre AS tipo FROM membresias m
               JOIN tipos_membresia t ON t.id = m.tipo_membresia_id WHERE m.id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function historial(int $socioId): array
    {
        $st = $this->db->prepare(
            'SELECT m.id, t.nombre AS tipo, m.fecha_inicio, m.fecha_fin, m.estado
               FROM membresias m JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
              WHERE m.socio_id = ? ORDER BY m.fecha_fin DESC, m.id DESC');
        $st->execute([$socioId]);
        return $st->fetchAll();
    }

    /**
     * Estado calculado del socio: activa | por_vencer | vencida | congelada | sin_membresia
     */
    public function estadoSocio(int $socioId): array
    {
        $hoy = date('Y-m-d');
        $filas = $this->historial($socioId);
        $res = ['estado' => 'sin_membresia', 'tipo' => null, 'vigente_hasta' => null, 'dias_restantes' => null];
        if (!$filas) return $res;

        $congelada = array_values(array_filter($filas, fn($f) => $f['estado'] === 'congelada'));
        if ($congelada) {
            return ['estado' => 'congelada', 'tipo' => $congelada[0]['tipo'],
                    'vigente_hasta' => $congelada[0]['fecha_fin'], 'dias_restantes' => null];
        }

        $activas = array_values(array_filter($filas, fn($f) => $f['estado'] === 'activa'));
        $cubre = array_values(array_filter($activas, fn($f) => $f['fecha_inicio'] <= $hoy && $f['fecha_fin'] >= $hoy));
        if ($cubre) {
            $hasta = max(array_column($activas, 'fecha_fin'));
            $dias = (int)((strtotime($hasta) - strtotime($hoy)) / 86400);
            return [
                'estado' => $dias <= DIAS_AVISO_VENCIMIENTO ? 'por_vencer' : 'activa',
                'tipo' => $cubre[0]['tipo'], 'vigente_hasta' => $hasta, 'dias_restantes' => $dias,
            ];
        }
        return ['estado' => 'vencida', 'tipo' => $filas[0]['tipo'],
                'vigente_hasta' => $filas[0]['fecha_fin'], 'dias_restantes' => null];
    }

    public function congelar(int $id): void
    {
        $this->db->prepare("UPDATE membresias SET estado='congelada', congelada_desde=? WHERE id=? AND estado='activa'")
                 ->execute([date('Y-m-d'), $id]);
    }

    /** Al reactivar se recorre la fecha de fin por los días que estuvo congelada. */
    public function reactivar(int $id): void
    {
        $this->db->prepare(
            "UPDATE membresias
                SET estado='activa',
                    fecha_fin = DATE_ADD(fecha_fin, INTERVAL DATEDIFF(?, congelada_desde) DAY),
                    congelada_desde = NULL
              WHERE id=? AND estado='congelada'")
            ->execute([date('Y-m-d'), $id]);
    }

    public function cancelar(int $id): void
    {
        $this->db->prepare("UPDATE membresias SET estado='cancelada' WHERE id=? AND estado IN ('activa','congelada')")
                 ->execute([$id]);
    }

    /** Activa -> Vencida para todas las membresías cuya fecha de fin ya pasó. */
    public function marcarVencidas(): int
    {
        $st = $this->db->prepare("UPDATE membresias SET estado='vencida' WHERE estado='activa' AND fecha_fin < ?");
        $st->execute([date('Y-m-d')]);
        return $st->rowCount();
    }

    public function porVencer(int $dias): array
    {
        $st = $this->db->prepare(
            "SELECT s.id, s.codigo_credencial, s.nombre, s.apellidos, s.email, s.telefono,
                    MAX(m.fecha_fin) AS fecha_fin
               FROM membresias m JOIN socios s ON s.id = m.socio_id
              WHERE m.estado = 'activa' AND s.activo = 1
              GROUP BY s.id
             HAVING MAX(m.fecha_fin) BETWEEN :hoy AND :limite
              ORDER BY fecha_fin");
        $st->execute([':hoy' => date('Y-m-d'), ':limite' => date('Y-m-d', strtotime("+$dias days"))]);
        return $st->fetchAll();
    }
}
