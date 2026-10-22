<?php
// Utilidades compartidas: JWT (HS256), respuestas JSON, validaciones, almacenamiento de archivos y correo.
// Sin extensiones opcionales (no requiere mbstring ni fileinfo).

class Jwt
{
    private static function b64(string $d): string
    {
        return rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
    }
    private static function b64d(string $d): string
    {
        return base64_decode(strtr($d, '-_', '+/'));
    }

    public static function codificar(array $datos, int $ttl = JWT_TTL): string
    {
        $datos['iat'] = time();
        $datos['exp'] = time() + $ttl;
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
    echo json_encode(['ok' => $error === null, 'data' => $data, 'error' => $error], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

function fallar(string $mensaje, int $codigo = 400, $data = null): void
{
    responder($data, $codigo, $mensaje);
}

// Errores de validación por campo:  { "email": "Ese correo ya está registrado." }
function fallarCampos(array $errores, string $mensaje = 'Revisa los campos marcados.'): void
{
    responder(['campos' => $errores], 422, $mensaje);
}

function entrada(): array
{
    $json = json_decode(file_get_contents('php://input'), true);
    return is_array($json) ? $json : $_POST;
}

function exigir(array $datos, array $campos): void
{
    foreach ($campos as $c) {
        if (!isset($datos[$c]) || trim((string)$datos[$c]) === '') fallar("Falta el campo obligatorio: $c", 422);
    }
}

function ipCliente(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '';
}
function ahora(): string
{
    return date('Y-m-d H:i:s');
}
function hoy(): string
{
    return date('Y-m-d');
}
function sumarDias(string $fecha, int $n): string
{
    return date('Y-m-d', strtotime("$fecha $n day"));
}
function diasEntre(string $a, string $b): int
{
    return (int)round((strtotime($b . ' 00:00:00') - strtotime($a . ' 00:00:00')) / 86400);
}

// Recorta texto a N caracteres (UTF-8)
function recortar(string $texto, int $max): string
{
    return preg_match('/^.{0,' . $max . '}/us', $texto, $m) ? $m[0] : substr($texto, 0, $max);
}

// Mayúsculas con acentos
function mayus(?string $s): string
{
    $s = strtr(strtoupper((string)$s), ['á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú', 'ü' => 'Ü', 'ñ' => 'Ñ']);
    return trim(preg_replace('/\s+/u', ' ', $s));
}

function quitarAcentos(string $s): string
{
    $s = strtr($s, [
        'Á' => 'A',
        'É' => 'E',
        'Í' => 'I',
        'Ó' => 'O',
        'Ú' => 'U',
        'Ü' => 'U',
        'Ñ' => 'N',
        'á' => 'a',
        'é' => 'e',
        'í' => 'i',
        'ó' => 'o',
        'ú' => 'u',
        'ü' => 'u',
        'ñ' => 'n'
    ]);
    return preg_replace('/[^A-Za-z0-9 ]/', '', $s);
}

// Validaciones
const RE_NOMBRE = '/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ \'.-]{0,59}$/u';
const RE_EMAIL  = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/';
const CAT_GENERO = ['MASCULINO', 'FEMENINO', 'NO BINARIO', 'OTRO', 'PREFIERO NO DECIRLO'];
const CAT_SEXO = ['HOMBRE', 'MUJER', 'INTERSEXUAL'];
const CAT_SERVICIO = ['IMSS', 'ISSSTE', 'IMSS-BIENESTAR', 'PEMEX', 'SEDENA', 'SEMAR', 'SEGURO DE GASTOS MÉDICOS PRIVADO', 'NINGUNO'];
const CAT_ENF = [
    'NINGUNA',
    'DIABETES TIPO 1',
    'DIABETES TIPO 2',
    'HIPERTENSIÓN ARTERIAL',
    'ASMA',
    'OBESIDAD',
    'CARDIOPATÍA',
    'ENFERMEDAD PULMONAR OBSTRUCTIVA CRÓNICA (EPOC)',
    'ARTRITIS / ARTROSIS',
    'HIPOTIROIDISMO / HIPERTIROIDISMO',
    'EPILEPSIA',
    'INSUFICIENCIA RENAL CRÓNICA',
    'ESCOLIOSIS / HERNIA DISCAL',
    'OTRA'
];

function erroresPassword(string $p): array
{
    $e = [];
    if (strlen($p) < 8) $e[] = 'al menos 8 caracteres';
    if (!preg_match('/[a-z]/', $p)) $e[] = 'una letra minúscula (a-z)';
    if (!preg_match('/[A-Z]/', $p)) $e[] = 'una letra MAYÚSCULA';
    if (!preg_match('/\d/', $p)) $e[] = 'un número';
    if (!preg_match('/[^a-zA-Z0-9]/', $p)) $e[] = 'un signo (ej. # $ ! % *)';
    return $e;
}

//Fecha DD/MM/AAAA o AAAA-MM-DD → 'AAAA-MM-DD' o null si no es real o es futura.
function fechaNacimientoIso(string $s): ?string
{
    if (preg_match('#^(\d{2})/(\d{2})/(\d{4})$#', $s, $m)) {
        [$d, $mo, $y] = [(int)$m[1], (int)$m[2], (int)$m[3]];
    } elseif (preg_match('#^(\d{4})-(\d{2})-(\d{2})$#', $s, $m)) {
        [$y, $mo, $d] = [(int)$m[1], (int)$m[2], (int)$m[3]];
    } else return null;
    if (!checkdate($mo, $d, $y) || $y < 1900) return null;
    $iso = sprintf('%04d-%02d-%02d', $y, $mo, $d);
    return $iso > hoy() ? null : $iso;
}
function edadDesde(string $iso): int
{
    $n = new DateTime('today');
    return (int)(new DateTime($iso))->diff($n)->y;
}

//Dígito verificador Luhn (credencial FC + yy + id(6) + dígito).
function luhnDigito(string $num): int
{
    $s = 0;
    foreach (array_reverse(str_split($num)) as $i => $c) {
        $d = (int)$c;
        if ($i % 2 === 0) {
            $d *= 2;
            if ($d > 9) $d -= 9;
        }
        $s += $d;
    }
    return (10 - $s % 10) % 10;
}
function generarCodigoBarras(int $id, string $fechaIngreso): string
{
    $c = substr($fechaIngreso, 2, 2) . str_pad((string)$id, 6, '0', STR_PAD_LEFT);
    return 'FC' . $c . luhnDigito($c);
}
function codigoBarrasValido(string $c): bool
{
    return (bool)preg_match('/^FC(\d{8})(\d)$/', $c, $m) && luhnDigito($m[1]) === (int)$m[2];
}
function luhnValido(string $n): bool
{
    $s = 0;
    foreach (array_reverse(str_split($n)) as $i => $c) {
        $x = (int)$c;
        if ($i % 2) {
            $x *= 2;
            if ($x > 9) $x -= 9;
        }
        $s += $x;
    }
    return $s % 10 === 0;
}

function codigoAleatorio6(): string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

// ---- Archivos --------------------------------------------------------------------------------------
class Almacen
{
    /**
     * Guarda un archivo recibido como {nombre, mime, data:"data:...;base64,XXXX"} verificando el CONTENIDO real
     * (firma de bytes), el tamaño y la extensión. Nunca confía en el nombre ni en el tipo que manda el navegador.
     * Devuelve ['ruta' => relativa a storage/, 'mime' => ..., 'nombre' => ...] o lanza InvalidArgumentException.
     */
    public static function guardar($archivo, string $subdir, bool $soloImagen = false): array
    {
        if (!is_array($archivo) || empty($archivo['data']) || !is_string($archivo['data'])) throw new InvalidArgumentException('adjunta el archivo');
        $b64 = preg_replace('#^data:[^;,]*;base64,#', '', $archivo['data']);
        if (strlen($b64) > MAX_ARCHIVO_BYTES * 4 / 3 + 16) throw new InvalidArgumentException('supera los 5 MB');
        $bin = base64_decode($b64, true);
        if ($bin === false || $bin === '') throw new InvalidArgumentException('archivo dañado');
        if (strlen($bin) > MAX_ARCHIVO_BYTES) throw new InvalidArgumentException('supera los 5 MB');

        if (strncmp($bin, "\xFF\xD8\xFF", 3) === 0) {
            $mime = 'image/jpeg';
            $ext = 'jpg';
        } elseif (strncmp($bin, "\x89PNG\r\n\x1a\n", 8) === 0) {
            $mime = 'image/png';
            $ext = 'png';
        } elseif (substr($bin, 0, 4) === 'RIFF' && substr($bin, 8, 4) === 'WEBP') {
            $mime = 'image/webp';
            $ext = 'webp';
        } elseif (strncmp($bin, '%PDF-', 5) === 0) {
            $mime = 'application/pdf';
            $ext = 'pdf';
        } else throw new InvalidArgumentException('formato no permitido (usa PDF, JPG, PNG o WEBP)');
        if ($soloImagen && $mime === 'application/pdf') throw new InvalidArgumentException('debe ser una imagen (PNG, JPG o WEBP)');

        $dir = STORAGE_DIR . '/' . $subdir;
        if (!is_dir($dir) && !@mkdir($dir, 0775, true)) throw new RuntimeException('No se pudo crear la carpeta de documentos.');
        $nombre = bin2hex(random_bytes(16)) . '.' . $ext;
        if (file_put_contents("$dir/$nombre", $bin) === false) throw new RuntimeException('No se pudo guardar el documento.');
        return ['ruta' => "$subdir/$nombre", 'mime' => $mime, 'nombre' => recortar(preg_replace('/[^\w.\- ]/u', '', (string)($archivo['nombre'] ?? 'archivo')), 100)];
    }

    public static function mover(string $rutaRel, string $subdirDestino): string
    {
        $origen = STORAGE_DIR . '/' . $rutaRel;
        $dir = STORAGE_DIR . '/' . $subdirDestino;
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $destino = $subdirDestino . '/' . basename($rutaRel);
        if (is_file($origen)) rename($origen, STORAGE_DIR . '/' . $destino);
        return $destino;
    }

    public static function enviar(string $rutaRel, string $mime, string $nombre): void
    {
        $ruta = realpath(STORAGE_DIR . '/' . $rutaRel);
        $base = realpath(STORAGE_DIR);
        if (!$ruta || !$base || strncmp($ruta, $base . DIRECTORY_SEPARATOR, strlen($base) + 1) !== 0 || !is_file($ruta)) fallar('Documento no encontrado.', 404);
        header_remove('Content-Type');
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($ruta));
        header('Content-Disposition: inline; filename="' . preg_replace('/[^\w.\-]/', '_', $nombre) . '"');
        header('Cache-Control: private, no-store');
        readfile($ruta);
        exit;
    }
}

// ---- Correo -----------------------------------------------------------------------------------------
class Correo
{
    // Devuelve true si el código debe mostrarse en pantalla (modo demo).
    public static function enviarCodigo(string $para, string $codigo): bool
    {
        $asunto = 'FIT CODE · Código de verificación';
        $cuerpo = "Tu código de verificación es: $codigo\n\nVence en " . MINUTOS_VERIFICACION . " minutos. Si no lo solicitaste, ignora este mensaje.";
        if (MAIL_MODO === 'mail') {
            @mail(
                $para,
                '=?UTF-8?B?' . base64_encode($asunto) . '?=',
                $cuerpo,
                "From: " . MAIL_REMITENTE . "\r\nContent-Type: text/plain; charset=UTF-8"
            );
            return false;
        }
        @file_put_contents(STORAGE_DIR . '/correos.log', '[' . ahora() . "] a $para · código $codigo\n", FILE_APPEND);
        return true;
    }
}
