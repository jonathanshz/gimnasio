<?php
// Front Controller: recibe la URL, valida el token y llama al controlador correcto.
$raiz = dirname(__DIR__, 2);
require_once $raiz . '/config/config.php';
require_once $raiz . '/config/helpers.php';
require_once $raiz . '/config/database.php';
foreach (['Seguridad', 'Usuario', 'Socio', 'Codigo', 'Membresia', 'Pago', 'Asistencia', 'Fitness'] as $m) require_once "$raiz/models/$m.php";
foreach (['Auth', 'Registro', 'Socio', 'Membresia', 'Pago', 'Asistencia', 'Maquina', 'Fitness', 'Personal', 'Admin'] as $c) require_once "$raiz/controllers/{$c}Controller.php";
require_once __DIR__ . '/middlewares/AuthMiddleware.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Grupos de roles
const STAFF   = ['RECEPCION', 'COACH', 'ADMIN', 'DUENO'];
const CAJA    = ['RECEPCION', 'ADMIN', 'DUENO'];
const GESTION = ['ADMIN', 'DUENO'];
const COACH   = ['COACH'];
const DUENO   = ['DUENO'];
const SOCIO   = ['SOCIO'];
const TODOS   = ['SOCIO', 'RECEPCION', 'COACH', 'ADMIN', 'DUENO'];
const REGISTRO = ['REGISTRO'];
const VERIF   = ['VERIFICACION'];

// [método, ruta, 'Controlador@acción', roles permitidos (null = pública)]
$rutas = [
    // ---- Acceso
    ['POST', 'auth/login',        'AuthController@login',       null],
    ['POST', 'auth/staff-login',  'AuthController@staffLogin',  null],
    ['POST', 'auth/admin-login',  'AuthController@adminLogin',  null],
    ['GET',  'auth/verificacion', 'AuthController@verificacion', VERIF],
    ['POST', 'auth/verificar',    'AuthController@verificar',   VERIF],
    ['POST', 'auth/reenviar',     'AuthController@reenviar',    VERIF],
    ['GET',  'auth/yo',           'AuthController@yo',          TODOS],
    ['GET',  'publico/resumen',   'AuthController@resumenPublico', null],

    // ---- Registro de socios (código de recepción)
    ['POST', 'registro/codigo', 'RegistroController@codigo',     null],
    ['GET',  'registro/estado', 'RegistroController@estado',     REGISTRO],
    ['POST', 'registro/tipo',   'RegistroController@tipo',       REGISTRO],
    ['POST', 'registro/documento', 'RegistroController@documento',    REGISTRO],
    ['POST', 'registro/datos',  'RegistroController@datos',      REGISTRO],
    ['GET',  'registro/cuenta', 'RegistroController@cuentaInfo', REGISTRO],
    ['POST', 'registro/cuenta', 'RegistroController@cuenta',     REGISTRO],

    // ---- Catálogo y máquinas
    ['GET', 'planes',   'MembresiaController@planes', TODOS],
    ['GET', 'maquinas', 'MaquinaController@listar',   TODOS],
    ['PUT', 'maquinas/{id}/estado', 'MaquinaController@cambiarEstado', STAFF],

    // ---- Portal del socio
    ['GET',    'portal/inicio',         'MembresiaController@inicio',     SOCIO],
    ['GET',    'portal/membresia',      'MembresiaController@membresia',  SOCIO],
    ['GET',    'portal/pagos',          'PagoController@misPagos',        SOCIO],
    ['GET',    'portal/ficha',          'PagoController@ficha',           SOCIO],
    ['POST',   'portal/ficha',          'PagoController@fichaCrear',      SOCIO],
    ['DELETE', 'portal/ficha/{id}',     'PagoController@fichaCancelar',   SOCIO],
    ['POST',   'portal/pagar-tarjeta',  'PagoController@pagarTarjeta',    SOCIO],
    ['GET',    'portal/recibo/{folio}', 'PagoController@reciboSocio',     SOCIO],
    ['GET',    'portal/avance',         'FitnessController@avance',       SOCIO],
    ['POST',   'portal/avance/perfil',  'FitnessController@perfilSocio',  SOCIO],
    ['POST',   'portal/avance/medicion', 'FitnessController@medicionSocio', SOCIO],

    // ---- Recepción / personal
    ['GET',  'staff/resumen',      'AdminController@panel',            CAJA],
    ['POST', 'asistencias/lectura', 'AsistenciaController@lectura',     CAJA],
    ['GET',  'asistencias/bitacora', 'AsistenciaController@bitacora',   GESTION],
    ['GET',  'socios',             'SocioController@listar',           STAFF],
    ['GET',  'socios/{id}',        'SocioController@ver',              CAJA],
    ['GET',  'socios/{id}/documentos/{doc}', 'SocioController@documento', CAJA],
    ['POST', 'pagos/mostrador',    'PagoController@mostrador',         CAJA],
    ['POST', 'pagos/cobrar-ficha', 'PagoController@cobrarFicha',       CAJA],
    ['GET',  'fichas/pendientes',  'PagoController@fichasPendientes',  CAJA],
    ['GET',  'pagos/corte',        'PagoController@corte',             GESTION],
    ['GET',  'pagos/recibo/{folio}', 'PagoController@recibo',           CAJA],
    ['GET',  'pagos',              'PagoController@listar',            GESTION],
    ['POST', 'codigos',            'AdminController@generarCodigo',    CAJA],
    ['GET',  'codigos',            'AdminController@codigos',          GESTION],

    // ---- Coach
    ['GET',    'socios/{id}/fitness',                  'FitnessController@ver',           COACH],
    ['POST',   'socios/{id}/fitness/perfil',           'FitnessController@perfilCoach',   COACH],
    ['POST',   'socios/{id}/fitness/medicion',         'FitnessController@medicionCoach', COACH],
    ['POST',   'socios/{id}/fitness/rutina',           'FitnessController@asignarRutina', COACH],
    ['DELETE', 'socios/{id}/fitness/rutina/{rid}',     'FitnessController@quitarRutina',  COACH],

    // ---- Administración
    ['GET',  'admin/resumen',           'AdminController@resumen',       GESTION],
    ['POST', 'personal/registro',       'PersonalController@registro',   null],
    ['GET',  'personal',                'PersonalController@listar',     GESTION],
    ['POST', 'personal',                'PersonalController@crear',      DUENO],
    ['PUT',  'personal/{id}/estado',    'PersonalController@estado',     GESTION],
    ['GET',  'personal/{id}/documentos/{doc}', 'PersonalController@documento', GESTION],
];

// Ruta solicitada, sin el prefijo /api/v1/
$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pos  = strpos($uri, '/api/v1/');
$ruta = trim($pos === false ? '' : substr($uri, $pos + 8), '/');
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    $rutaExiste = false;
    foreach ($rutas as [$m, $patron, $handler, $roles]) {
        // {id}, {doc}, {rid} → solo dígitos · {folio} → letras, números y guiones
        $regex = '#^' . preg_replace_callback('/\{(\w+)\}/', fn($x) => in_array($x[1], ['id', 'doc', 'rid'], true) ? '(?P<' . $x[1] . '>\d+)' : '(?P<' . $x[1] . '>[A-Za-z0-9\-]+)', $patron) . '$#';
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
    error_log('[FitCode] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    fallar('Ocurrió un error en el servidor. Inténtalo de nuevo.', 500);
}
