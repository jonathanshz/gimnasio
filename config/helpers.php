<?php
// Utilidades compartidas: JWT (HS256), respuestas JSON y validaciones.

class Jwt
{
    private static function b64(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
    private static function b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

    public static function codificar(array $datos): string
    {
        $datos['iat'] = time();
        $datos['exp'] = time() + JWT_TTL;
        $h = self::b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $p = self::b64(json_encode($datos));
        $f = self::b64(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
        return "$h.$p.$f";
    }

    public static function decodificar(string $token): ?array
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3) return null;
        [$h, $p, $f] = $partes;
        $esperada = self::b64(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
        if (!hash_equals($esperada, $f)) return null;
        $datos = json_decode(self::b64d($p), true);
        if (!is_array($datos) || ($datos['exp'] ?? 0) < time()) return null;
        return $datos;
    }
}

function responder($data = null, int $codigo = 200, ?string $error = null): void
{
    http_response_code($codigo);
    echo json_encode(['ok' => $error === null, 'data' => $data, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar(string $mensaje, int $codigo = 400): void
{
    responder(null, $codigo, $mensaje);
}

function entrada(): array
{
    $json = json_decode(file_get_contents('php://input'), true);
    return is_array($json) ? $json : $_POST;
}

function exigir(array $datos, array $campos): void
{
    foreach ($campos as $c) {
        if (!isset($datos[$c]) || trim((string)$datos[$c]) === '') {
            fallar("Falta el campo obligatorio: $c", 422);
        }
    }
}

function ipCliente(): string { return $_SERVER['REMOTE_ADDR'] ?? ''; }

/** Recorta texto a N caracteres (UTF-8) sin depender de la extensión mbstring. */
function recortar(string $texto, int $max): string
{
    return preg_match('/^.{0,' . $max . '}/us', $texto, $m) ? $m[0] : substr($texto, 0, $max);
}
