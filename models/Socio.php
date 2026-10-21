<?php
class Socio
{
    private PDO $db;
    public function __construct() { $this->db = Database::conectar(); }

    public function listar(string $buscar = ''): array
    {
        $q = '%' . $buscar . '%';
        $st = $this->db->prepare(
            "SELECT s.id, s.codigo_credencial, s.nombre, s.apellidos, s.email, s.telefono,
                    (SELECT MAX(m.fecha_fin) FROM membresias m
                      WHERE m.socio_id = s.id AND m.estado = 'activa') AS vigente_hasta
               FROM socios s
              WHERE s.activo = 1
                AND (CONCAT_WS(' ', s.nombre, s.apellidos) LIKE :q1
                     OR s.codigo_credencial LIKE :q2 OR s.email LIKE :q3)
              ORDER BY s.id DESC LIMIT 200");
        $st->execute([':q1' => $q, ':q2' => $q, ':q3' => $q]);
        return $st->fetchAll();
    }

    public function obtener(int $id): ?array
    {
        $st = $this->db->prepare(
            'SELECT id, codigo_credencial, nombre, apellidos, email, telefono, fecha_nacimiento,
                    rfc, razon_social, activo, creado_en FROM socios WHERE id = ? AND activo = 1');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function buscarPorCodigo(string $codigo): ?array
    {
        $st = $this->db->prepare(
            'SELECT id, codigo_credencial, nombre, apellidos, email, activo FROM socios WHERE codigo_credencial = ?');
        $st->execute([$codigo]);
        return $st->fetch() ?: null;
    }

    public function buscarPorEmail(string $email): ?array
    {
        $st = $this->db->prepare('SELECT * FROM socios WHERE email = ? AND activo = 1');
        $st->execute([$email]);
        return $st->fetch() ?: null;
    }

    public function existeEmail(string $email, int $exceptoId = 0): bool
    {
        $st = $this->db->prepare('SELECT 1 FROM socios WHERE email = ? AND id <> ?');
        $st->execute([$email, $exceptoId]);
        return (bool)$st->fetchColumn();
    }

    public function generarCodigo(): string
    {
        do {
            $codigo = 'GYM' . str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $st = $this->db->prepare('SELECT 1 FROM socios WHERE codigo_credencial = ?');
            $st->execute([$codigo]);
        } while ($st->fetchColumn());
        return $codigo;
    }

    public function crear(array $d, string $codigo, string $passwordHash): int
    {
        $st = $this->db->prepare(
            'INSERT INTO socios (codigo_credencial, nombre, apellidos, email, telefono, fecha_nacimiento,
                                 rfc, razon_social, password_hash)
             VALUES (?,?,?,?,?,?,?,?,?)');
        $st->execute([
            $codigo, $d['nombre'], $d['apellidos'], $d['email'],
            $d['telefono'] ?: null, $d['fecha_nacimiento'] ?: null,
            $d['rfc'] ?: null, $d['razon_social'] ?: null, $passwordHash,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function actualizar(int $id, array $d): void
    {
        $st = $this->db->prepare(
            'UPDATE socios SET nombre=?, apellidos=?, email=?, telefono=?, fecha_nacimiento=?, rfc=?, razon_social=?
              WHERE id = ?');
        $st->execute([
            $d['nombre'], $d['apellidos'], $d['email'], $d['telefono'] ?: null,
            $d['fecha_nacimiento'] ?: null, $d['rfc'] ?: null, $d['razon_social'] ?: null, $id,
        ]);
    }

    public function darDeBaja(int $id): void
    {
        $this->db->prepare('UPDATE socios SET activo = 0 WHERE id = ?')->execute([$id]);
    }
}
