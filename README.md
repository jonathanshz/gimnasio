# GymControl · Software para gimnasios (PHP + servicios web)

Backend REST en PHP 8 (PDO + MySQL, autenticación JWT) y dos interfaces HTML/JS que lo consumen con `fetch()`:
`app/` (personal del gimnasio) y `portal/` (socios).

## Instalación (XAMPP en Windows)
1. Copia la carpeta `gimnasio` a `C:\xampp\htdocs\gimnasio`.
2. Inicia **Apache** y **MySQL** desde el panel de XAMPP.
3. En phpMyAdmin importa `config/schema.sql` (crea la base `gimnasio_db`, tablas y datos iniciales).
4. Revisa `config/config.php`: usuario/contraseña de MySQL, `BASE_URL` y, sobre todo, **`JWT_SECRET`** (cámbialo).
5. Abre:
   - Panel del personal: `http://localhost/gimnasio/app/`
   - Portal del socio: `http://localhost/gimnasio/portal/`

Usuario inicial: `admin@gimnasio.com` / `Admin123!` (cámbiala). Necesita `mod_rewrite` y `AllowOverride All`
(XAMPP ya los trae) para que `api/v1/.htaccess` envíe todo a `index.php`. Si usas otra carpeta distinta de
`/gimnasio`, el frontend la detecta solo; únicamente ajusta `BASE_URL`.

## Estructura
```
api/v1/index.php            Front controller: tabla de rutas, roles y despacho
api/v1/middlewares/AuthMiddleware.php   Valida el JWT y el rol
config/  config.php · database.php (PDO) · helpers.php (JWT, respuestas JSON) · schema.sql
models/  Usuario · Socio · Membresia · Pago · Asistencia      (SQL)
controllers/  Auth · Socio · Membresia · Pago · Asistencia    (lógica de negocio)
app/     index · dashboard · socios · punto-venta · control-acceso   (+ css/ y js/)
portal/  index · mi-membresia · mis-pagos                            (+ css/ y js/)
```
`config/helpers.php` es el único archivo añadido a tu estructura: contiene el JWT (HS256), las respuestas JSON y validaciones.

## Servicios web (`/api/v1`)
Respuesta siempre: `{ "ok": true|false, "data": ..., "error": null|"mensaje" }`. Se envía `Authorization: Bearer <token>`.

| Método | Ruta | Roles | Función |
|---|---|---|---|
| POST | `/auth/login` | público | Login del personal → JWT |
| POST | `/auth/portal-login` | público | Login del socio → JWT |
| GET | `/socios?buscar=` | personal | Listar/buscar |
| GET | `/socios/{id}` · `/socios/credencial/{codigo}` | personal / caja | Ver socio con estado de membresía |
| POST · PUT | `/socios` · `/socios/{id}` | caja | Alta (devuelve contraseña inicial una vez) / edición |
| DELETE | `/socios/{id}` | gestión | Baja lógica |
| GET | `/socios/{id}/membresia` | personal | Resumen e historial |
| GET | `/membresias/tipos` | personal | Catálogo |
| POST | `/membresias` | gestión | Asignar sin cobro (cortesía) |
| PUT | `/membresias/{id}/estado` | gestión | `congelada` · `activa` · `cancelada` |
| POST | `/membresias/actualizar-estados` | personal | Activa → Vencida |
| GET | `/membresias/por-vencer` | caja | Vencen en 7 días |
| POST | `/pagos` | caja | Cobra y asigna/renueva membresía en una transacción; devuelve el recibo |
| GET | `/pagos` · `/pagos/corte` · `/pagos/{id}/recibo` | caja | Historial, corte del día, recibo |
| POST | `/asistencias/lectura` | caja | Recibe el código del lector y responde si puede entrar |
| GET | `/asistencias?fecha=` | caja | Registros del día |
| GET | `/portal/mi-membresia` · `/portal/mis-pagos` | socio | Datos del socio autenticado |

Roles: `dueno`, `administrador` (gestión) · `recepcionista` (caja) · `instructor` (solo consulta) · `socio` (portal).

## Reglas de negocio implementadas
- **Renovación:** si aún hay membresía vigente, la nueva empieza al día siguiente de su fin (no se pierden días).
- **Estados:** `activa`, `por_vencer` (≤ 7 días), `vencida`, `congelada`, `sin_membresia`. Al reactivar una membresía congelada, su fecha de fin se recorre los días que estuvo congelada.
- **Cobro seguro:** el precio lo toma el servidor del catálogo, nunca del navegador.
- **Acceso:** se valida la vigencia; todo intento (permitido o denegado) queda registrado, y una segunda lectura en menos de 2 minutos no duplica la entrada.
- **Seguridad:** contraseñas con `password_hash`, consultas preparadas, JWT con expiración (8 h), permisos por rol, bitácora de acciones.

## Pruebas realizadas
Backend probado contra MariaDB 10.11 con 20 llamadas (login, alta, cobro, renovación anticipada, acceso permitido/denegado/duplicado, portal, permisos 401/403/404/405) y el frontend con un navegador simulado (14 comprobaciones: login, dashboard, alta de socio, cobro con recibo, lector, portal).

## Pendiente / siguiente fase
Módulos del punto B fuera de este alcance: banco de dietas y rutinas, salones, equipo, contabilidad avanzada, empleados, respaldos automáticos y facturación CFDI. El lector de código funciona como teclado (USB); para generar la credencial impresa con código de barras se puede reutilizar `JsBarcode` del portal.
