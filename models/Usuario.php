<?php
/** Personal del gimnasio (tabla staff + staff_documentos). */
class Usuario
{
    const ROL_PREFIJO = ['RECEPCION' => 'REC', 'COACH' => 'COA', 'ADMIN' => 'ADM', 'DUENO' => 'DUE'];

    public static function vista(?array $u): ?array
    {
        if (!$u) return null;
        $estado = $u['activo'] ? 'activo' : ($u['aprobado_en'] ? 'inactivo' : 'pendiente');
        return ['id' => (int)$u['id'], 'numero_empleado' => $u['usuario'], 'nombre' => $u['nombre'], 'nombre_corto' => explode(' ', $u['nombre'])[0],
            'rol' => $u['rol'], 'email' => $u['correo'], 'rfc' => rtrim($u['rfc']), 'telefono' => $u['telefono'], 'estado' => $estado,
            'verificado' => !empty($u['correo_verificado_en']), 'activo' => (int)$u['activo'], 'creado_en' => $u['creado_en']];
    }

    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM staff WHERE id = ?'); $st->execute([$id]); return $st->fetch() ?: null;
    }
    public static function porNumeroOCorreo(string $ident, array $roles): ?array
    {
        $in = implode(',', array_fill(0, count($roles), '?'));
        $st = Database::conectar()->prepare("SELECT * FROM staff WHERE (usuario = ? OR correo = ?) AND rol IN ($in) LIMIT 1");
        $st->execute(array_merge([$ident, $ident], $roles)); return $st->fetch() ?: null;
    }
    public static function porNumeroYCorreo(string $numero, string $correo, array $roles): ?array
    {
        $in = implode(',', array_fill(0, count($roles), '?'));
        $st = Database::conectar()->prepare("SELECT * FROM staff WHERE usuario = ? AND correo = ? AND rol IN ($in) LIMIT 1");
        $st->execute(array_merge([$numero, $correo], $roles)); return $st->fetch() ?: null;
    }
    public static function existeRFC(string $rfc): bool
    {
        $st = Database::conectar()->prepare('SELECT 1 FROM staff WHERE rfc = ?'); $st->execute([$rfc]); return (bool)$st->fetchColumn();
    }
    public static function existeCorreo(string $correo): bool
    {
        $db = Database::conectar();
        $st = $db->prepare('SELECT 1 FROM staff WHERE correo = ? UNION SELECT 1 FROM socios WHERE correo = ?'); $st->execute([$correo, $correo]);
        return (bool)$st->fetchColumn();
    }
    public static function siguienteNumero(string $rol): string
    {
        $p = self::ROL_PREFIJO[$rol];
        $st = Database::conectar()->prepare("SELECT MAX(CAST(SUBSTRING(usuario, 5) AS UNSIGNED)) FROM staff WHERE usuario LIKE ?");
        $st->execute(["$p-%"]);
        return $p . '-' . str_pad((string)((int)$st->fetchColumn() + 1), 4, '0', STR_PAD_LEFT);
    }

    /** Alta de personal. $d: nombre, rfc, correo, password, rol, telefono, ... $docs: [tipo => ['ruta','mime','nombre']] */
    public static function crear(array $d, array $docs, bool $aprobada = false): array
    {
        $db = Database::conectar();
        $db->beginTransaction();
        try {
            $numero = self::siguienteNumero($d['rol']);
            $db->prepare('INSERT INTO staff (nombre, usuario, rfc, correo, password_hash, rol, activo, creado_en, telefono, tel_emergencia, fecha_nacimiento,
                    servicio_medico, enfermedad_cronica, enfermedad_otra, correo_verificado_en, aprobado_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
               ->execute([$d['nombre'], $numero, $d['rfc'], $d['correo'], password_hash($d['password'], PASSWORD_BCRYPT), $d['rol'], $aprobada ? 1 : 0, ahora(),
                    $d['telefono'] ?? null, $d['tel_emergencia'] ?? null, $d['fecha_nacimiento'] ?? null, $d['servicio_medico'] ?? null,
                    $d['enfermedad_cronica'] ?? null, $d['enfermedad_otra'] ?? null, $aprobada ? ahora() : null, $aprobada ? ahora() : null]);
            $id = (int)$db->lastInsertId();
            foreach ($docs as $tipo => $f) {
                $ruta = Almacen::mover($f['ruta'], 'staff/' . $id);
                $db->prepare('INSERT INTO staff_documentos (staff_id, tipo, ruta, mime, nombre_original, creado_en) VALUES (?,?,?,?,?,?)')
                   ->execute([$id, strtoupper($tipo), $ruta, $f['mime'], $f['nombre'], ahora()]);
            }
            $db->commit();
            return ['id' => $id, 'numero_empleado' => $numero];
        } catch (Throwable $e) { $db->rollBack(); throw $e; }
    }

    public static function listar(): array
    {
        $filas = Database::conectar()->query("SELECT * FROM staff ORDER BY (activo = 0 AND aprobado_en IS NULL) DESC, activo DESC, usuario")->fetchAll();
        return array_map([self::class, 'vista'], $filas);
    }
    public static function cambiarEstado(int $id, bool $activo, int $adminId): void
    {
        Database::conectar()->prepare('UPDATE staff SET activo = ?, aprobado_en = COALESCE(aprobado_en, ?), aprobado_por = COALESCE(aprobado_por, ?) WHERE id = ?')
            ->execute([$activo ? 1 : 0, ahora(), $adminId, $id]);
    }
    public static function tocarAcceso(int $id): void
    {
        Database::conectar()->prepare('UPDATE staff SET ultimo_acceso = ? WHERE id = ?')->execute([ahora(), $id]);
    }
    public static function documentos(int $id): array
    {
        $st = Database::conectar()->prepare('SELECT id, tipo, mime, nombre_original, creado_en FROM staff_documentos WHERE staff_id = ? ORDER BY id');
        $st->execute([$id]); return $st->fetchAll();
    }
    public static function documento(int $staffId, int $docId): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM staff_documentos WHERE id = ? AND staff_id = ?'); $st->execute([$docId, $staffId]); return $st->fetch() ?: null;
    }
}
