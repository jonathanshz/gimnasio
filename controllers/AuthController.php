<?php
class AuthController
{
    public function login(array $params, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['email', 'password']);
        $modelo = new Usuario();
        $u = $modelo->buscarPorEmail(trim($d['email']));

        if (!$u || !password_verify($d['password'], $u['password_hash'])) {
            $modelo->registrarBitacora($u['id'] ?? null, 'login_fallido', 'auth', trim($d['email']));
            fallar('Correo o contraseña incorrectos.', 401);
        }

        $modelo->registrarBitacora((int)$u['id'], 'login', 'auth');
        responder([
            'token' => Jwt::codificar(['sub' => (int)$u['id'], 'rol' => $u['rol'], 'nombre' => $u['nombre'], 'tipo' => 'staff']),
            'usuario' => ['id' => (int)$u['id'], 'nombre' => $u['nombre'], 'rol' => $u['rol']],
        ]);
    }

    public function portalLogin(array $params, ?array $auth): void
    {
        $d = entrada();
        exigir($d, ['email', 'password']);
        $s = (new Socio())->buscarPorEmail(trim($d['email']));

        if (!$s || !password_verify($d['password'], $s['password_hash'])) {
            fallar('Correo o contraseña incorrectos.', 401);
        }
        (new Usuario())->registrarBitacora((int)$s['id'], 'login', 'portal', '', 'socio');
        responder([
            'token' => Jwt::codificar(['sub' => (int)$s['id'], 'rol' => 'socio', 'nombre' => $s['nombre'], 'tipo' => 'socio']),
            'socio' => ['id' => (int)$s['id'], 'nombre' => $s['nombre']],
        ]);
    }
}
