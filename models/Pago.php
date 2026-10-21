<?php
class Pago
{
    private PDO $db;
    public function __construct() { $this->db = Database::conectar(); }

    public function crear(int $socioId, ?int $membresiaId, string $concepto, float $monto, string $metodo, ?int $usuarioId): int
    {
        $folio = 'R' . date('ymd') . strtoupper(bin2hex(random_bytes(3)));
        $st = $this->db->prepare(
            'INSERT INTO pagos (folio, socio_id, membresia_id, concepto, monto, metodo, usuario_id)
             VALUES (?,?,?,?,?,?,?)');
        $st->execute([$folio, $socioId, $membresiaId, $concepto, $monto, $metodo, $usuarioId]);
        return (int)$this->db->lastInsertId();
    }

    public function obtener(int $id): ?array
    {
        $st = $this->db->prepare(
            "SELECT p.id, p.folio, p.concepto, p.monto, p.metodo, p.creado_en,
                    s.id AS socio_id, CONCAT(s.nombre, ' ', s.apellidos) AS socio, s.codigo_credencial,
                    s.rfc, s.razon_social,
                    u.nombre AS cajero, m.fecha_inicio, m.fecha_fin
               FROM pagos p
               JOIN socios s ON s.id = p.socio_id
               LEFT JOIN usuarios u ON u.id = p.usuario_id
               LEFT JOIN membresias m ON m.id = p.membresia_id
              WHERE p.id = ?");
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function listar(?int $socioId, ?string $desde, ?string $hasta): array
    {
        $sql = "SELECT p.id, p.folio, p.concepto, p.monto, p.metodo, p.creado_en,
                       CONCAT(s.nombre, ' ', s.apellidos) AS socio
                  FROM pagos p JOIN socios s ON s.id = p.socio_id WHERE 1=1";
        $args = [];
        if ($socioId) { $sql .= ' AND p.socio_id = ?'; $args[] = $socioId; }
        if ($desde)   { $sql .= ' AND DATE(p.creado_en) >= ?'; $args[] = $desde; }
        if ($hasta)   { $sql .= ' AND DATE(p.creado_en) <= ?'; $args[] = $hasta; }
        $st = $this->db->prepare($sql . ' ORDER BY p.id DESC LIMIT 300');
        $st->execute($args);
        return $st->fetchAll();
    }

    public function corte(string $fecha): array
    {
        $st = $this->db->prepare(
            'SELECT metodo, COUNT(*) AS pagos, SUM(monto) AS total
               FROM pagos WHERE DATE(creado_en) = ? GROUP BY metodo');
        $st->execute([$fecha]);
        return $st->fetchAll();
    }
}
