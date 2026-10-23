<?php
class AuthController
{
    /** Token corto que solo sirve para verificar el correo de una cuenta. */
    public static function tokenVerificacion(string $cuenta, int $id): string
    {
        return Jwt::codificar(['rol' => 'VERIFICACION', 'cuenta' => $cuenta, 'sub' => $id], 3600);
    }

    private static function sinVerificar(string $cuenta, int $id, array $extra = []): void
    {
        fallar('Antes de entrar, verifica tu correo.', 403, array_merge(['sin_verificar' => true, 'verif_token' => self::tokenVerificacion($cuenta, $id)], $extra));
    }

    /** Valida contraseña con bloqueo por intentos. $fila puede ser null (usuario inexistente). */
    private static function validarCredenciales(?array $fila, string $password, string $clave, string $mensaje): void
    {
        Seguridad::exigirIpLibre();
        if (Seguridad::bloqueado($clave)) fallar('Demasiados intentos fallidos. Por seguridad, espera ' . MINUTOS_BLOQUEO . ' minutos' . (strpos($clave, 'socio') === 0 ? ' o acude a recepción.' : '.'), 429);
        $ok = $fila ? password_verify($password, $fila['password_hash']) : (bool)password_hash($password, PASSWORD_BCRYPT) && false;   // gasta el mismo tiempo si la cuenta no existe
        Seguridad::registrar($clave, $ok);
        if (!$ok) {
            Seguridad::registrar('ip:' . ipCliente(), false);
            fallar($mensaje, 401);
        }
    }

    /** POST auth/login — socio: usuario, correo o teléfono + contraseña */
    public function login(array $p, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['identificador', 'password']);
        $ident = trim((string)$d['identificador']);
        $s = Socio::porIdentificador($ident);
        self::validarCredenciales($s, (string)$d['password'], $s ? 'socio:' . $s['id'] : 'x:' . strtolower($ident), 'Usuario o contraseña incorrectos.');
        if (!$s['activo']) fallar('Usuario o contraseña incorrectos.', 401);
        if (!$s['correo_verificado_en']) self::sinVerificar('SOCIO', (int)$s['id'], ['usuario' => $s['usuario']]);
        responder(['token' => Jwt::codificar(['rol' => 'SOCIO', 'sub' => (int)$s['id']]), 'socio' => Socio::vista($s)]);
    }

    private function entrarStaff(string $mensaje, ?array $u, string $password, string $ident): void
    {
        self::validarCredenciales($u, $password, $u ? 'staff:' . $u['id'] : 'x:' . strtolower($ident), $mensaje);
        if (!$u['correo_verificado_en']) self::sinVerificar('STAFF', (int)$u['id']);
        if (!$u['activo']) fallar($u['aprobado_en'] ? 'Tu cuenta está desactivada. Contacta a administración.' : 'Tu cuenta está pendiente de aprobación por administración.', 403);
        Usuario::tocarAcceso((int)$u['id']);
        responder(['token' => Jwt::codificar(['rol' => $u['rol'], 'sub' => (int)$u['id']]), 'staff' => Usuario::vista($u)]);
    }

    /** POST auth/staff-login — recepción y coaches: número de empleado o correo */
    public function staffLogin(array $p, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['identificador', 'password']);
        $u = Usuario::porNumeroOCorreo(trim((string)$d['identificador']), ['RECEPCION', 'COACH']);
        $this->entrarStaff('Número de empleado, correo o contraseña incorrectos.', $u, (string)$d['password'], (string)$d['identificador']);
    }

    /** POST auth/admin-login — administración y dirección: número de empleado + correo + contraseña */
    public function adminLogin(array $p, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['numero', 'email', 'password']);
        $u = Usuario::porNumeroYCorreo(trim((string)$d['numero']), strtolower(trim((string)$d['email'])), ['ADMIN', 'DUENO']);
        $this->entrarStaff('Los datos de acceso no coinciden.', $u, (string)$d['password'], (string)$d['numero']);
    }

    private static function tipoDe(string $cuenta): string
    {
        return $cuenta === 'STAFF' ? 'staff' : 'socio';
    }

    private function cuentaDeVerificacion(array $auth): array
    {
        $id = (int)$auth['sub'];
        if ($auth['cuenta'] === 'REGISTRO') { // alta de socio en curso: aún no existe en `socios`
            $cod = Codigo::porId($id);
            if (!$cod) return [null, ''];
            if ($cod['usado_en']) { // ya se verificó y el socio fue creado
                $s = $cod['usado_por'] ? Socio::porId((int)$cod['usado_por']) : null;
                return [$s, $s['correo'] ?? ''];
            }
            $pen = Codigo::pendiente($id);
            $v = $pen['datos'];
            if (!$pen['cuenta'] || empty($v['_ok'])) return [null, ''];
            return [['correo_verificado_en' => null, 'usuario' => Socio::generarUsuario($v['nombre'], $v['apellido_paterno'], $v['apellido_materno'], $v['fecha_iso'])], $pen['cuenta']['correo']];
        }
        if ($auth['cuenta'] === 'SOCIO') {
            $c = Socio::porId($id);
            return [$c, $c['correo'] ?? ''];
        }
        $c = Usuario::porId($id);
        return [$c, $c['correo'] ?? ''];
    }

    /** GET auth/verificacion — datos para la pantalla de verificación (envía el código si no hay uno vigente) */
    public function verificacion(array $p, ?array $auth): void
    {
        [$c, $correo] = $this->cuentaDeVerificacion($auth);
        if (!$c) fallar($auth['cuenta'] === 'REGISTRO' ? 'Tu registro ya no existe. Comienza de nuevo con tu código de recepción.' : 'Cuenta no encontrada.', 404);
        if ($c['correo_verificado_en']) responder(['verificada' => true, 'tipo' => self::tipoDe($auth['cuenta'])]);
        $i = Verificacion::info($auth['cuenta'], (int)$auth['sub'], $correo);
        if (!$i['ok']) fallar($i['error'], $i['status'] ?? 429);
        responder([
            'verificada' => false,
            'tipo' => self::tipoDe($auth['cuenta']),
            'correo' => $i['correo'],
            'expira_en' => $i['expira_en'],
            'codigo_demo' => $i['codigo_demo'],
            'usuario' => $c['usuario']
        ]);
    }

    /** POST auth/verificar {codigo} */
    public function verificar(array $p, ?array $auth): void
    {
        $d = entrada();
        $codigo = preg_replace('/\D/', '', (string)($d['codigo'] ?? ''));
        if (strlen($codigo) !== 6) fallar('El código debe tener 6 dígitos.', 422);
        [$c] = $this->cuentaDeVerificacion($auth);
        if (!$c) fallar($auth['cuenta'] === 'REGISTRO' ? 'Tu registro ya no existe. Comienza de nuevo con tu código de recepción.' : 'Cuenta no encontrada.', 404);
        $clave = 'verif:' . $auth['cuenta'] . ':' . $auth['sub'];
        if (Seguridad::bloqueado($clave, 15)) fallar('Demasiados intentos. Espera ' . MINUTOS_BLOQUEO . ' minutos.', 429);
        $r = Verificacion::confirmar($auth['cuenta'], (int)$auth['sub'], $codigo);
        Seguridad::registrar($clave, $r['ok']);
        if (!$r['ok']) fallar($r['error'], 422);
        $usuario = $c['usuario'];
        if ($auth['cuenta'] === 'REGISTRO') { // código correcto → aquí recién se crea el socio
            try {
                $usuario = RegistroController::finalizar((int)$auth['sub'])['usuario'];
            } catch (InvalidArgumentException $e) {
                fallar($e->getMessage(), 409);
            }
        }
        responder(['tipo' => self::tipoDe($auth['cuenta']), 'usuario' => $usuario]);
    }

    /** POST auth/reenviar */
    public function reenviar(array $p, ?array $auth): void
    {
        [$c, $correo] = $this->cuentaDeVerificacion($auth);
        if (!$c) fallar($auth['cuenta'] === 'REGISTRO' ? 'Tu registro ya no existe. Comienza de nuevo con tu código de recepción.' : 'Cuenta no encontrada.', 404);
        if ($c['correo_verificado_en']) fallar('Tu correo ya estaba verificado. Inicia sesión.', 409);
        $r = Verificacion::enviar($auth['cuenta'], (int)$auth['sub'], $correo);
        if (!$r['ok']) fallar($r['error'], $r['status'] ?? 429);
        $i = Verificacion::info($auth['cuenta'], (int)$auth['sub'], $correo);
        responder(['correo' => $correo, 'expira_en' => $i['expira_en'] ?? null, 'codigo_demo' => $i['codigo_demo'] ?? null]);
    }

    /** GET auth/yo — datos de la sesión actual (socio o personal) */
    public function yo(array $p, ?array $auth): void
    {
        if ($auth['rol'] === 'SOCIO') responder(['tipo' => 'socio', 'socio' => Socio::vista(Socio::porId((int)$auth['sub']))]);
        responder(['tipo' => 'staff', 'staff' => Usuario::vista(Usuario::porId((int)$auth['sub']))]);
    }

    /** GET publico/resumen — cifras de la pantalla de bienvenida (sin datos personales) */
    public function resumenPublico(array $p, ?array $auth): void
    {
        Membresia::sincronizar();
        $res = Membresia::resumenActivos();
        $k = Asistencia::kpisHoy();
        $m = Maquina::conteo();
        responder(['socios_activos' => $res['activos'], 'maquinas_libres' => $m['LIBRE'], 'dentro_ahora' => $k['dentro']]);
    }
}
