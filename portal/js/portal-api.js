// Conexión del portal con la API (sesión de socio, separada de la del personal).
const RAIZ = location.pathname.split("/").slice(0, -2).join("/");
const API_BASE = RAIZ + "/api/v1";
const CLAVE_TOKEN = "gym_portal_token";

const Sesion = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (t) => localStorage.setItem(CLAVE_TOKEN, t),
  cerrar() {
    localStorage.removeItem(CLAVE_TOKEN);
    location.href = "index.html";
  },
  proteger() {
    if (!this.token()) this.cerrar();
  },
};

async function api(ruta, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (Sesion.token()) headers.Authorization = "Bearer " + Sesion.token();
  let resp;
  try {
    resp = await fetch(`${API_BASE}/${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No hay conexión con el servidor.");
  }
  const json = await resp.json().catch(() => null);
  if (!json) throw new Error("El servidor no respondió correctamente.");
  if (resp.status === 401 && !ruta.startsWith("auth/")) {
    Sesion.cerrar();
    throw new Error(json.error);
  }
  if (!json.ok) throw new Error(json.error || "Ocurrió un error.");
  return json.data;
}

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dinero = (n) =>
  Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
function fecha(f) {
  if (!f) return "—";
  const [y, m, d] = f.split(/[ T]/)[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Barra superior y pestañas comunes a las pantallas internas. */
function pintarMarco(activa) {
  document.getElementById("marco").innerHTML = `
    <header class="barra"><div class="marca"><span class="disco"></span>GymControl</div><button id="salir">Cerrar sesión</button></header>
    <nav class="pestanas" aria-label="Secciones">
      <a href="mi-membresia.html" class="${activa === "membresia" ? "activa" : ""}">Mi membresía</a>
      <a href="mis-pagos.html" class="${activa === "pagos" ? "activa" : ""}">Mis pagos</a>
    </nav>`;
  document.getElementById("salir").onclick = () => Sesion.cerrar();
}
