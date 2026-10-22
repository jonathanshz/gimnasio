<?php
// Configuración global
define('DB_HOST', 'localhost');
define('DB_NAME', 'fitcode');
define('DB_USER', 'root');
define('DB_PASS', 'jonas812');

define('BASE_URL', '/gimnasio');                 // Carpeta donde vive el proyecto en el servidor
define('JWT_SECRET', 'jsjdflkasjdflkjasdidfi');
define('JWT_TTL', 8 * 3600);                     // Duración de la sesión: 8 horas

// ---- Reglas del negocio -------------------------------------------------------------
define('DIAS_AVISO_VENCIMIENTO', 7);             // Días para marcar "por vencer"
define('HORAS_CODIGO_REGISTRO', 72);             // Vigencia del código que entrega recepción
define('HORAS_FICHA_EFECTIVO', 72);              // Vigencia de la ficha de pago en efectivo
define('MINUTOS_VERIFICACION', 15);              // Vigencia del código enviado al correo
define('HORAS_MAX_ESTANCIA', 16);                // Una entrada sin salida más vieja que esto ya no cuenta como "dentro"
define('MAX_INTENTOS_LOGIN', 5);                 // Intentos fallidos antes de bloquear...
define('MINUTOS_BLOQUEO', 5);                   // ...durante estos minutos
define('MAX_ARCHIVO_BYTES', 5 * 1024 * 1024);    // Máximo por documento

// ---- Correo ---------------------------------------------------------------------------
// 'demo' : NO envía correos; el código de verificación se devuelve en la respuesta y se muestra en pantalla
//          ("bandeja simulada") y se escribe en storage/correos.log. Útil en XAMPP sin servidor SMTP.
// 'mail' : envía con la función mail() de PHP (configura sendmail/SMTP en php.ini). El código ya NO se muestra.
define('MAIL_MODO', 'demo');
define('MAIL_REMITENTE', 'no-responder@fitcode.mx');

// ---- Pago con tarjeta en línea ---------------------------------------------------------
// true  : pasarela SIMULADA (como el prototipo): 4000 0000 0000 0002 se rechaza, cualquier otra tarjeta válida se aprueba.
// false : apaga el endpoint y oculta la opción "Tarjeta". Para producción real hay que integrar Mercado Pago aquí.
define('PAGO_TARJETA_SIMULADO', true);

define('STORAGE_DIR', dirname(__DIR__) . '/storage');   // Documentos subidos (protegida con .htaccess)

date_default_timezone_set('America/Mexico_City');
