<?php

/** Códigos de registro que entrega recepción (codigos_registro) y el registro en curso (registro_pendiente). */
class Codigo
{
    public static function generar(int $staffId): string
    {
        $db = Database::conectar();
        self::limpiarVencidos();
        for ($i = 0; $i < 20; $i++) {
            $codigo = codigoAleatorio6();
            $st = $db->prepare('SELECT 1 FROM codigos_registro WHERE codigo = ? AND usado_en IS NULL AND expira_en > ?');
            $st->execute([$codigo, ahora()]);
            if ($st->fetchColumn()) continue;           // ya hay uno vigente igual: genera otro
            $db->prepare('INSERT INTO codigos_registro (codigo, generado_por, creado_en, expira_en) VALUES (?,?,?,?)')
                ->execute([$codigo, $staffId, ahora(), date('Y-m-d H:i:s', time() + HORAS_CODIGO_REGISTRO * 3600)]);
            return $codigo;
        }
        throw new RuntimeException('No se pudo generar un código único.');
    }

    /** Código vigente y sin usar, o null. */
    public static function vigente(string $codigo): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM codigos_registro WHERE codigo = ? AND usado_en IS NULL AND expira_en > ? ORDER BY id DESC LIMIT 1');
        $st->execute([$codigo, ahora()]);
        return $st->fetch() ?: null;
    }
    public static function porId(int $id): ?array
    {
        $st = Database::conectar()->prepare('SELECT * FROM codigos_registro WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }
    public static function listar(int $n = 40): array
    {
        return Database::conectar()->query("SELECT c.id, c.codigo, c.creado_en, c.expira_en, c.usado_en, s.nombre AS generado_por_nombre, so.usuario AS usado_por
            FROM codigos_registro c LEFT JOIN staff s ON s.id = c.generado_por LEFT JOIN socios so ON so.id = c.usado_por ORDER BY c.id DESC LIMIT " . (int)$n)->fetchAll();
    }

    public static function pendiente(int $codigoId): array
    {
        $st = Database::conectar()->prepare('SELECT * FROM registro_pendiente WHERE codigo_id = ?');
        $st->execute([$codigoId]);
        $r = $st->fetch();
        return [
            'tipo' => $r['tipo'] ?? null,
            'datos' => $r && $r['datos'] ? json_decode($r['datos'], true) : null,
            'docs' => $r && $r['docs'] ? json_decode($r['docs'], true) : [],
            'cuenta' => $r && $r['cuenta'] ? json_decode($r['cuenta'], true) : null
        ];
    }

    /** Guarda correo, teléfono y contraseña (ya cifrada) del paso 4. El socio se crea hasta verificar el correo. */
    public static function guardarCuenta(int $codigoId, array $cuenta): void
    {
        Database::conectar()->prepare('UPDATE registro_pendiente SET cuenta = ?, actualizado_en = ? WHERE codigo_id = ?')
            ->execute([json_encode($cuenta, JSON_UNESCAPED_UNICODE), ahora(), $codigoId]);
    }

    /** Borra los registros a medias de códigos que ya vencieron sin usarse (datos, archivos y carpeta). Se llama al generar un código nuevo. */
    public static function limpiarVencidos(): void
    {
        $db = Database::conectar();
        $st = $db->prepare('SELECT p.codigo_id, p.docs FROM registro_pendiente p JOIN codigos_registro c ON c.id = p.codigo_id WHERE c.usado_en IS NULL AND c.expira_en < ?');
        $st->execute([date('Y-m-d H:i:s', time() - 3600)]);   // 1 h de gracia por si alguien está terminando de verificar
        foreach ($st->fetchAll() as $r) {
            foreach (json_decode($r['docs'] ?: '[]', true) ?: [] as $f) @unlink(STORAGE_DIR . '/' . $f['ruta']);
            @rmdir(STORAGE_DIR . '/pendientes/' . (int)$r['codigo_id']);
            $db->prepare('DELETE FROM registro_pendiente WHERE codigo_id = ?')->execute([$r['codigo_id']]);
        }
    }
    public static function guardarPendiente(int $codigoId, ?string $tipo, $datos, array $docs): void
    {
        Database::conectar()->prepare('INSERT INTO registro_pendiente (codigo_id, tipo, datos, docs, actualizado_en) VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), datos = VALUES(datos), docs = VALUES(docs), actualizado_en = VALUES(actualizado_en)')
            ->execute([$codigoId, $tipo, $datos === null ? null : json_encode($datos, JSON_UNESCAPED_UNICODE), json_encode($docs, JSON_UNESCAPED_UNICODE), ahora()]);
    }
}
