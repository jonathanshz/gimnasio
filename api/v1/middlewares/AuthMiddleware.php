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
     *
     * Para SOCIO y personal además se consulta la base: si la cuenta se desactivó o el rol cambió, el token deja de servir
     * de inmediato (no hay que esperar a que expire). Los tokens temporales (REGISTRO, VERIFICACION) no tocan esas tablas.
     */
    public static function verificar(?array $roles): ?array
    {
        if ($roles === null) return null;

        if (!preg_match('/Bearer\s+(\S+)/i', self::cabeceraAuth(), $m)) fallar('Inicia sesión para continuar.', 401);
        $payload = Jwt::decodificar($m[1]);
        if (!$payload) fallar('Tu sesión expiró. Vuelve a iniciar sesión.', 401);

        $rol = $payload['rol'] ?? '';
        if ($rol === 'SOCIO') {
            $s = Socio::porId((int)($payload['sub'] ?? 0));
            if (!$s || !$s['activo'] || !$s['correo_verificado_en']) fallar('Tu sesión ya no es válida. Inicia sesión de nuevo.', 401);
        } elseif (in_array($rol, ['RECEPCION', 'COACH', 'ADMIN', 'DUENO'], true)) {
            $u = Usuario::porId((int)($payload['sub'] ?? 0));
            if (!$u || !$u['activo'] || !$u['correo_verificado_en']) fallar('Tu sesión ya no es válida. Inicia sesión de nuevo.', 401);
            $rol = $payload['rol'] = $u['rol'];
            $payload['nombre'] = $u['nombre'];
        } elseif (!in_array($rol, ['REGISTRO', 'VERIFICACION'], true)) {
            fallar('Tu sesión no es válida.', 401);
        }
        if (!in_array($rol, $roles, true)) fallar('No tienes permiso para realizar esta acción.', 403);
        return $payload;
    }
}
