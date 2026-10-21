<?php
class Usuario
{
    private PDO $db;
    public function __construct() { $this->db = Database::conectar(); }

    public function buscarPorEmail(string $email): ?array
    {
        $st = $this->db->prepare(
            'SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre AS rol
               FROM usuarios u JOIN roles r ON r.id = u.rol_id
              WHERE u.email = ? AND u.activo = 1');
        $st->execute([$email]);
        return $st->fetch() ?: null;
    }

    public function roles(): array
    {
        return $this->db->query('SELECT id, nombre, descripcion FROM roles ORDER BY id')->fetchAll();
    }

    public function registrarBitacora(?int $usuarioId, string $accion, string $modulo, string $detalle = '', string $actor = 'staff'): void
    {
        $st = $this->db->prepare(
            'INSERT INTO bitacora (usuario_id, actor, accion, modulo, detalle, ip) VALUES (?,?,?,?,?,?)');
        $st->execute([$usuarioId, $actor, $accion, $modulo, recortar($detalle, 255), ipCliente()]);
    }

    public function bitacora(int $limite = 100): array
    {
        $st = $this->db->prepare(
            'SELECT b.*, u.nombre AS usuario FROM bitacora b
               LEFT JOIN usuarios u ON u.id = b.usuario_id ORDER BY b.id DESC LIMIT ' . (int)$limite);
        $st->execute();
        return $st->fetchAll();
    }
}
