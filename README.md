# Sistema de Gestión de Gimnasios

Sistema web integral desarrollado en **PHP 8** y **MySQL** con arquitectura **REST API** para la administración de gimnasios y portal de autoservicio para socios.

---

## 🚀 Tecnologías Utilizadas

* **Lenguaje:** PHP 8.x
* **Base de Datos:** MySQL (PDO / Sentencias Preparadas)
* **Arquitectura:** API REST (Formato JSON)
* **Autenticación:** JWT (JSON Web Tokens)
* **Servidor Web:** Apache / Nginx
* **Control de Versiones:** Git & GitHub (Integrado con Jira)

---

## 📌 Alcance del MVP (Release 1.0 - Octubre 31)

### 🔑 Autenticación y Seguridad
* Inicio de sesión con generación y validación de JWT (`POST /api/v1/auth/login`).
* Control de acceso basado en roles (Dueño, Admin, Recepción, Instructor, Socio).
* Bitácora de auditoría para registro de acciones críticas.

### 👥 Gestión de Socios y Membresías
* Registro, edición y búsqueda de socios (`/api/v1/socios`).
* Asignación y renovación de membresías con cálculo automático de vencimiento.
* Control de estados de membresía: *Activa, Por vencer, Vencida, Congelada, Cancelada*.

### 💳 Pagos y Control de Acceso
* Registro de pagos y generación de datos para recibos imprimibles (`POST /api/v1/pagos`).
* Validación de acceso en tiempo real mediante lector de código de barras/QR (`POST /api/v1/asistencias`).

### 📱 Portal del Socio (Web Responsiva)
* Consulta de estatus de membresía e historial de pagos (`GET /api/v1/portal/mi-membresia`).
* Visualización de expedientes corporales, gráficas de avance y rutinas asignadas.

### ⚙️ Automatización e Infraestructura
* Tareas programadas (Cron) para avisos automáticos de vencimiento por correo electrónico.
* Generación de respaldos automáticos de la base de datos (`.sql.gz`).

---

## 📁 Estructura del Proyecto

```text
/
├── api/          # Servicios y endpoints de la API REST (/api/v1/)
├── app/          # Panel administrativo (Dueño, Admin, Recepción, Instructor)
├── portal/       # Portal web de autoservicio para el Socio
├── config/       # Variables de entorno y conexión a BD
├── controllers/  # Controladores de la aplicación
├── models/       # Modelos y consultas SQL
└── README.md