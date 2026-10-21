<?php
class AuthMiddleware
{
    private static function cabeceraAuth(): string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $k => $v) {
                if (strtolower($k) === 'authorization') return $v;
            }
        }
        return '';
    }

    /**
     * Verifica el token JWT y que el rol esté permitido.
     * $roles = null  -> ruta pública. Devuelve el payload del token (o null).
     */
    public static function verificar(?array $roles): ?array
    {
        if ($roles === null) return null;

        if (!preg_match('/Bearer\s+(\S+)/i', self::cabeceraAuth(), $m)) {
            fallar('Inicia sesión para continuar.', 401);
        }
        $payload = Jwt::decodificar($m[1]);
        if (!$payload) {
            fallar('Tu sesión expiró. Vuelve a iniciar sesión.', 401);
        }
        if (!in_array($payload['rol'] ?? '', $roles, true)) {
            fallar('No tienes permiso para realizar esta acción.', 403);
        }
        return $payload;
    }
}
