<?php

/** Bloqueo por intentos fallidos (tabla login_intentos) y códigos de verificación de correo (verificaciones_correo). */
class Seguridad
{
    /** ¿Hay MAX_INTENTOS_LOGIN fallos recientes desde el último acierto para esta clave? */
    public static function bloqueado(string $clave, int $max = MAX_INTENTOS_LOGIN): bool
    {
        $db = Database::conectar();
        $st = $db->prepare("SELECT COUNT(*) FROM login_intentos WHERE identificador = ? AND exito = 0 AND creado_en > ?
            AND id > COALESCE((SELECT MAX(id) FROM login_intentos WHERE identificador = ? AND exito = 1), 0)");
        $st->execute([$clave, date('Y-m-d H:i:s', time() - MINUTOS_BLOQUEO * 60), $clave]);
        return (int)$st->fetchColumn() >= $max;
    }

    public static function registrar(string $clave, bool $ok): void
    {
        Database::conectar()->prepare('INSERT INTO login_intentos (identificador, ip, exito, creado_en) VALUES (?,?,?,?)')
            ->execute([recortar($clave, 180), ipCliente(), $ok ? 1 : 0, ahora()]);
    }

    /** Falla con 429 si la IP acumula demasiados fallos (frena adivinar contraseñas probando muchos usuarios). */
    public static function exigirIpLibre(): void
    {
        if (self::bloqueado('ip:' . ipCliente(), 30)) fallar('Demasiados intentos desde tu red. Espera ' . MINUTOS_BLOQUEO . ' minutos.', 429);
    }
}

class Verificacion
{
    private static function codigoDe(int $filaId, int $cuentaId, string $creado): string
    {
        $h = hash_hmac('sha256', "v|$filaId|$cuentaId|$creado", JWT_SECRET);
        return str_pad((string)(hexdec(substr($h, 0, 8)) % 1000000), 6, '0', STR_PAD_LEFT);
    }
    private static function hash(string $codigo): string
    {
        return hash_hmac('sha256', $codigo, JWT_SECRET);
    }

    private static function vigente(string $cuenta, int $id): ?array
    {
        $st = Database::conectar()->prepare("SELECT * FROM verificaciones_correo WHERE cuenta = ? AND cuenta_id = ? AND verificado_en IS NULL AND invalidado_en IS NULL ORDER BY id DESC LIMIT 1");
        $st->execute([$cuenta, $id]);
        return $st->fetch() ?: null;
    }

    /** Info para la pantalla de verificación. Si no hay código vigente envía uno. En modo demo incluye el código (bandeja simulada). */
    public static function info(string $cuenta, int $id, string $correo): array
    {
        $v = self::vigente($cuenta, $id);
        if (!$v || $v['expira_en'] < ahora()) {
            $r = self::enviar($cuenta, $id, $correo, true);
            if (!$r['ok']) return $r;
            $v = self::vigente($cuenta, $id);
        }
        return [
            'ok' => true,
            'correo' => $correo,
            'expira_en' => $v['expira_en'],
            'codigo_demo' => MAIL_MODO === 'demo' ? self::codigoDe((int)$v['id'], $id, $v['creado_en']) : null
        ];
    }

    public static function enviar(string $cuenta, int $id, string $correo, bool $forzar = false): array
    {
        $db = Database::conectar();
        $v = self::vigente($cuenta, $id);
        if (!$forzar && $v && $v['creado_en'] > date('Y-m-d H:i:s', time() - 60)) return ['ok' => false, 'error' => 'Espera un minuto antes de pedir otro código.'];
        $db->prepare('UPDATE verificaciones_correo SET invalidado_en = ? WHERE cuenta = ? AND cuenta_id = ? AND verificado_en IS NULL AND invalidado_en IS NULL')->execute([ahora(), $cuenta, $id]);
        $creado = ahora();
        $db->prepare('INSERT INTO verificaciones_correo (cuenta, cuenta_id, correo, codigo_hash, creado_en, expira_en) VALUES (?,?,?,?,?,?)')
            ->execute([$cuenta, $id, $correo, str_repeat('0', 64), $creado, date('Y-m-d H:i:s', time() + MINUTOS_VERIFICACION * 60)]);
        $fila = (int)$db->lastInsertId();
        $codigo = self::codigoDe($fila, $id, $creado);
        $db->prepare('UPDATE verificaciones_correo SET codigo_hash = ? WHERE id = ?')->execute([self::hash($codigo), $fila]);
        if (!Correo::enviarCodigo($correo, $codigo)) {
            $db->prepare('UPDATE verificaciones_correo SET invalidado_en = ? WHERE id = ?')->execute([ahora(), $fila]);   // no se entregó: que el siguiente intento no espere
            return ['ok' => false, 'status' => 502, 'error' => 'No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.'];
        }
        return ['ok' => true];
    }

    public static function confirmar(string $cuenta, int $id, string $codigo): array
    {
        $db = Database::conectar();
        $v = self::vigente($cuenta, $id);
        if (!$v) return ['ok' => false, 'error' => 'No hay un código vigente. Pide uno nuevo.'];
        if ($v['expira_en'] < ahora()) {
            $db->prepare('UPDATE verificaciones_correo SET invalidado_en = ? WHERE id = ?')->execute([ahora(), $v['id']]);
            return ['ok' => false, 'error' => 'El código expiró (' . MINUTOS_VERIFICACION . ' min). Pide uno nuevo.'];
        }
        if (!hash_equals($v['codigo_hash'], self::hash($codigo))) {
            $n = (int)$v['intentos'] + 1;
            $db->prepare('UPDATE verificaciones_correo SET intentos = ?, invalidado_en = ? WHERE id = ?')->execute([$n, $n >= 5 ? ahora() : null, $v['id']]);
            return ['ok' => false, 'error' => $n >= 5 ? 'Demasiados intentos. Pide un código nuevo.' : 'Código incorrecto. Te quedan ' . (5 - $n) . ' intento(s).'];
        }
        $db->prepare('UPDATE verificaciones_correo SET verificado_en = ? WHERE id = ?')->execute([ahora(), $v['id']]);
        if ($cuenta !== 'REGISTRO') { // REGISTRO: el socio todavía no existe; lo crea RegistroController::finalizar
            $tabla = $cuenta === 'SOCIO' ? 'socios' : 'staff';
            $db->prepare("UPDATE $tabla SET correo_verificado_en = ? WHERE id = ?")->execute([ahora(), $id]);
        }
        return ['ok' => true];
    }
}
