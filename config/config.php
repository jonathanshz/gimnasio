<?php
// Configuración global. Cambia estos valores antes de poner el sistema en producción.
define('DB_HOST', 'localhost');
define('DB_NAME', 'gimnasio_db');
define('DB_USER', 'root');
define('DB_PASS', 'jonas812');

define('BASE_URL', '/gimnasio');                 // Carpeta donde vive el proyecto en el servidor
define('JWT_SECRET', 'jonas812');
define('JWT_TTL', 8 * 3600);                     // Duración del token: 8 horas
define('DIAS_AVISO_VENCIMIENTO', 7);             // Días para marcar "por vencer"
define('MINUTOS_ENTRE_ENTRADAS', 2);             // Evita registrar la misma entrada dos veces seguidas

date_default_timezone_set('America/Mexico_City');
