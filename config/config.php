<?php
// Configuración global. Cambia estos valores antes de poner el sistema en producción.
define('DB_HOST', 'sql111.infinityfree.com');
define('DB_NAME', 'if0_43096934_fit_codev2');                    // [CAMBIO] antes gimnasio_db
define('DB_USER', 'if0_43096934');
define('DB_PASS', 'Jonas812');

define('BASE_URL', '/gimnasio');                 // Carpeta donde vive el proyecto en el servidor
define('JWT_SECRET', 'jshjkdfkjsfkjsdkfsdfkdfsd');
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
// MAIL_MODO decide cómo sale el código de verificación del correo:
//   'demo'   : NO envía nada. El código se muestra en pantalla ("bandeja simulada") y se escribe en storage/correos.log.
//   'brevo'  : envía por la API de Brevo (https://www.brevo.com, plan gratis 300 correos/día). Necesita MAIL_API_KEY y un remitente verificado.
//   'resend' : envía por la API de Resend (https://resend.com). Necesita MAIL_API_KEY y un dominio verificado.
//   'mail'   : función mail() de PHP (hay que configurar sendmail en php.ini; poco fiable en XAMPP y bloqueada en muchos hostings).
// En 'brevo' y 'resend' el código NUNCA se muestra en pantalla. Requiere la extensión cURL de PHP.
define('MAIL_MODO', 'brevo');
define('MAIL_API_KEY', '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');                       // API key del proveedor. NO la subas a GitHub.
define('MAIL_FROM', 'alexamurguia70@gmail.com');   // Remitente: con Brevo/Resend debe estar verificado en el proveedor
define('MAIL_FROM_NAME', 'FIT CODE');
define('MAIL_REMITENTE', MAIL_FROM);              // (compatibilidad con el modo 'mail')

// ---- Pago con tarjeta en línea ---------------------------------------------------------
// PAGO_MODO:
//   'simulado'    : pasarela DE PRUEBA (formulario propio). 4000 0000 0000 0002 se rechaza y cualquier otra tarjeta válida se aprueba.
//   'mercadopago' : Checkout Pro de Mercado Pago. El socio paga en el sitio de Mercado Pago (nunca pasan datos de tarjeta por este servidor).
//   'ninguno'     : oculta la opción "Tarjeta"; solo efectivo.
define('PAGO_MODO', 'simulado');
define('PAGO_TARJETA_SIMULADO', PAGO_MODO === 'simulado');

// Solo para PAGO_MODO = 'mercadopago':
define('SITE_URL', 'http://localhost');           // Dominio público SIN carpeta ni "/" final (ej. https://fitcode.page.gd). La carpeta sale de BASE_URL.
define('MP_ACCESS_TOKEN', '');                    // Access Token de Mercado Pago (de PRUEBA: empieza con TEST-). NO lo subas a GitHub.
define('MP_SANDBOX', true);                       // true: checkout de pruebas · false: cobros reales
define('MP_WEBHOOK_SECRET', '');                  // Opcional: clave secreta del webhook (Mercado Pago → Tus integraciones → Webhooks). Solo con HTTPS público.

define('STORAGE_DIR', dirname(__DIR__) . '/storage');   // Documentos subidos (protegida con .htaccess)

date_default_timezone_set('America/Mexico_City');
