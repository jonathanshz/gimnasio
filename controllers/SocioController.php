<?php
class SocioController
{
    private Socio $socios;
    private Membresia $membresias;

    public function __construct()
    {
        $this->socios = new Socio();
        $this->membresias = new Membresia();
    }

    private function datosValidados(array $d, int $exceptoId = 0): array
    {
        exigir($d, ['nombre', 'apellidos', 'email']);
        $d = array_map(fn($v) => is_string($v) ? trim($v) : $v, $d);
        if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) fallar('El correo no es válido.', 422);
        if ($this->socios->existeEmail($d['email'], $exceptoId)) fallar('Ya existe un socio con ese correo.', 409);
        if (!empty($d['rfc']) && !preg_match('/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i', $d['rfc'])) {
            fallar('El RFC no tiene un formato válido.', 422);
        }
        foreach (['telefono', 'fecha_nacimiento', 'rfc', 'razon_social'] as $k) $d[$k] = $d[$k] ?? '';
        return $d;
    }

    public function listar(array $params, ?array $auth): void
    {
        responder($this->socios->listar(trim($_GET['buscar'] ?? '')));
    }

    public function ver(array $params, ?array $auth): void
    {
        $s = $this->socios->obtener((int)$params['id']);
        if (!$s) fallar('No encontramos al socio.', 404);
        $s['membresia'] = $this->membresias->estadoSocio((int)$s['id']);
        responder($s);
    }

    public function porCredencial(array $params, ?array $auth): void
    {
        $s = $this->socios->buscarPorCodigo($params['codigo']);
        if (!$s || !$s['activo']) fallar('No encontramos una credencial con ese código.', 404);
        $s['membresia'] = $this->membresias->estadoSocio((int)$s['id']);
        responder($s);
    }

    public function crear(array $params, ?array $auth): void
    {
        $d = $this->datosValidados(entrada());
        $codigo = $this->socios->generarCodigo();
        $temporal = substr(bin2hex(random_bytes(4)), 0, 8);   // contraseña inicial para el portal
        $id = $this->socios->crear($d, $codigo, password_hash($temporal, PASSWORD_DEFAULT));

        (new Usuario())->registrarBitacora((int)$auth['sub'], 'alta_socio', 'socios', "Socio #$id $codigo");
        $socio = $this->socios->obtener($id);
        $socio['password_temporal'] = $temporal;   // se muestra una sola vez
        responder($socio, 201);
    }

    public function actualizar(array $params, ?array $auth): void
    {
        $id = (int)$params['id'];
        if (!$this->socios->obtener($id)) fallar('No encontramos al socio.', 404);
        $this->socios->actualizar($id, $this->datosValidados(entrada(), $id));
        (new Usuario())->registrarBitacora((int)$auth['sub'], 'editar_socio', 'socios', "Socio #$id");
        responder($this->socios->obtener($id));
    }

    public function baja(array $params, ?array $auth): void
    {
        $id = (int)$params['id'];
        if (!$this->socios->obtener($id)) fallar('No encontramos al socio.', 404);
        $this->socios->darDeBaja($id);
        (new Usuario())->registrarBitacora((int)$auth['sub'], 'baja_socio', 'socios', "Socio #$id");
        responder(['baja' => true]);
    }

    /** Portal: datos del socio que inició sesión. */
    public function miMembresia(array $params, ?array $auth): void
    {
        $s = $this->socios->obtener((int)$auth['sub']);
        if (!$s) fallar('No encontramos tu cuenta.', 404);
        responder([
            'nombre' => $s['nombre'] . ' ' . $s['apellidos'],
            'codigo_credencial' => $s['codigo_credencial'],
            'membresia' => $this->membresias->estadoSocio((int)$s['id']),
            'historial' => $this->membresias->historial((int)$s['id']),
        ]);
    }
}
