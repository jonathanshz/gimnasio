<?php
// Front Controller: recibe la URL, valida el token y llama al controlador correcto.
$raiz = dirname(__DIR__, 2);
require_once $raiz . '/config/config.php';
require_once $raiz . '/config/helpers.php';
require_once $raiz . '/config/database.php';
foreach (['Usuario', 'Socio', 'Membresia', 'Pago', 'Asistencia'] as $m) require_once "$raiz/models/$m.php";
foreach (['Auth', 'Socio', 'Membresia', 'Pago', 'Asistencia'] as $c) require_once "$raiz/controllers/{$c}Controller.php";
require_once __DIR__ . '/middlewares/AuthMiddleware.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Grupos de roles
const STAFF  = ['dueno', 'administrador', 'recepcionista', 'instructor'];
const CAJA   = ['dueno', 'administrador', 'recepcionista'];
const GESTION = ['dueno', 'administrador'];
const SOCIO  = ['socio'];

// [método, ruta, 'Controlador@acción', roles permitidos (null = pública)]
$rutas = [
    ['POST', 'auth/login',        'AuthController@login',        null],
    ['POST', 'auth/portal-login', 'AuthController@portalLogin',  null],

    ['GET',    'socios',                    'SocioController@listar',        STAFF],
    ['GET',    'socios/credencial/{codigo}','SocioController@porCredencial', CAJA],
    ['GET',    'socios/{id}',               'SocioController@ver',           STAFF],
    ['POST',   'socios',                    'SocioController@crear',         CAJA],
    ['PUT',    'socios/{id}',               'SocioController@actualizar',    CAJA],
    ['DELETE', 'socios/{id}',               'SocioController@baja',          GESTION],
    ['GET',    'socios/{id}/membresia',     'MembresiaController@estadoDeSocio', STAFF],

    ['GET',  'membresias/tipos',              'MembresiaController@tipos',             STAFF],
    ['GET',  'membresias/por-vencer',         'MembresiaController@porVencer',         CAJA],
    ['POST', 'membresias/actualizar-estados', 'MembresiaController@actualizarEstados', STAFF],
    ['POST', 'membresias',                    'MembresiaController@asignar',           GESTION],
    ['PUT',  'membresias/{id}/estado',        'MembresiaController@cambiarEstado',     GESTION],

    ['POST', 'pagos',            'PagoController@registrar', CAJA],
    ['GET',  'pagos/corte',      'PagoController@corte',     CAJA],
    ['GET',  'pagos',            'PagoController@listar',    CAJA],
    ['GET',  'pagos/{id}/recibo','PagoController@recibo',    CAJA],

    ['POST', 'asistencias/lectura', 'AsistenciaController@lectura', CAJA],
    ['GET',  'asistencias',         'AsistenciaController@listar',  CAJA],

    ['GET', 'portal/mi-membresia', 'SocioController@miMembresia', SOCIO],
    ['GET', 'portal/mis-pagos',    'PagoController@misPagos',     SOCIO],
];

// Ruta solicitada, sin el prefijo /api/v1/
$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pos  = strpos($uri, '/api/v1/');
$ruta = trim($pos === false ? '' : substr($uri, $pos + 8), '/');
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    $rutaExiste = false;
    foreach ($rutas as [$m, $patron, $handler, $roles]) {
        $regex = '#^' . preg_replace(
            ['/\{id\}/', '/\{codigo\}/'],
            ['(?P<id>\d+)', '(?P<codigo>[A-Za-z0-9\-]+)'],
            $patron) . '$#';
        if (!preg_match($regex, $ruta, $coincidencias)) continue;
        $rutaExiste = true;
        if ($m !== $metodo) continue;

        $params = array_filter($coincidencias, 'is_string', ARRAY_FILTER_USE_KEY);
        $auth = AuthMiddleware::verificar($roles);
        [$clase, $accion] = explode('@', $handler);
        (new $clase())->$accion($params, $auth);
        exit;
    }
    fallar($rutaExiste ? 'Método no permitido.' : 'Ruta no encontrada.', $rutaExiste ? 405 : 404);
} catch (Throwable $e) {
    error_log('[GymControl] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    fallar('Ocurrió un error en el servidor. Inténtalo de nuevo.', 500);
}
