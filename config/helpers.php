<?php
// Utilidades compartidas: JWT (HS256), respuestas JSON, validaciones, almacenamiento de archivos y correo.
// Sin extensiones opcionales (no requiere mbstring ni fileinfo).

class Jwt
{
    private static function b64(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
    private static function b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

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

function fallar(string $mensaje, int $codigo = 400, $data = null): void { responder($data, $codigo, $mensaje); }

/** Errores de validación por campo:  { "email": "Ese correo ya está registrado." } */
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

function ipCliente(): string { return $_SERVER['REMOTE_ADDR'] ?? ''; }
function ahora(): string { return date('Y-m-d H:i:s'); }
function hoy(): string { return date('Y-m-d'); }
function sumarDias(string $fecha, int $n): string { return date('Y-m-d', strtotime("$fecha $n day")); }
function diasEntre(string $a, string $b): int { return (int)round((strtotime($b . ' 00:00:00') - strtotime($a . ' 00:00:00')) / 86400); }

/** Recorta texto a N caracteres (UTF-8) sin depender de mbstring. */
function recortar(string $texto, int $max): string
{
    return preg_match('/^.{0,' . $max . '}/us', $texto, $m) ? $m[0] : substr($texto, 0, $max);
}

/** Mayúsculas con acentos, sin mbstring. */
function mayus(?string $s): string
{
    $s = strtr(strtoupper((string)$s), ['á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú', 'ü' => 'Ü', 'ñ' => 'Ñ']);
    return trim(preg_replace('/\s+/u', ' ', $s));
}

function quitarAcentos(string $s): string
{
    $s = strtr($s, ['Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ü' => 'U', 'Ñ' => 'N',
                    'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    return preg_replace('/[^A-Za-z0-9 ]/', '', $s);
}

// ---- Validaciones (las mismas reglas del prototipo, ahora también en el servidor) ----------------
const RE_NOMBRE = '/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ \'.-]{0,59}$/u';
const RE_EMAIL  = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/';
const CAT_GENERO = ['MASCULINO', 'FEMENINO', 'NO BINARIO', 'OTRO', 'PREFIERO NO DECIRLO'];
const CAT_SEXO = ['HOMBRE', 'MUJER', 'INTERSEXUAL'];
const CAT_SERVICIO = ['IMSS', 'ISSSTE', 'IMSS-BIENESTAR', 'PEMEX', 'SEDENA', 'SEMAR', 'SEGURO DE GASTOS MÉDICOS PRIVADO', 'NINGUNO'];
const CAT_ENF = ['NINGUNA', 'DIABETES TIPO 1', 'DIABETES TIPO 2', 'HIPERTENSIÓN ARTERIAL', 'ASMA', 'OBESIDAD', 'CARDIOPATÍA',
    'ENFERMEDAD PULMONAR OBSTRUCTIVA CRÓNICA (EPOC)', 'ARTRITIS / ARTROSIS', 'HIPOTIROIDISMO / HIPERTIROIDISMO', 'EPILEPSIA',
    'INSUFICIENCIA RENAL CRÓNICA', 'ESCOLIOSIS / HERNIA DISCAL', 'OTRA'];

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

/** Fecha DD/MM/AAAA o AAAA-MM-DD → 'AAAA-MM-DD' o null si no es real o es futura. */
function fechaNacimientoIso(string $s): ?string
{
    if (preg_match('#^(\d{2})/(\d{2})/(\d{4})$#', $s, $m)) { [$d, $mo, $y] = [(int)$m[1], (int)$m[2], (int)$m[3]]; }
    elseif (preg_match('#^(\d{4})-(\d{2})-(\d{2})$#', $s, $m)) { [$y, $mo, $d] = [(int)$m[1], (int)$m[2], (int)$m[3]]; }
    else return null;
    if (!checkdate($mo, $d, $y) || $y < 1900) return null;
    $iso = sprintf('%04d-%02d-%02d', $y, $mo, $d);
    return $iso > hoy() ? null : $iso;
}
function edadDesde(string $iso): int
{
    $n = new DateTime('today');
    return (int)(new DateTime($iso))->diff($n)->y;
}

/** Dígito verificador Luhn (credencial FC + yy + id(6) + dígito). */
function luhnDigito(string $num): int
{
    $s = 0;
    foreach (array_reverse(str_split($num)) as $i => $c) { $d = (int)$c; if ($i % 2 === 0) { $d *= 2; if ($d > 9) $d -= 9; } $s += $d; }
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
    foreach (array_reverse(str_split($n)) as $i => $c) { $x = (int)$c; if ($i % 2) { $x *= 2; if ($x > 9) $x -= 9; } $s += $x; }
    return $s % 10 === 0;
}

function codigoAleatorio6(): string { return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT); }

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

        if (strncmp($bin, "\xFF\xD8\xFF", 3) === 0)            { $mime = 'image/jpeg'; $ext = 'jpg'; }
        elseif (strncmp($bin, "\x89PNG\r\n\x1a\n", 8) === 0)   { $mime = 'image/png';  $ext = 'png'; }
        elseif (substr($bin, 0, 4) === 'RIFF' && substr($bin, 8, 4) === 'WEBP') { $mime = 'image/webp'; $ext = 'webp'; }
        elseif (strncmp($bin, '%PDF-', 5) === 0)               { $mime = 'application/pdf'; $ext = 'pdf'; }
        else throw new InvalidArgumentException('formato no permitido (usa PDF, JPG, PNG o WEBP)');
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

// ---- Cliente HTTP/JSON (cURL) · lo usan el correo (Brevo/Resend) y Mercado Pago ------------------------
/** Hace una petición JSON. Devuelve [código HTTP, arreglo decodificado|null, error de cURL]. */
if (!function_exists('http_json')) {
function http_json(string $metodo, string $url, array $cabeceras = [], ?array $cuerpo = null): array
{
    if (!function_exists('curl_init')) return [0, null, 'La extensión cURL de PHP no está activa (php.ini → extension=curl).'];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => array_merge(['Accept: application/json', 'Content-Type: application/json'], $cabeceras),
    ]);
    if ($cuerpo !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($cuerpo, JSON_UNESCAPED_UNICODE));
    $resp = curl_exec($ch); $codigo = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    return [$codigo, is_string($resp) ? (json_decode($resp, true) ?: null) : null, $err ?: (is_string($resp) ? '' : 'sin respuesta')];
}
}

// ---- Correo -----------------------------------------------------------------------------------------
class Mailer
{
    /** Envía un correo por la API del proveedor configurado en MAIL_MODO. true = el proveedor lo aceptó. */
    public static function enviar(string $para, string $asunto, string $html, string $texto): bool
    {
        switch (MAIL_MODO) {
            case 'brevo':
                [$c, $r, $e] = http_json('POST', 'https://api.brevo.com/v3/smtp/email', ['api-key: ' . MAIL_API_KEY], [
                    'sender' => ['name' => MAIL_FROM_NAME, 'email' => MAIL_FROM], 'to' => [['email' => $para]],
                    'subject' => $asunto, 'htmlContent' => $html, 'textContent' => $texto]);
                break;
            case 'resend':
                [$c, $r, $e] = http_json('POST', 'https://api.resend.com/emails', ['Authorization: Bearer ' . MAIL_API_KEY], [
                    'from' => MAIL_FROM_NAME . ' <' . MAIL_FROM . '>', 'to' => [$para], 'subject' => $asunto, 'html' => $html, 'text' => $texto]);
                break;
            case 'mail':
                return @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $texto, "From: " . MAIL_FROM . "\r\nContent-Type: text/plain; charset=UTF-8");
            default:
                return false;
        }
        if ($c < 200 || $c >= 300) { error_log('[Correo ' . MAIL_MODO . "] HTTP $c $e " . json_encode($r)); return false; }
        return true;
    }
}

class Correo
{
    /** Envía el código de verificación. true = quedó enviado (o, en modo demo, registrado en storage/correos.log). */
    public static function enviarCodigo(string $para, string $codigo): bool
    {
        if (MAIL_MODO === 'demo') {
            @file_put_contents(STORAGE_DIR . '/correos.log', '[' . ahora() . "] a $para · código $codigo\n", FILE_APPEND);
            return true;
        }
        $min = (int)MINUTOS_VERIFICACION; $c = htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8');
        $html = "<div style=\"font-family:Arial,sans-serif;max-width:460px;margin:auto;color:#222\"><h2 style=\"margin-bottom:4px\">Verifica tu correo</h2>
            <p>Usa este código para terminar tu registro en FIT CODE:</p>
            <p style=\"font-size:34px;letter-spacing:8px;font-weight:bold;background:#f2f4f7;padding:14px;text-align:center;border-radius:8px\">$c</p>
            <p style=\"color:#666;font-size:13px\">Vence en $min minutos. Si no lo solicitaste, ignora este mensaje.</p></div>";
        $texto = "Tu código de verificación de FIT CODE es: $codigo\n\nVence en $min minutos. Si no lo solicitaste, ignora este mensaje.";
        try { return Mailer::enviar($para, 'FIT CODE · Código de verificación', $html, $texto); }
        catch (Throwable $e) { error_log('[Correo] ' . $e->getMessage()); return false; }
    }
}

// ---- Mercado Pago (API REST, sin SDK ni Composer) ----------------------------------------------------
class MercadoPago
{
    const API = 'https://api.mercadopago.com';

    public static function activo(): bool { return PAGO_MODO === 'mercadopago' && MP_ACCESS_TOKEN !== ''; }
    private static function cab(): array { return ['Authorization: Bearer ' . MP_ACCESS_TOKEN]; }

    /** Crea la preferencia de Checkout Pro. Devuelve ['id' => ..., 'url' => ...] o lanza RuntimeException. */
    public static function crearPreferencia(array $pref): array
    {
        [$c, $r, $e] = http_json('POST', self::API . '/checkout/preferences', self::cab(), $pref);
        if ($c < 200 || $c >= 300 || empty($r['id'])) { error_log("[MercadoPago] preferencia HTTP $c $e " . json_encode($r)); throw new RuntimeException('No se pudo crear el pago en Mercado Pago.'); }
        return ['id' => $r['id'], 'url' => MP_SANDBOX ? ($r['sandbox_init_point'] ?? $r['init_point']) : $r['init_point']];
    }

    /** Consulta un pago real a Mercado Pago (nunca se confía en lo que diga el navegador). */
    public static function pago(string $id): array
    {
        [$c, $r, $e] = http_json('GET', self::API . '/v1/payments/' . rawurlencode($id), self::cab());
        if ($c < 200 || $c >= 300 || !is_array($r)) { error_log("[MercadoPago] pago $id HTTP $c $e"); throw new RuntimeException('No pudimos verificar el pago con Mercado Pago.'); }
        return $r;
    }

    /** Valida la cabecera x-signature del webhook (solo si MP_WEBHOOK_SECRET está configurada). */
    public static function firmaValida(string $dataId): bool
    {
        if (MP_WEBHOOK_SECRET === '') return true;     // sin secreto no se puede validar; igual siempre se re-consulta el pago a la API
        $firma = (string)($_SERVER['HTTP_X_SIGNATURE'] ?? ''); $req = (string)($_SERVER['HTTP_X_REQUEST_ID'] ?? ''); $ts = $v1 = '';
        foreach (explode(',', $firma) as $parte) { [$k, $v] = array_pad(explode('=', trim($parte), 2), 2, ''); if ($k === 'ts') $ts = $v; if ($k === 'v1') $v1 = $v; }
        return $v1 !== '' && hash_equals(hash_hmac('sha256', "id:$dataId;request-id:$req;ts:$ts;", MP_WEBHOOK_SECRET), $v1);
    }
}
