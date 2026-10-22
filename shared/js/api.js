"use strict";
/* =====================================================================
   FIT CODE · cliente de la API REST (/api/v1) con JWT
   Cuatro tipos de sesión, cada uno con su propio token en sessionStorage:
     socio     -> portal del socio            staff    -> panel del personal
     registro  -> alta de socio con código    verif    -> verificación de correo
   La ruta base se calcula sola a partir de la URL (sirve en /gimnasio, en otra carpeta o en la raíz).
   ===================================================================== */
const RAIZ = location.pathname.replace(/\/(app|portal)(\/[^\/]*)?$/, "");
const API_BASE = RAIZ + "/api/v1/";
const URL_PORTAL = RAIZ + "/portal/";
const URL_APP = RAIZ + "/app/";

const Ses = {
  get: (k) => {
    try {
      return JSON.parse(sessionStorage.getItem("fc_" + k) || "null");
    } catch (_) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      sessionStorage.setItem("fc_" + k, JSON.stringify(v));
      return true;
    } catch (_) {
      return false;
    }
  },
  del: (k) => {
    try {
      sessionStorage.removeItem("fc_" + k);
    } catch (_) {}
  },
};
const TOKEN = {
  socio: "tok_socio",
  staff: "tok_staff",
  registro: "tok_registro",
  verif: "tok_verif",
};
const PAGINA_LOGIN = {
  socio: URL_PORTAL,
  staff: URL_APP,
  registro: URL_PORTAL + "registro-codigo.html",
  verif: URL_PORTAL,
};

class ApiError extends Error {
  constructor(msg, status, data) {
    super(msg);
    this.status = status;
    this.data = data || null;
    this.campos = (data && data.campos) || null;
  }
}

/** Llama a la API. `tipo` indica qué token enviar (socio|staff|registro|verif). Devuelve `data` o lanza ApiError. */
async function api(metodo, ruta, cuerpo, tipo) {
  const headers = { Accept: "application/json" },
    tk = tipo ? Ses.get(TOKEN[tipo]) : null;
  if (tipo && !tk) {
    // sin sesión: ni siquiera se llama a la API
    flash(
      "error",
      tipo === "registro"
        ? "Ingresa tu código de recepción para comenzar el registro."
        : "Inicia sesión para continuar.",
    );
    location.href = PAGINA_LOGIN[tipo];
    throw { redirigido: true };
  }
  if (tk) headers.Authorization = "Bearer " + tk;
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
  let r;
  try {
    r = await fetch(API_BASE + ruta, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch (_) {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa que Apache y MySQL estén encendidos.",
      0,
    );
  }
  let j = null;
  try {
    j = await r.json();
  } catch (_) {}
  if (r.status === 401 && tk) {
    // el token venció o ya no es válido → volver a iniciar sesión
    Ses.del(TOKEN[tipo]);
    Ses.del(tipo);
    flash(
      "error",
      (j && j.error) || "Tu sesión venció. Inicia sesión de nuevo.",
    );
    location.href = PAGINA_LOGIN[tipo];
    throw { redirigido: true };
  }
  if (!j || !j.ok)
    throw new ApiError(
      (j && j.error) || `Error del servidor (${r.status}).`,
      r.status,
      j && j.data,
    );
  return j.data;
}
const GET = (ruta, tipo) => api("GET", ruta, undefined, tipo);
const POST = (ruta, cuerpo, tipo) =>
  api("POST", ruta, cuerpo === undefined ? {} : cuerpo, tipo);
const PUT = (ruta, cuerpo, tipo) =>
  api("PUT", ruta, cuerpo === undefined ? {} : cuerpo, tipo);
const DELETE = (ruta, tipo) => api("DELETE", ruta, undefined, tipo);

/** Descarga un archivo protegido (documentos) con el token y lo devuelve como Blob. */
async function apiBlob(ruta, tipo) {
  const tk = tipo ? Ses.get(TOKEN[tipo]) : null;
  const r = await fetch(API_BASE + ruta, {
    headers: tk ? { Authorization: "Bearer " + tk } : {},
  });
  if (!r.ok) {
    let j = null;
    try {
      j = await r.json();
    } catch (_) {}
    throw new ApiError(
      (j && j.error) || "No se pudo abrir el documento.",
      r.status,
    );
  }
  return r.blob();
}

// ---- Sesiones ---------------------------------------------------------------------------------------------
const hayToken = (tipo) => !!Ses.get(TOKEN[tipo]);
function cerrarSesion(tipo) {
  Ses.del(TOKEN[tipo]);
  Ses.del(tipo);
}

/** Devuelve el socio con sesión o redirige al inicio de sesión. */
async function sesionSocio() {
  if (!hayToken("socio")) {
    flash("error", "Inicia sesión para continuar.");
    location.href = URL_PORTAL;
    throw { redirigido: true };
  }
  const c = Ses.get("socio");
  if (c) return c;
  const r = await GET("auth/yo", "socio");
  Ses.set("socio", r.socio);
  return r.socio;
}
const inicioStaff = (st) =>
  st.rol === "COACH" ? URL_APP + "coach.html" : URL_APP + "dashboard.html";
/** Devuelve el personal con sesión (rol tomado de la base de datos) o redirige. `roles`: lista permitida. */
async function sesionStaff(roles = ["RECEPCION", "ADMIN", "DUENO"]) {
  if (!hayToken("staff")) {
    flash("error", "Inicia sesión como personal del gimnasio.");
    location.href = URL_APP;
    throw { redirigido: true };
  }
  const st = (await GET("auth/yo", "staff")).staff;
  Ses.set("staff", st);
  if (!roles.includes(st.rol)) {
    flash("error", "Tu rol no tiene acceso a esa sección.");
    location.href = inicioStaff(st);
    throw { redirigido: true };
  }
  return st;
}

/** Guarda el token de verificación y va a la pantalla de verificar el correo. */
function irAVerificar(token, extra = {}) {
  Ses.set(TOKEN.verif, token);
  Ses.set("verif", extra);
  location.href =
    (extra.tipo === "staff" ? URL_APP : URL_PORTAL) + "verificar.html";
  return null;
}

// Cerrar sesión (los botones del menú usan data-action)
ACTIONS.logout = async () => {
  cerrarSesion("socio");
  flash("ok", "Sesión cerrada. ¡Buen entrenamiento!");
  location.href = URL_PORTAL;
};
ACTIONS.logoutStaff = async () => {
  cerrarSesion("staff");
  flash("ok", "Sesión del personal cerrada.");
  location.href = URL_APP;
};
