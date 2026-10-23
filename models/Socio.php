<?php

/** Socios (tabla socios + socio_documentos). Las claves de salida conservan los nombres que usa la interfaz. */
class Socio
{
    public static function vista(?array $s): ?array
    {
        if (!$s) return null;
        return [
            'id' => (int)$s['id'],
            'usuario' => $s['usuario'],
            'email' => $s['correo'],
            'telefono' => $s['telefono'],
            'tipo_socio' => strtolower($s['tipo']),
            'nombre' => $s['nombre'],
            'apellido_paterno' => $s['apellido_paterno'],
            'apellido_materno' => $s['apellido_materno'],
            'nombre_completo' => trim($s['nombre'] . ' ' . $s['apellido_paterno'] . ' ' . $s['apellido_materno']),
            'edad' => edadDesde($s['fecha_nacimiento']),
            'fecha_nacimiento' => $s['fecha_nacimiento'],
            'genero' => $s['genero'],
            'sexo' => $s['sexo'],
            'tel_contacto' => $s['tel_contacto'],
            'telefono_emergencia' => $s['tel_emergencia'],
            'servicio_medico' => $s['servicio_medico'],
            'enfermedad_cronica' => $s['enfermedad_cronica'],
            'enfermedad_otra' => $s['enfermedad_otra'],
            'tutor_nombre' => $s['tutor_nombre'],
            'codigo_credencial' => $s['codigo_barras'],
            'fecha_ingreso' => $s['fecha_ingreso'],
            'creado_en' => $s['creado_en'],
            'email_verificado_en' => $s['correo_verificado_en'],
            'activo' => (int)$s['activo']
        ];
    }

    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM socios WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }
    public static function porCodigo(string $codigo): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM socios WHERE codigo_barras = ?');
        $st->execute([$codigo]);
        return $st->fetch() ?: null;
    }
    /** Usuario, correo o teléfono de 10 dígitos. */
    public static function porIdentificador(string $ident): ?array
    {
        $tel = preg_replace('/\D/', '', $ident);
        $st = Database::conectar()->prepare('SELECT * FROM socios WHERE usuario = ? OR correo = ? OR (? <> "" AND LENGTH(?) = 10 AND telefono = ?) LIMIT 1');
        $st->execute([$ident, $ident, $tel, $tel, $tel]);
        return $st->fetch() ?: null;
    }
    public static function existeCorreo(string $correo): bool
    {
        return Usuario::existeCorreo($correo);
    }
    public static function existeTelefono(string $tel): bool
    {
        $st = Database::conectar()->prepare('SELECT 1 FROM socios WHERE telefono = ?');
        $st->execute([$tel]);
        return (bool)$st->fetchColumn();
    }

    public static function generarUsuario(string $nombre, string $ap, string $am, string $fechaIso): string
    {
        $n = explode(' ', trim(quitarAcentos($nombre)))[0];
        $base = strtoupper($n . substr(quitarAcentos($ap), 0, 1) . substr(quitarAcentos($am), 0, 1)) . '-' . date('dmy', strtotime($fechaIso));
        $db = Database::conectar();
        $u = $base;
        $i = 2;
        $st = $db->prepare('SELECT 1 FROM socios WHERE usuario = ?');
        while (true) {
            $st->execute([$u]);
            if (!$st->fetchColumn()) return $u;
            $u = $base . '-' . $i++;
        }
    }

    /** Crea el socio, su credencial, su expediente vacío y mueve sus documentos. Marca el código de registro como usado. */
    public static function crear(array $d, array $docs, int $codigoId): array
    {
        $db = Database::conectar();
        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO socios (usuario, correo, telefono, password_hash, tipo, nombre, apellido_paterno, apellido_materno, edad, fecha_nacimiento,
                    genero, sexo, tel_contacto, tel_emergencia, servicio_medico, enfermedad_cronica, enfermedad_otra, tutor_nombre, codigo_registro, fecha_ingreso, creado_en, correo_verificado_en)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([
                    $d['usuario'],
                    $d['correo'],
                    $d['telefono'],
                    $d['password_hash'] ?? password_hash($d['password'], PASSWORD_BCRYPT),
                    strtoupper($d['tipo']),
                    $d['nombre'],
                    $d['apellido_paterno'],
                    $d['apellido_materno'],
                    edadDesde($d['fecha_nacimiento']),
                    $d['fecha_nacimiento'],
                    $d['genero'],
                    $d['sexo'],
                    $d['tel_contacto'],
                    $d['tel_emergencia'],
                    $d['servicio_medico'],
                    $d['enfermedad_cronica'],
                    $d['enfermedad_otra'] ?: null,
                    $d['tutor_nombre'] ?: null,
                    $d['codigo_registro'],
                    hoy(),
                    ahora(),
                    $d['correo_verificado_en'] ?? null
                ]);
            $id = (int)$db->lastInsertId();
            $db->prepare('UPDATE socios SET codigo_barras = ? WHERE id = ?')->execute([generarCodigoBarras($id, hoy()), $id]);
            foreach ($docs as $tipo => $f) {
                $ruta = Almacen::mover($f['ruta'], 'socios/' . $id);
                $db->prepare('INSERT INTO socio_documentos (socio_id, tipo, ruta, mime, nombre_original, creado_en) VALUES (?,?,?,?,?,?)')
                    ->execute([$id, strtoupper($tipo), $ruta, $f['mime'], $f['nombre'], ahora()]);
            }
            $db->prepare('INSERT INTO expedientes (socio_id, actualizado_en) VALUES (?,?)')->execute([$id, ahora()]);
            $uso = $db->prepare('UPDATE codigos_registro SET usado_por = ?, usado_en = ? WHERE id = ? AND usado_en IS NULL');
            $uso->execute([$id, ahora(), $codigoId]);
            if ($uso->rowCount() === 0) throw new InvalidArgumentException('Ese código de registro ya fue utilizado.');
            $db->prepare('DELETE FROM registro_pendiente WHERE codigo_id = ?')->execute([$codigoId]);
            $db->commit();
            @rmdir(STORAGE_DIR . '/pendientes/' . $codigoId);
            return self::porId($id);
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /** Búsqueda por palabras: nombre, apellidos, usuario o código (sin distinguir acentos ni mayúsculas). */
    public static function buscar(string $q, int $limite = 300): array
    {
        $palabras = array_filter(preg_split('/\s+/', trim($q)));
        $sql = 'SELECT * FROM socios';
        $par = [];
        if ($palabras) {
            $sql .= ' WHERE ' . implode(' AND ', array_fill(0, count($palabras), "CONCAT_WS(' ', nombre, apellido_paterno, apellido_materno, usuario, codigo_barras) LIKE ?"));
            foreach ($palabras as $p) $par[] = '%' . str_replace(['%', '_'], ['\%', '\_'], $p) . '%';
        }
        $sql .= ' ORDER BY apellido_paterno, apellido_materno, nombre LIMIT ' . (int)$limite;
        $st = Database::conectar()->prepare($sql);
        $st->execute($par);
        return $st->fetchAll();
    }

    public static function documentos(int $id): array
    {
        $st = Database::conectar()->prepare('SELECT id, tipo, mime, nombre_original, creado_en FROM socio_documentos WHERE socio_id = ? ORDER BY id');
        $st->execute([$id]);
        return $st->fetchAll();
    }
    public static function documento(int $socioId, int $docId): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM socio_documentos WHERE id = ? AND socio_id = ?');
        $st->execute([$docId, $socioId]);
        return $st->fetch() ?: null;
    }
    public static function totales(): array
    {
        $db = Database::conectar();
        return ['total' => (int)$db->query('SELECT COUNT(*) FROM socios WHERE activo = 1')->fetchColumn()];
    }
}
