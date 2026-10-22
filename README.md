# FIT CODE · Software para gimnasios (PHP 8 + API REST con JWT)

Misma arquitectura de siempre: **backend PHP con servicios web REST** (`api/v1`, PDO, JWT HS256) y dos interfaces
HTML/JS que lo consumen con `fetch()`: `app/` (personal) y `portal/` (socios). Lo nuevo es la **interfaz completa de
`FIT-CODE.html`**, separada en páginas pequeñas con su propio `.js`, y la **base de datos `fitcode`** (según
`fitcode_mysql.sql`) con las columnas y tablas adicionales que la interfaz necesitaba.

## Instalación (XAMPP / Windows)
1. Copia la carpeta `gimnasio` a `C:\xampp\htdocs\gimnasio`.
2. Inicia **Apache** y **MySQL**.
3. En phpMyAdmin importa, en este orden:
   - `config/schema.sql` → crea la base **`fitcode`**, todas las tablas, los 5 planes, las 16 máquinas y la cuenta del dueño.
   - `config/datos_demo.sql` *(opcional)* → personal y socios de ejemplo, pagos, asistencias, mediciones y una rutina. **Solo en base recién creada** (usa ids fijos).
4. Revisa `config/config.php`: usuario/contraseña de MySQL, `BASE_URL` y **`JWT_SECRET`** (cámbialo por una clave larga y aleatoria).
5. Abre `http://localhost/gimnasio/` → redirige al portal. Personal: `http://localhost/gimnasio/app/` (administración: `app/?modo=admin`).

Requiere `mod_rewrite` y `AllowOverride All` (XAMPP ya los trae) para que `api/v1/.htaccess` envíe todo a `index.php`.
`api/v1/.htaccess` ya sube `post_max_size` a 32 MB para la API (si tu Apache ignora `php_value`, ponlo en `php.ini`). Los documentos pesan hasta 5 MB; la interfaz comprime las imágenes en el navegador y sube **un documento por petición**.

### Cuentas de prueba
| Quién | Usuario | Contraseña |
|---|---|---|
| Dueño (viene en `schema.sql`) | `DUE-0001` · `dueno@fitcode.mx` | `Dueno#2026` |
| Administración (demo) | `ADM-0001` · `admin@fitcode.mx` | `Admin#2026` |
| Recepción (demo) | `REC-0001` | `Recep#2026` |
| Coach (demo) | `COA-0001` | `Coach#2026` |
| Socios (demo) | `ANAPP-150398` (activa), `LUISRM-020901` (vence en 2 días, con ficha de efectivo `EF-DEMO2345`), `SOFIAHL-110510` (menor, vencida) | `Socio#2026` |
| Códigos de registro (demo) | `482915`, `731004` | — |

El acceso de administración pide número de empleado + correo + contraseña. **Cambia estas contraseñas al publicar.**

## Estructura
```
index.html                         Redirige a portal/
api/v1/index.php                   Front controller: tabla de rutas [método, ruta, Controller@acción, roles]
api/v1/middlewares/AuthMiddleware.php   Valida JWT + estado y rol reales en la base de datos
config/   config.php · database.php · helpers.php · schema.sql · datos_demo.sql
models/   Usuario · Socio · Membresia · Pago · Asistencia · Codigo · Fitness · Seguridad
controllers/  Auth · Registro · Socio · Membresia · Pago · Asistencia · Maquina · Fitness · Personal · Admin
shared/   css/fitcode.css · js/{core,api,layout,barcode,fitness,verificar}.js       ← común a app/ y portal/
portal/   *.html + js/*.js + css/portal-styles.css       (socios)
app/      *.html + js/*.js + css/admin-styles.css        (personal)
storage/  documentos subidos (protegida con .htaccess; solo se sirven por endpoints autenticados)
```

### De la interfaz única a páginas (`FIT-CODE.html` → archivos)
| Pantalla del prototipo | Archivo(s) |
|---|---|
| Inicio de sesión del socio + portada | `portal/index.html` · `js/index.js` |
| Registro paso 1 (código de 6 dígitos) | `portal/registro-codigo.*` |
| Registro paso 2 (mayor/menor) | `portal/registro-tipo.*` |
| Registro paso 3 (datos, documentos, firma) | `portal/registro-datos.*` |
| Registro paso 4 (cuenta) y 5 (verificar correo) | `portal/registro-cuenta.*` · `shared/js/verificar.js` (`portal/verificar.html`) |
| Mi inicio · Código de acceso (barras) | `portal/inicio.*` · `portal/codigo.*` |
| Membresía · Pagos · Pagar (tarjeta/efectivo) · Ficha · Recibo | `portal/membresia.*` · `pagos.*` · `pagar.*` · `ficha.*` · `recibo.*` |
| Asignación (rutina) · Avance/IMC/nutrición | `portal/asignacion.*` · `portal/avance.*` |
| Máquinas disponibles | `portal/maquinas.*` |
| Login personal / administración | `app/index.html` · `js/index.js` |
| Registro de recepcionista y de coach | `app/registro-recepcion.html` · `registro-coach.html` · `js/registro-staff.js` |
| Panel de recepción (lector, KPIs, generar código) | `app/dashboard.*` |
| Buscar socio · ficha del socio · cobro en mostrador | `app/socios.*` · `app/socio.*` |
| Cobros en efectivo (fichas) y recibo | `app/cobros.*` · `app/recibo.*` |
| Panel del coach y expediente del socio | `app/coach.*` · `app/coach-socio.*` |
| Administración: resumen, personal, pagos, máquinas, códigos, bitácora | `app/admin-resumen.*` · `admin-personal.*` · `admin-pagos.*` · `admin-maquinas.*` · `admin-codigos.*` · `admin-bitacora.*` |

Cada página es `<nombre>.html` (solo carga CSS y scripts) + `js/<nombre>.js` (una función `page(async () => html)` más los manejadores de sus formularios, con `data-form` / `data-action`).

## Servicios web (`/api/v1`)
Respuesta siempre `{ "ok": true|false, "data": …, "error": null|"mensaje" }` y `Authorization: Bearer <token>`.
Hay cuatro tipos de token: **socio**, **staff**, **registro** (alta con código, 45 min) y **verif** (verificar correo).

| Grupo | Rutas |
|---|---|
| Autenticación | `POST auth/login` · `auth/staff-login` · `auth/admin-login` · `GET auth/yo` · `GET auth/verificacion` · `POST auth/verificar` · `auth/reenviar` · `GET publico/resumen` |
| Registro de socio | `POST registro/codigo` · `GET registro/estado` · `POST registro/tipo` · `registro/documento` · `registro/datos` · `GET/POST registro/cuenta` |
| Catálogos | `GET planes` · `GET maquinas` · `PUT maquinas/{id}/estado` |
| Portal del socio | `GET portal/inicio` · `membresia` · `pagos` · `ficha` · `recibo/{folio}` · `avance` · `POST portal/ficha` · `portal/pagar-tarjeta` · `portal/avance/perfil` · `portal/avance/medicion` · `DELETE portal/ficha/{id}` |
| Recepción | `GET staff/resumen` · `POST asistencias/lectura` · `GET socios` · `socios/{id}` · `socios/{id}/documentos/{doc}` · `POST pagos/mostrador` · `pagos/cobrar-ficha` · `GET fichas/pendientes` · `GET pagos/recibo/{folio}` · `POST/GET codigos` |
| Coach | `GET socios/{id}/fitness` · `POST …/perfil` · `…/medicion` · `…/rutina` · `DELETE …/rutina/{rid}` |
| Administración | `GET admin/resumen` · `pagos` · `pagos/corte` · `asistencias/bitacora` · `GET/POST personal` · `PUT personal/{id}/estado` · `GET personal/{id}/documentos/{doc}` · `POST personal/registro` (público: autorregistro) |

Roles: `DUENO`, `ADMIN` (gestión) · `RECEPCION` (caja) · `COACH` · `socio`.

---

## Qué cambié y dónde

### 1. Base de datos — `config/schema.sql`
Parte de tu `fitcode_mysql.sql` (mismas tablas, tipos y restricciones). Todo lo agregado está marcado en el propio archivo con **`-- [NUEVO]`**:
- **`staff`**: rol `COACH`; `telefono`, `tel_emergencia`, `fecha_nacimiento`, `servicio_medico`, `enfermedad_cronica`, `enfermedad_otra` (datos de coach); `correo_verificado_en`, `aprobado_en`, `aprobado_por`, `ultimo_acceso`.
- **`socios`**: `correo_verificado_en`, `activo`.
- **`codigos_registro`**: `expira_en` (vigencia 72 h), FK `usado_por` que faltaba e índice.
- **Tablas nuevas**: `registro_pendiente` (lo capturado en los pasos 2‑4 mientras el socio avanza), `staff_documentos`, `verificaciones_correo`, `login_intentos` (bloqueo tras 5 intentos / 10 min), `accesos_log` (bitácora de **todas** las lecturas, incluidas las rechazadas), `expedientes` (objetivo, nivel, días por semana, coach), `rutinas` y `rutina_ejercicios`.
- **`membresias`**: `precio_aplicado` (el precio cobrado queda congelado). **`pagos`**: `plan_id`, `referencia_pago`, `tarjeta_marca`, `tarjeta_ultimos4` (nunca el número completo), `referencia_externa`. **`mediciones`**: `estatura`, `masa_muscular`, `registrado_por`.
- **`solicitudes_cambio`** se reutiliza como **ficha de pago en efectivo** (`referencia EF-XXXXXXXX`, `monto`, `expira_en`, `pago_id`).
- Siembra: 5 planes (VISITA, MENSUAL, TRIMESTRAL, ANUAL, ESTUDIANTE), 16 máquinas y la cuenta del dueño.
- `config/datos_demo.sql` (nuevo): datos de ejemplo para probar todo sin capturar nada. Las fechas son relativas a la fecha de importación.

### 2. Backend (misma arquitectura)
- **`api/v1/index.php`**: la tabla de rutas creció de 17 a 54 rutas (ver arriba), con roles por ruta.
- **`api/v1/middlewares/AuthMiddleware.php`**: además de validar el JWT, **vuelve a consultar la base** (cuenta activa/aprobada y rol real), así que un cambio de rol o una baja surte efecto de inmediato, no al expirar el token.
- **`config/config.php`**: `DB_NAME = fitcode`; constantes nuevas `HORAS_CODIGO_REGISTRO`, `HORAS_FICHA_EFECTIVO`, `MINUTOS_VERIFICACION`, `HORAS_MAX_ESTANCIA`, `MAX_INTENTOS_LOGIN`, `MINUTOS_BLOQUEO`, `MAX_ARCHIVO_BYTES`, **`MAIL_MODO`** y **`PAGO_TARJETA_SIMULADO`**.
  - `MAIL_MODO = 'demo'`: el código de verificación aparece en una bandeja simulada (campo `codigo_demo`); con `'smtp'` se envía al correo real y nunca se muestra.
  - `PAGO_TARJETA_SIMULADO = true`: la pasarela de tarjeta es simulada: valida número (Luhn), vencimiento y CVV, rechaza la tarjeta de prueba `4000 0000 0000 0002` y aprueba el resto; solo se guarda marca y últimos 4. Para producción hay que conectar Mercado Pago en `PagoController@pagarTarjeta`.
- **`config/helpers.php`**: funciones nuevas: contraseña fuerte, fecha de nacimiento y edad, generación y validación del código de barras (Luhn), código aleatorio de 6 dígitos, mayúsculas/acentos y respuestas con errores por campo (`fallarCampos`). El **RFC** se valida como 10 caracteres (4 letras + 6 números, sin homoclave) en `PersonalController`.
- **Modelos y controladores nuevos**: `Codigo`, `Fitness`, `Seguridad` (bloqueo de login, bitácora); `RegistroController`, `MaquinaController`, `FitnessController`, `PersonalController`, `AdminController`. `AuthController`, `SocioController`, `MembresiaController`, `PagoController` y `AsistenciaController` se reescribieron para los nuevos flujos.
- **Subida de documentos**: nuevo endpoint **`POST registro/documento`** (`RegistroController@documento`): un archivo por petición para no exceder `post_max_size`. El autorregistro de personal manda sus documentos en una sola petición (`PersonalController@registro`). Los documentos nunca son públicos: se leen por `GET socios/{id}/documentos/{doc}` y `GET personal/{id}/documentos/{doc}` con token.
- **Crear cuentas de administración** (pregunta anterior): nuevo `POST personal` (`PersonalController@crear`, solo **DUEÑO**) y su formulario en `app/admin-personal.html` / `js/admin-personal.js`.
- **Regla de estancia**: una entrada sin salida con más de 16 h ya no cuenta como “dentro” (`HORAS_MAX_ESTANCIA`) y el siguiente escaneo registra una entrada nueva.
- **Máquinas**: se eliminó la simulación aleatoria del prototipo. Ahora el estado es real, lo cambia administración (`PUT maquinas/{id}/estado`) y el portal lo consulta cada 8 s (`portal/js/maquinas.js`).

### 3. Frontend
- **Carpeta nueva `shared/`** (no existía): lo que antes estaba duplicado en `app/` y `portal/` vive una sola vez.
  - `core.js`: utilidades, catálogos, iconos, motor de páginas (`page`, `render`, `FORMS`, `ACTIONS`, avisos `flash`/`toast`) y comportamiento de formularios (mayúsculas, fecha DD/MM/AAAA → edad, OTP de 6 dígitos, firma en canvas, medidor de contraseña).
  - `api.js`: cliente REST con JWT en `sessionStorage`; la ruta base se calcula sola desde la URL (sirve en `/gimnasio`, otra carpeta o la raíz). Si la API responde 401 limpia la sesión y manda al login; si no hay token ni siquiera llama a la API.
  - `layout.js`: menús, planes, recibo, gráficas de progreso, rutina y nutrición, listas de socios.
  - `barcode.js`: Code128 en SVG y dígito verificador Luhn del código `FC` + año + id + dígito.
  - `fitness.js`: generador de rutinas y plan nutricional (corre en el navegador; el coach lo asigna y se guarda en `rutinas`/`rutina_ejercicios`).
  - `verificar.js`: pantalla de verificación de correo, compartida por portal y app.
- **Pantallas fusionadas**: `control-acceso` ahora forma parte de `app/dashboard.html` (lector + KPIs) y `punto-venta` pasó a `app/cobros.html` + el cobro en mostrador dentro de `app/socio.html`.
- **CSS**: `shared/css/fitcode.css` (tema común, incluye las reglas `.machine*`, que estaban solo en el portal y rompían la pantalla de máquinas de administración), `portal/css/portal-styles.css` y `app/css/admin-styles.css` (solo lo propio de cada zona).

## Pruebas realizadas
Backend contra MariaDB y frontend con un navegador automatizado (Chromium): inicio de sesión (errores y éxito), registro completo de socio con código, archivo y firma, verificación de correo, todas las pantallas del portal, pago con tarjeta rechazada/aprobada y recibo, ficha de efectivo (generar, cancelar, cobrar en recepción), lector de entrada/salida/denegados, bitácora, KPIs, cobro en mostrador, administración (personal, pagos, máquinas, códigos), alta de cuenta de administración por el dueño, coach (objetivo, medición, rutina), autorregistro de coach con aprobación, permisos por rol y vista móvil sin desplazamiento horizontal. Todo el PHP pasa `php -l` y todo el JS `node --check`.

## Pendiente para producción
- Conectar una pasarela real (hoy `PAGO_TARJETA_SIMULADO`) y un SMTP real (`MAIL_MODO = 'smtp'`).
- Cambiar `JWT_SECRET` y las contraseñas de las cuentas de prueba; servir por HTTPS.
- Los módulos del punto B no incluidos en la interfaz (salones, contabilidad avanzada, respaldos, CFDI) siguen fuera de alcance.
