<?php
class Asistencia
{
    private PDO $db;
    public function __construct() { $this->db = Database::conectar(); }

    public function registrar(?int $socioId, string $codigo, string $resultado, ?string $motivo): void
    {
        $st = $this->db->prepare(
            'INSERT INTO asistencias (socio_id, codigo_leido, resultado, motivo) VALUES (?,?,?,?)');
        $st->execute([$socioId, recortar($codigo, 40), $resultado, $motivo]);
    }

    /** ¿Ya se registró una entrada permitida hace menos de N minutos? */
    public function entradaReciente(int $socioId): bool
    {
        $st = $this->db->prepare(
            "SELECT 1 FROM asistencias
              WHERE socio_id = ? AND resultado = 'permitido' AND creado_en >= ? LIMIT 1");
        $st->execute([$socioId, date('Y-m-d H:i:s', time() - MINUTOS_ENTRE_ENTRADAS * 60)]);
        return (bool)$st->fetchColumn();
    }

    public function listarPorFecha(string $fecha): array
    {
        $st = $this->db->prepare(
            "SELECT a.id, a.codigo_leido, a.resultado, a.motivo, a.creado_en,
                    CONCAT(s.nombre, ' ', s.apellidos) AS socio
               FROM asistencias a LEFT JOIN socios s ON s.id = a.socio_id
              WHERE DATE(a.creado_en) = ? ORDER BY a.id DESC LIMIT 300");
        $st->execute([$fecha]);
        return $st->fetchAll();
    }
}
