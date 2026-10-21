<?php
// Configuración global. Cambia estos valores antes de poner el sistema en producción.
define('DB_HOST', 'sql111.infinityfree.com');
define('DB_NAME', 'if0_43096934_fitcode');
define('DB_USER', 'if0_43096934');
define('DB_PASS', 'Jonas812');

define('BASE_URL', '/gimnasio');                 // Carpeta donde vive el proyecto en el servidor
define('JWT_SECRET', 'Jonas812');
define('JWT_TTL', 8 * 3600);                     // Duración del token: 8 horas
define('DIAS_AVISO_VENCIMIENTO', 7);             // Días para marcar "por vencer"
define('MINUTOS_ENTRE_ENTRADAS', 2);             // Evita registrar la misma entrada dos veces seguidas

date_default_timezone_set('America/Mexico_City');
