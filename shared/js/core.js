"use strict";
/* =====================================================================
   FIT CODE · núcleo compartido por app/ (personal) y portal/ (socios)
   Helpers de fechas/formato, íconos, avisos (toast), delegación de formularios y acciones,
   componentes de formulario (OTP, firma, archivos, contraseña) y motor de render de cada página.
   ===================================================================== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pad = (n, l = 2) => String(n).padStart(l, "0");
const isoDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoDateTime = (d) =>
  `${isoDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const hoy = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const hoyISO = () => isoDate(new Date());
const ahoraISO = () => isoDateTime(new Date());
const parseISO = (s) => {
  const [d, t = "00:00:00"] = String(s).split(" ");
  const [y, m, dd] = d.split("-").map(Number);
  const [h, mi, se] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, h || 0, mi || 0, se || 0);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const diasEntre = (a, b) =>
  Math.round((parseISO(isoDate(b)) - parseISO(isoDate(a))) / 864e5);
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const fechaMx = (s, hora = false) => {
  if (!s) return "—";
  const d = parseISO(s);
  return (
    `${pad(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}` +
    (hora ? ` · ${pad(d.getHours())}:${pad(d.getMinutes())}` : "")
  );
};
const horaDe = (s) => {
  const d = parseISO(s);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dinero = (n) =>
  "$" +
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) +
  " MXN";
const mayus = (s) =>
  String(s ?? "")
    .toLocaleUpperCase("es-MX")
    .replace(/\s+/g, " ")
    .trim();

const parseDMY = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [dd, mm, yy] = [+m[1], +m[2], +m[3]];
  const d = new Date(yy, mm - 1, dd);
  if (d.getDate() !== dd || d.getMonth() !== mm - 1 || d > hoy() || yy < 1900)
    return null;
  return d;
};
const edadDesde = (d) => {
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (
    n.getMonth() < d.getMonth() ||
    (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())
  )
    a--;
  return a;
};

// ---- Catálogos y etiquetas (los mismos valores que valida el servidor en config/helpers.php) ----------
const CAT_GENERO = [
  "MASCULINO",
  "FEMENINO",
  "NO BINARIO",
  "OTRO",
  "PREFIERO NO DECIRLO",
];
const CAT_SEXO = ["HOMBRE", "MUJER", "INTERSEXUAL"];
const CAT_SERVICIO = [
  "IMSS",
  "ISSSTE",
  "IMSS-BIENESTAR",
  "PEMEX",
  "SEDENA",
  "SEMAR",
  "SEGURO DE GASTOS MÉDICOS PRIVADO",
  "NINGUNO",
];
const CAT_ENF = [
  "NINGUNA",
  "DIABETES TIPO 1",
  "DIABETES TIPO 2",
  "HIPERTENSIÓN ARTERIAL",
  "ASMA",
  "OBESIDAD",
  "CARDIOPATÍA",
  "ENFERMEDAD PULMONAR OBSTRUCTIVA CRÓNICA (EPOC)",
  "ARTRITIS / ARTROSIS",
  "HIPOTIROIDISMO / HIPERTIROIDISMO",
  "EPILEPSIA",
  "INSUFICIENCIA RENAL CRÓNICA",
  "ESCOLIOSIS / HERNIA DISCAL",
  "OTRA",
];
const ROL_NOMBRE = {
  DUENO: "Dueño",
  ADMIN: "Administración",
  RECEPCION: "Recepción",
  COACH: "Coach",
};
const METODO_NOMBRE = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta (terminal)",
  mercadopago: "Tarjeta en línea",
  transferencia: "Transferencia",
};
const DOC_NOMBRE = {
  ID_OFICIAL: "Identificación oficial",
  ID_TUTOR: "Identificación del tutor",
  CERT_MEDICO: "Constancia médica",
  FIRMA: "Firma electrónica",
};

// ---- Íconos y logo ------------------------------------------------------------------------------------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  receipt:
    '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  logout:
    '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2.4.6 4 2.3 4 5.4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  scan: '<path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3M7 8v8M10 8v8M13 8v8M17 8v8"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  alert: '<path d="M12 3 2 20h20zM12 10v4M12 17v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  file: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  refresh:
    '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
  print: '<path d="M6 9V3h12v6M6 17H4v-7h16v7h-2M7 14h10v7H7z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
};
const icon = (n, s = 20, cls = "") =>
  `<svg class="ico ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const logo = () =>
  `<span class="logo"><span class="logo-mark">${icon("bolt", 16)}</span><span>FIT<b>CODE</b></span></span>`;

// ---- Avisos: flash() sobrevive a un cambio de página; toast() es inmediato -------------------------------
function flash(t, m) {
  try {
    const q = JSON.parse(sessionStorage.getItem("fc_flash") || "[]");
    q.push([t, m]);
    sessionStorage.setItem("fc_flash", JSON.stringify(q));
  } catch (_) {}
}
function mostrarFlash() {
  try {
    const q = JSON.parse(sessionStorage.getItem("fc_flash") || "[]");
    sessionStorage.removeItem("fc_flash");
    q.forEach(([t, m]) => toast(t, m));
  } catch (_) {}
}
function toast(t, m) {
  let box = $(".toasts");
  if (!box) {
    box = document.createElement("div");
    box.className = "toasts";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${t}`;
  el.setAttribute("role", "status");
  el.innerHTML = `${icon(t === "ok" ? "check" : "alert", 18)}<span>${esc(m)}</span><button type="button" class="toast-x" aria-label="Cerrar">×</button>`;
  box.appendChild(el);
  const close = () => {
    el.style.opacity = "0";
    el.style.transition = ".25s";
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector(".toast-x").onclick = close;
  setTimeout(close, 6000);
}

// ---- Motor de página: cada HTML llama page(async () => html) -----------------------------------------------
const App = { fn: null, cleanup: [], after: [], ctx: {} };
const cleanup = { push: (f) => App.cleanup.push(f) };
const after = (fn) => App.after.push(fn);
const query = () => Object.fromEntries(new URLSearchParams(location.search));
const ir = (url) => {
  location.href = url;
  return null;
}; // navegar a otra página (devuelve null para cortar el render)

async function render() {
  App.cleanup.forEach((fn) => fn());
  App.cleanup = [];
  App.after = [];
  const app = $("#app");
  let html;
  try {
    html = await App.fn();
  } catch (e) {
    if (e && e.redirigido) return;
    html = `<div class="reg-page"><div class="reg-body" style="align-items:center"><div class="panel"><div class="alert alert-bad" role="alert">${icon("alert", 18)}<span>${esc((e && e.message) || "Ocurrió un error.")}</span></div><p class="hint" style="margin-top:16px"><a class="link" href="javascript:location.reload()">Reintentar</a></p></div></div></div>`;
  }
  if (html === null || html === undefined) return;
  app.innerHTML = html;
  document.title =
    (app.querySelector("h1,h2")?.textContent ||
      document.title.split(" · ")[0] ||
      "Inicio") + " · FIT CODE";
  window.scrollTo(0, 0);
  initUI(app);
  App.after.forEach((f) => f(app));
  App.after = [];
  mostrarFlash();
}
function page(fn) {
  App.fn = fn;
  render();
}

// ---- Delegación: <form data-form="x"> → FORMS.x  ·  <a data-action="y"> → ACTIONS.y ------------------------------
const FORMS = {},
  ACTIONS = {};
const seguro = (p) =>
  Promise.resolve(p).catch((e) => {
    if (e && e.redirigido) return;
    toast("error", (e && e.message) || "Ocurrió un error.");
  });
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest("form[data-form]");
  if (!f) return;
  ev.preventDefault();
  const fd = new FormData(f);
  const data = {};
  for (const [k, v] of fd.entries()) if (!(v instanceof File)) data[k] = v;
  if (ev.submitter?.name) data[ev.submitter.name] = ev.submitter.value;
  seguro(FORMS[f.dataset.form](data, f, ev));
});
document.addEventListener("click", (ev) => {
  const a = ev.target.closest("[data-action]");
  if (!a) return;
  ev.preventDefault();
  seguro(ACTIONS[a.dataset.action](a, ev));
});
ACTIONS.print = () => window.print();

/** Bloquea el botón de envío mientras se procesa. */
async function conBoton(form, texto, fn) {
  const btn = form.querySelector("[type=submit]"),
    t0 = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = texto;
  try {
    return await fn();
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.innerHTML = t0;
    }
  }
}

// ---- Campos de formulario (HTML) ----------------------------------------------------------------------------
const BADGE = {
  activa: "ok",
  ACTIVA: "ok",
  LIBRE: "ok",
  pagado: "ok",
  activo: "ok",
  permitido: "ok",
  pendiente: "warn",
  OCUPADA: "warn",
  vencida: "bad",
  cancelada: "bad",
  cancelado: "mute",
  expirado: "mute",
  expirada: "mute",
  pagada: "ok",
  rechazado: "bad",
  inactivo: "bad",
  MANTENIMIENTO: "mute",
};
const badge = (e, txt) =>
  `<span class="badge badge-${BADGE[e] || (/denegad|invalid|sin_|vencid/.test(e) ? "bad" : "mute")}">${esc((txt || e).toUpperCase().replace(/_/g, " "))}</span>`;
const errP = (E, k) =>
  E[k] ? `<p class="hint err" data-server="1">${esc(E[k])}</p>` : "";
const opts = (cat, sel) =>
  '<option value="">Selecciona…</option>' +
  cat
    .map((c) => `<option${c === sel ? " selected" : ""}>${esc(c)}</option>`)
    .join("");

const uploadField = (name, titulo, ayuda, cargado) => `
<div class="field"><span class="label">${esc(titulo)} <span class="req">*</span></span>
  <label class="drop"><span class="drop-ico">${icon("upload", 18)}</span><span><strong>Selecciona o arrastra un archivo</strong><small>${esc(ayuda)}</small></span>
  <input type="file" name="${name}" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"></label>
  ${cargado ? `<p class="hint" style="color:var(--ok)">✓ Ya cargado (${esc(cargado.nombre)}). Puedes reemplazarlo.</p>` : ""}</div>`;
const firmaField = (titulo, cargada) => `
<div class="field" data-signature>
  <span class="label">${titulo} <span class="req">*</span></span>
  <div class="sig-tabs" role="tablist"><button type="button" class="on" data-pane="draw">Dibujar firma</button><button type="button" data-pane="file">Subir imagen</button></div>
  <div data-sig-pane="draw"><div class="sig"><canvas aria-label="Lienzo para firmar"></canvas>
    <div class="sig-bar"><span data-sig-status>Firma dentro del recuadro</span><button type="button" class="btn btn-ghost btn-sm" data-sig-clear>Limpiar</button></div></div>
    <input type="hidden" name="firma_data"></div>
  <div data-sig-pane="file" class="hidden"><label class="drop"><span class="drop-ico">${icon("pen", 18)}</span><span><strong>Imagen de la firma</strong><small>PNG o JPG · máx. 5 MB</small></span>
    <input type="file" name="firma_file" accept="image/png,image/jpeg,image/webp"></label></div>
  ${cargada ? '<p class="hint" style="color:var(--ok)">✓ Firma ya capturada. Puedes volver a firmar si quieres.</p>' : ""}
</div>`;
const pwField = (id = "pw", label = "Contraseña") => `
<div class="field"><label for="${id}">${label} <span class="req">*</span></label>
  <div class="input-wrap">${icon("lock", 18)}<input class="input" type="password" id="${id}" name="password" autocomplete="new-password" data-password><button type="button" class="peek" aria-label="Mostrar contraseña">${icon("eye", 18)}</button></div>
  <div class="pw-meter"><i></i></div>
  <ul class="pw-rules"><li data-rule="lower">Letras minúsculas (a-z)</li><li data-rule="upper">Al menos una MAYÚSCULA</li><li data-rule="num">Al menos un número</li><li data-rule="sym">Al menos un signo (#$!%*)</li><li data-rule="len">Mínimo 8 caracteres</li></ul></div>`;

function bloqueIdentidad(v, E, leyenda, tipo, extra = "") {
  const val = (k) => esc(v[k] || ""),
    inv = (k) => (E[k] ? " invalid" : "");
  return `<fieldset class="fieldset"><legend>${leyenda}</legend><div class="form-grid">
    <div class="field col-4${inv("nombre")}"><label for="nombre">Nombre(s) <span class="req">*</span></label><input class="input upper" id="nombre" name="nombre" value="${val("nombre")}" maxlength="60">${errP(E, "nombre")}</div>
    <div class="field col-4${inv("apellido_paterno")}"><label for="ap">Apellido paterno <span class="req">*</span></label><input class="input upper" id="ap" name="apellido_paterno" value="${val("apellido_paterno")}" maxlength="60">${errP(E, "apellido_paterno")}</div>
    <div class="field col-4${inv("apellido_materno")}"><label for="am">Apellido materno <span class="req">*</span></label><input class="input upper" id="am" name="apellido_materno" value="${val("apellido_materno")}" maxlength="60">${errP(E, "apellido_materno")}</div>
    <div class="field col-4${inv("fecha_nacimiento")}"><label for="fn">Fecha de nacimiento <span class="req">*</span></label>
      <input class="input mono" id="fn" name="fecha_nacimiento" value="${val("fecha_nacimiento")}" placeholder="DD/MM/AAAA" inputmode="numeric" maxlength="10" data-date data-age-for="edad" data-tipo="${tipo === "menor" ? "MENOR" : tipo === "mayor" ? "MAYOR" : ""}">
      ${E.fecha_nacimiento ? errP(E, "fecha_nacimiento") : '<p class="hint">Formato DD/MM/AAAA</p>'}</div>
    <div class="field col-2"><label for="edad">Edad <span class="req">*</span></label><input class="input mono" id="edad" name="edad" value="${val("edad")}" readonly tabindex="-1"></div>
    ${
      extra ||
      `<div class="field col-3${inv("genero")}"><label for="genero">Género <span class="req">*</span></label><select class="input" id="genero" name="genero">${opts(CAT_GENERO, v.genero)}</select>${errP(E, "genero")}</div>
    <div class="field col-3${inv("sexo")}"><label for="sexo">Sexo <span class="req">*</span></label><select class="input" id="sexo" name="sexo">${opts(CAT_SEXO, v.sexo)}</select>${errP(E, "sexo")}</div>`
    }
  </div></fieldset>`;
}
function bloqueSalud(v, E, docs, aviso, leyenda = "03 · Salud") {
  const inv = (k) => (E[k] ? " invalid" : "");
  return `<fieldset class="fieldset"><legend>${leyenda}</legend><div class="form-grid">
    <div class="field col-6${inv("servicio_medico")}"><label for="sm">Servicio médico con el que cuenta <span class="req">*</span></label><select class="input" id="sm" name="servicio_medico">${opts(CAT_SERVICIO, v.servicio_medico)}</select>${errP(E, "servicio_medico")}</div>
    <div class="field col-6${inv("enfermedad_cronica")}"><label for="enf">¿Padece alguna enfermedad crónica? <span class="req">*</span></label><select class="input" id="enf" name="enfermedad_cronica" data-toggle-when="NINGUNA">${opts(CAT_ENF, v.enfermedad_cronica)}</select>${errP(E, "enfermedad_cronica")}</div>
    <div class="field col-12 hidden" data-show-if="enf" data-values="OTRA"><label for="enf_o">Especifique la enfermedad <span class="req">*</span></label><input class="input upper" id="enf_o" name="enfermedad_otra" value="${esc(v.enfermedad_otra || "")}" maxlength="120">${errP(E, "enfermedad_otra")}</div>
    <div class="col-12 hidden" data-show-if="enf"><div class="alert alert-warn" style="margin-bottom:12px">${icon("alert", 18)}<span>${aviso}</span></div>
      ${uploadField("cert_medico", "Constancia médica", "PDF o imagen firmada por un médico · máx. 5 MB", docs.cert_medico)}${errP(E, "cert_medico")}</div>
  </div></fieldset>`;
}

/** Marca en el formulario los errores por campo que devolvió el servidor (sin perder los archivos ya elegidos). */
function marcarErrores(form, campos) {
  $$(".hint.err[data-server]", form).forEach((h) => h.remove());
  $$(".invalid", form).forEach((x) => {
    if (!x.matches("[data-date]")) x.classList.remove("invalid");
  });
  let primero = null;
  for (const [k, msg] of Object.entries(campos || {})) {
    const el =
      form.querySelector(`[name="${k}"]`) ||
      form.querySelector(`[name="${k}_data"]`) ||
      form.querySelector(`[data-campo="${k}"]`);
    if (!el) continue;
    const caja = el.closest(".field") || el.parentElement;
    caja.classList.add("invalid");
    if (el.classList.contains("input")) el.classList.add("invalid");
    const p = document.createElement("p");
    p.className = "hint err";
    p.dataset.server = "1";
    p.textContent = msg;
    caja.appendChild(p);
    if (!primero) primero = caja;
  }
  if (primero) primero.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---- Archivos: validar tipo/tamaño y comprimir imágenes antes de enviarlas ---------------------------------------
const leerArchivo = (f) =>
  new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = ko;
    r.readAsDataURL(f);
  });
async function prepararArchivo(f) {
  const tipos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!tipos.includes(f.type))
    throw new Error("formato no permitido (usa PDF, JPG, PNG o WEBP)");
  if (f.size > 5 * 1024 * 1024) throw new Error("supera los 5 MB");
  let data = await leerArchivo(f);
  if (f.type.startsWith("image/") && f.size > 250 * 1024) {
    const img = await new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = data;
    });
    const k = Math.min(1, 1200 / Math.max(img.width, img.height)),
      c = document.createElement("canvas");
    c.width = img.width * k;
    c.height = img.height * k;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    data = c.toDataURL("image/jpeg", 0.75);
  }
  return { nombre: f.name, mime: f.type, data };
}
/** Recoge los archivos y la firma de un formulario → { campo: {nombre,data} } y errores por campo. */
async function leerDocumentos(form, campos, E) {
  const docs = {};
  for (const [campo, lbl] of Object.entries(campos)) {
    const f = form.querySelector(`input[name=${campo}]`)?.files[0];
    if (f) {
      try {
        docs[campo] = await prepararArchivo(f);
      } catch (e) {
        E[campo] = `${lbl}: ${e.message}.`;
      }
    }
  }
  const dibujo = form.querySelector("input[name=firma_data]")?.value;
  if (dibujo)
    docs.firma = { nombre: "firma.png", mime: "image/png", data: dibujo };
  else {
    const f = form.querySelector("input[name=firma_file]")?.files[0];
    if (f) {
      try {
        docs.firma = await prepararArchivo(f);
      } catch (e) {
        E.firma = "Firma: " + e.message + ".";
      }
    }
  }
  return docs;
}
/** Abre un documento protegido (la API exige sesión): lo baja con el token y lo muestra en una pestaña nueva. */
async function verDocumento(ruta, tipoToken) {
  const w = window.open("", "_blank");
  if (!w)
    return toast(
      "error",
      "Permite las ventanas emergentes para ver el documento.",
    );
  w.document.write(
    '<title>Documento</title><body style="margin:0;background:#111;color:#fff;font:14px sans-serif;padding:24px">Cargando…</body>',
  );
  try {
    const blob = await apiBlob(ruta, tipoToken);
    w.location.href = URL.createObjectURL(blob);
  } catch (e) {
    w.close();
    toast("error", e.message);
  }
}

// ---- Comportamiento de los componentes (se aplica tras cada render) -----------------------------------------------
function initUI(root) {
  $$("input.upper, textarea.upper", root).forEach((el) =>
    el.addEventListener("input", () => {
      const s = el.selectionStart,
        e = el.selectionEnd;
      const v = el.value
        .toLocaleUpperCase("es-MX")
        .replace(/[^A-ZÁÉÍÓÚÜÑ\s'.-]/g, "");
      if (v !== el.value) {
        el.value = v;
        try {
          el.setSelectionRange(s, e);
        } catch (_) {}
      }
    }),
  );
  $$("[data-digits]", root).forEach((el) =>
    el.addEventListener("input", () => {
      el.value = el.value.replace(/\D/g, "").slice(0, +el.dataset.digits || 99);
    }),
  );
  $$("[data-date]", root).forEach((el) => {
    const ageEl = el.dataset.ageFor
      ? document.getElementById(el.dataset.ageFor)
      : null;
    const tipo = el.dataset.tipo,
      hint = el.closest(".field")?.querySelector(".hint"),
      original = hint?.textContent;
    el.addEventListener("input", () => {
      let d = el.value.replace(/\D/g, "").slice(0, 8);
      if (d.length > 4)
        d = d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
      else if (d.length > 2) d = d.slice(0, 2) + "/" + d.slice(2);
      el.value = d;
      el.classList.remove("invalid", "valid");
      if (hint && !hint.dataset.server) {
        hint.textContent = original;
        hint.classList.remove("err");
      }
      const dt = parseDMY(d);
      if (!dt) {
        if (ageEl) ageEl.value = "";
        if (d.length === 10) {
          el.classList.add("invalid");
          if (hint) {
            hint.textContent = "Fecha no válida.";
            hint.classList.add("err");
          }
        }
        return;
      }
      const age = edadDesde(dt);
      if (ageEl) ageEl.value = age;
      const fuera =
        (tipo === "MAYOR" && age < 18) || (tipo === "MENOR" && age >= 18);
      el.classList.add(fuera ? "invalid" : "valid");
      if (fuera && hint) {
        hint.textContent =
          tipo === "MAYOR"
            ? "La edad indica que eres menor de edad: regresa y elige “Menor de edad”."
            : "La edad indica mayoría de edad: regresa y elige “Mayor de edad”.";
        hint.classList.add("err");
      }
    });
    if (el.value) el.dispatchEvent(new Event("input"));
  });
  $$(".otp", root).forEach((box) => {
    const cells = $$("input", box),
      hidden = document.getElementById(box.dataset.target),
      btn = box.closest("form")?.querySelector("[type=submit]");
    const sync = () => {
      const v = cells.map((c) => c.value).join("");
      hidden.value = v;
      cells.forEach((c) => c.classList.toggle("filled", !!c.value));
      if (btn) btn.disabled = v.length !== 6;
    };
    cells.forEach((c, i) => {
      c.addEventListener("input", () => {
        c.value = c.value.replace(/\D/g, "").slice(-1);
        if (c.value && cells[i + 1]) cells[i + 1].focus();
        sync();
      });
      c.addEventListener("keydown", (ev) => {
        if (ev.key === "Backspace" && !c.value && cells[i - 1]) {
          cells[i - 1].focus();
          cells[i - 1].value = "";
          sync();
        }
        if (ev.key === "ArrowLeft" && cells[i - 1]) cells[i - 1].focus();
        if (ev.key === "ArrowRight" && cells[i + 1]) cells[i + 1].focus();
      });
      c.addEventListener("paste", (ev) => {
        const d = (ev.clipboardData.getData("text") || "")
          .replace(/\D/g, "")
          .slice(0, 6);
        if (!d) return;
        ev.preventDefault();
        [...d].forEach((ch, j) => {
          if (cells[j]) cells[j].value = ch;
        });
        (cells[d.length] || cells[5]).focus();
        sync();
      });
    });
    sync();
    if (box.classList.contains("shake"))
      setTimeout(() => box.classList.remove("shake"), 500);
    cells[0].focus();
  });
  $$(".drop", root).forEach((drop) => {
    const input = $("input[type=file]", drop),
      title = $("strong", drop),
      sub = $("small", drop),
      t0 = title.textContent,
      s0 = sub.textContent;
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, () => drop.classList.add("over")),
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, () => drop.classList.remove("over")),
    );
    input.addEventListener("change", () => {
      $(".drop-thumb", drop)?.remove();
      const f = input.files[0];
      if (!f) {
        drop.classList.remove("has-file");
        title.textContent = t0;
        sub.textContent = s0;
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast("error", "El archivo supera los 5 MB.");
        input.value = "";
        return input.dispatchEvent(new Event("change"));
      }
      drop.classList.add("has-file");
      title.textContent = f.name;
      sub.textContent = (f.size / 1024).toFixed(0) + " KB · listo";
      if (f.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.className = "drop-thumb";
        img.alt = "";
        img.src = URL.createObjectURL(f);
        drop.appendChild(img);
      }
    });
  });
  $$("[data-toggle-when]", root).forEach((sel) => {
    const run = () => {
      const v = sel.value;
      $$(`[data-show-if="${sel.id}"]`, root).forEach((box) => {
        const vals = box.dataset.values ? box.dataset.values.split("|") : null;
        box.classList.toggle(
          "hidden",
          !(vals ? vals.includes(v) : v && v !== sel.dataset.toggleWhen),
        );
      });
    };
    sel.addEventListener("change", run);
    run();
  });
  $$("[data-signature]", root).forEach((wrap) => {
    const canvas = $("canvas", wrap),
      out = $("input[type=hidden]", wrap),
      ctx = canvas.getContext("2d");
    let drawing = false,
      dirty = false,
      last = null;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#c8ff2e";
      dirty = false;
      out.value = "";
      $("[data-sig-status]", wrap).textContent = "Firma dentro del recuadro";
    };
    const pos = (ev) => {
      const r = canvas.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    canvas.addEventListener("pointerdown", (ev) => {
      drawing = true;
      last = pos(ev);
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener("pointermove", (ev) => {
      if (!drawing) return;
      const p = pos(ev);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      dirty = true;
    });
    const end = () => {
      if (!drawing) return;
      drawing = false;
      if (!dirty) return;
      const tmp = document.createElement("canvas");
      tmp.width = canvas.width / 2;
      tmp.height = canvas.height / 2;
      const t = tmp.getContext("2d");
      t.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = "#0b0e14";
      t.fillRect(0, 0, tmp.width, tmp.height);
      out.value = tmp.toDataURL("image/png");
      $("[data-sig-status]", wrap).textContent = "Firma capturada ✓";
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    $("[data-sig-clear]", wrap).addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      fit();
    });
    const tabs = $$(".sig-tabs button", wrap);
    tabs.forEach((b) =>
      b.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.toggle("on", x === b));
        $$("[data-sig-pane]", wrap).forEach((p) =>
          p.classList.toggle("hidden", p.dataset.sigPane !== b.dataset.pane),
        );
        if (b.dataset.pane === "draw") requestAnimationFrame(fit);
      }),
    );
    requestAnimationFrame(fit);
    const onR = () => {
      if (!dirty) fit();
    };
    window.addEventListener("resize", onR);
    cleanup.push(() => window.removeEventListener("resize", onR));
  });
  $$("[data-password]", root).forEach((input) => {
    const box = input.closest(".field"),
      meter = $(".pw-meter i", box),
      rules = $$("[data-rule]", box);
    const T = {
      len: (v) => v.length >= 8,
      lower: (v) => /[a-z]/.test(v),
      upper: (v) => /[A-Z]/.test(v),
      num: (v) => /\d/.test(v),
      sym: (v) => /[^a-zA-Z0-9]/.test(v),
    };
    input.addEventListener("input", () => {
      let ok = 0;
      rules.forEach((li) => {
        const p = T[li.dataset.rule](input.value);
        li.classList.toggle("ok", p);
        ok += p;
      });
      meter.style.width = ok * 20 + "%";
      meter.style.background =
        ok < 3 ? "var(--bad)" : ok < 5 ? "var(--warn)" : "var(--accent)";
    });
  });
  $$("[data-match]", root).forEach((c) => {
    const other = document.getElementById(c.dataset.match),
      hint = c.closest(".field").querySelector(".hint");
    const run = () => {
      if (!c.value) {
        c.classList.remove("invalid", "valid");
        hint.textContent = "";
        return;
      }
      const ok = c.value === other.value;
      c.classList.toggle("invalid", !ok);
      c.classList.toggle("valid", ok);
      hint.textContent = ok ? "Las contraseñas coinciden." : "No coinciden.";
      hint.classList.toggle("err", !ok);
    };
    c.addEventListener("input", run);
    other.addEventListener("input", run);
  });
  $$(".peek", root).forEach((b) =>
    b.addEventListener("click", () => {
      const i = b.parentElement.querySelector("input");
      i.type = i.type === "password" ? "text" : "password";
    }),
  );
  $$(".ring[data-pct]", root).forEach((r) => {
    const bar = $(".bar", r),
      len = 2 * Math.PI * 70;
    bar.style.strokeDasharray = len;
    bar.style.strokeDashoffset = len;
    setTimeout(() => {
      bar.style.strokeDashoffset = len * (1 - r.dataset.pct / 100);
    }, 120);
  });
  const af = $("[autofocus]", root);
  if (af && !$(".otp", root)) af.focus();
}
