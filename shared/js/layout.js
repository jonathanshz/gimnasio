"use strict";
/* =====================================================================
   FIT CODE · piezas de interfaz compartidas por varias páginas
   Menús laterales (socio / personal / administración), recibo, catálogo de planes, buscador de socios,
   pasos del registro y los bloques de avance físico (IMC, rutina y nutrición).
   Todo recibe los datos ya traídos de la API: aquí no se hace ninguna consulta.
   ===================================================================== */

// ---------------------------------------------------------------- Menú del socio
const MENU_SOCIO = [
  ["inicio", "inicio.html", "home", "Mi acceso"],
  ["asignacion", "asignacion.html", "id", "Asignación y tipo de membresía"],
  ["membresia", "membresia.html", "card", "Consulta tu membresía"],
  ["pagos", "pagos.html", "receipt", "Pagos, recibos y cambio de plan"],
  ["avance", "avance.html", "chart", "Avance, rutina y nutrición"],
  ["maquinas", "maquinas.html", "grid", "Máquinas disponibles"],
];
function portalShell(titulo, activo, s, contenido) {
  return `<div class="shell">
  <aside class="side"><a href="inicio.html" class="side-logo">${logo()}</a>
    <nav class="side-nav" aria-label="Menú del socio">${MENU_SOCIO.map(([k, h, ic, t]) => `<a href="${h}" class="${k === activo ? "on" : ""}">${icon(ic)}<span>${t}</span></a>`).join("")}</nav>
    <div class="side-user"><div class="avatar">${esc(s.nombre[0] + s.apellido_paterno[0])}</div>
      <div class="side-user-txt"><strong>${esc(s.nombre + " " + s.apellido_paterno)}</strong><small class="mono">${esc(s.usuario)}</small></div>
      <button class="icon-btn" data-action="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${icon("logout")}</button></div></aside>
  <main class="main"><header class="topbar"><h1>${esc(titulo)}</h1><span class="chip mono"><span class="dot dot-live"></span>${fechaMx(hoyISO())}</span></header>${contenido}</main>
</div>`;
}

// ---------------------------------------------------------------- Menú del personal y de administración
function staffShell(titulo, activo, st, contenido) {
  const coach = st.rol === "COACH";
  const menu = coach
    ? [["coach", "coach.html", "users", "Mis socios"]]
    : [
        ["panel", "dashboard.html", "grid", "Inicio"],
        ["usuarios", "socios.html", "users", "Información del usuario"],
        ["cobros", "cobros.html", "receipt", "Cobros en efectivo"],
      ];
  if (["ADMIN", "DUENO"].includes(st.rol))
    menu.push([
      "admin",
      "admin-resumen.html",
      "shield",
      "Acceso administración",
    ]);
  return `<div class="shell">
  <aside class="side"><a href="${menu[0][1]}" class="side-logo">${logo()}<span class="tag mono">${coach ? "COACH" : "STAFF"}</span></a>
    <nav class="side-nav" aria-label="Menú del personal">${menu.map(([k, h, ic, t]) => `<a href="${h}" class="${k === activo ? "on" : ""}">${icon(ic)}<span>${t}</span></a>`).join("")}</nav>
    <div class="side-user"><div class="avatar">${esc(st.nombre[0])}</div><div class="side-user-txt"><strong>${esc(st.nombre_corto)}</strong><small class="mono">${ROL_NOMBRE[st.rol]} · ${esc(st.numero_empleado)}</small></div>
      <button class="icon-btn" data-action="logoutStaff" title="Cerrar sesión" aria-label="Cerrar sesión">${icon("logout")}</button></div></aside>
  <main class="main"><header class="topbar"><h1>${esc(titulo)}</h1><span class="chip mono"><span class="dot dot-live"></span>${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span></header>${contenido}</main>
</div>`;
}
const TABS_ADMIN = [
  ["resumen", "admin-resumen.html", "Resumen"],
  ["personal", "admin-personal.html", "Personal"],
  ["pagos", "admin-pagos.html", "Pagos y corte de caja"],
  ["maquinas", "admin-maquinas.html", "Máquinas"],
  ["codigos", "admin-codigos.html", "Códigos de registro"],
  ["bitacora", "admin-bitacora.html", "Bitácora de acceso"],
];
function adminShell(tab, st, html) {
  return staffShell(
    "Acceso administración",
    "admin",
    st,
    `<nav class="tabs">${TABS_ADMIN.map(([k, h, t]) => `<a href="${h}" class="${k === tab ? "on" : ""}">${t}</a>`).join("")}</nav>${html}`,
  );
}

// ---------------------------------------------------------------- Registro de socios (5 pasos)
const PASOS = ["Código", "Tipo", "Datos", "Cuenta", "Verificar"];
const regHead = (paso) => `
<header class="reg-head"><a href="index.html">${logo()}</a>
  <ol class="steps" aria-label="Progreso del registro">${PASOS.map((t, i) => {
    const n = i + 1;
    return `<li class="${n < paso ? "done" : n === paso ? "on" : ""}"><span class="n mono">${n < paso ? "✓" : n}</span><span class="t">${t}</span></li>`;
  }).join("")}</ol>
  <a href="index.html" class="btn btn-ghost btn-sm">Cancelar</a></header>`;

// ---------------------------------------------------------------- Catálogo de planes
function planesHTML(planes, m, conBoton = false) {
  const vigente = m && m.estado === "activa";
  return `<div class="plans">${planes
    .map(
      (
        p,
      ) => `<article class="plan${m && m.plan_id === p.id && vigente ? " current" : ""}"><h4>${esc(p.nombre)}</h4>
    <div class="price">$${p.precio.toLocaleString("en-US")} <small>/ ${p.duracion_dias === 1 ? "día" : p.duracion_dias + " días"}</small></div><p class="hint" style="margin:0">${esc(p.descripcion)}</p>
    <ul>${p.beneficios.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    ${conBoton ? `<a class="btn btn-sm ${m && m.plan_id === p.id ? "" : "btn-primary"}" style="margin-top:auto" href="pagar.html?plan=${p.id}">${m && m.plan_id === p.id && vigente ? "Renovar" : vigente ? "Cambiar a este plan" : "Contratar"}</a>` : ""}</article>`,
    )
    .join("")}</div>`;
}

// ---------------------------------------------------------------- Recibo / ficha
function reciboHTML(r, volver) {
  return `<section class="card corners receipt rise">
  <div class="row row-between" style="margin-bottom:20px">${logo()}<span class="mono dim">RECIBO</span></div>
  <p class="card-kicker">Folio</p><h2 class="title mono">${esc(r.folio)}</h2>
  <div class="r-row"><span class="muted">Socio</span><span>${esc(r.socio)}</span></div>
  <div class="r-row"><span class="muted">Usuario</span><span class="mono">${esc(r.socio_usuario)}</span></div>
  <div class="r-row"><span class="muted">Concepto</span><span>${esc(r.concepto)}</span></div>
  ${r.fecha_inicio ? `<div class="r-row"><span class="muted">Vigencia</span><span class="mono">${fechaMx(r.fecha_inicio)} → ${fechaMx(r.fecha_fin)}</span></div>` : ""}
  <div class="r-row"><span class="muted">Fecha de pago</span><span class="mono">${fechaMx(r.pagado_en, true)}</span></div>
  <div class="r-row"><span class="muted">Método</span><span>${METODO_NOMBRE[r.metodo] || esc(r.metodo)}${r.tarjeta_ultimos4 ? ` · ${esc(r.tarjeta_marca)} ···· ${esc(r.tarjeta_ultimos4)}` : ""}</span></div>
  ${r.referencia_pago ? `<div class="r-row"><span class="muted">Ficha</span><span class="mono">${esc(r.referencia_pago)}</span></div>` : ""}
  <div class="r-row"><span class="muted">Atendió</span><span>${esc(r.cajero || "Pago en línea")}</span></div>
  <div class="row row-between" style="margin-top:22px"><span class="label">Total pagado</span><span class="r-total">${dinero(r.monto)}</span></div>
  <div style="margin-top:26px;background:#f4f6f2;padding:12px;border-radius:10px">${barcodeSVG(r.folio, 48, 1.4)}</div>
  <div class="actions no-print"><a class="btn btn-ghost" href="${volver}">${icon("back", 18)} Volver</a><button class="btn btn-primary" data-action="print">${icon("print", 18)} Imprimir / PDF</button></div>
</section>`;
}

// ---------------------------------------------------------------- Buscador de socios (recepción y coach)
/** `modo`: 'socios' (recepción/administración) o 'coach'. `base`: página de la ficha. */
function listaSociosHTML(st, lista, q, modo) {
  const coach = modo === "coach",
    base = coach ? "coach-socio.html?id=" : "socio.html?id=";
  after((root) => {
    const i = $("#q", root);
    i.focus();
    i.setSelectionRange(i.value.length, i.value.length);
    let t;
    i.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        location.search = "?q=" + encodeURIComponent(i.value);
      }, 400);
    });
  });
  const cuerpo = `
<form class="search-big rise" data-form="buscar" role="search" style="margin-bottom:22px">${icon("search", 20)}<input class="input" id="q" name="q" value="${esc(q)}" placeholder="Buscar por nombre, apellidos, usuario o código…" aria-label="Buscar socio"></form>
<section class="card rise rise-2"><div class="card-head"><div><p class="card-kicker">${q ? "Resultados para “" + esc(q) + "”" : "Todos los socios"}</p><h3 class="card-title">${lista.length} socio(s)</h3></div></div>
  ${
    lista.length
      ? `<div class="table-wrap"><table class="t"><thead><tr><th>Socio</th>${coach ? "<th>Objetivo</th><th>IMC</th><th>Rutina</th>" : "<th>Código</th><th>Tipo</th><th>Membresía</th>"}<th></th></tr></thead><tbody>
  ${lista
    .map((s) => {
      const m = s.membresia;
      return `<tr><td><div class="person"><span class="avatar">${esc(s.nombre[0] + s.apellido_paterno[0])}</span><div><strong>${esc(s.nombre_completo)}</strong><small class="mono">${esc(s.usuario)} · ${s.edad} años</small></div></div></td>
    ${
      coach
        ? `<td>${s.objetivo && OBJETIVOS[s.objetivo] ? OBJETIVOS[s.objetivo].nombre : '<span class="hint">Sin definir</span>'}</td><td class="mono">${s.imc ?? "—"}</td><td>${s.con_rutina ? badge("activa", "asignada") : '<span class="hint">—</span>'}</td>`
        : `<td class="mono">${esc(s.codigo_credencial)}</td><td>${s.tipo_socio === "menor" ? "Menor" : "Mayor"}</td><td>${m ? badge(m.estado) + (m.estado === "activa" ? ` <span class="hint mono">→ ${fechaMx(m.fecha_fin)}</span>` : "") : badge("sin_membresia", "sin membresía")}</td>`
    }
    <td><a class="btn btn-sm" href="${base}${s.id}">Ver ficha ${icon("arrow", 14)}</a></td></tr>`;
    })
    .join("")}</tbody></table></div>`
      : `<div class="empty">${icon("search", 32)}No se encontraron socios con ese nombre.</div>`
  }</section>`;
  return staffShell(
    coach ? "Mis socios" : "Información del usuario",
    coach ? "coach" : "usuarios",
    st,
    cuerpo,
  );
}
FORMS.buscar = (d) => {
  location.search = "?q=" + encodeURIComponent(d.q || "");
};

// ---------------------------------------------------------------- Avance físico: IMC, gráfica, rutina y nutrición
function lineaSVG(series, fechas) {
  const W = 600,
    H = 170,
    P = 26,
    todos = series.flatMap((s) => s.v.filter((x) => x != null));
  if (fechas.length < 2 || !todos.length)
    return '<p class="hint">Registra al menos dos mediciones para ver la gráfica.</p>';
  return `<svg viewBox="0 0 ${W} ${H}" class="linechart" role="img" aria-label="Evolución de mediciones">${series
    .map((s) => {
      const vals = s.v.filter((x) => x != null);
      if (vals.length < 2) return "";
      const mn = Math.min(...vals),
        mx = Math.max(...vals),
        r = mx - mn || 1;
      const pts = s.v
        .map((v, i) =>
          v == null
            ? null
            : [
                P + (i * (W - 2 * P)) / (fechas.length - 1),
                H - P - ((v - mn) / r) * (H - 2 * P),
              ],
        )
        .filter(Boolean);
      return `<polyline fill="none" stroke="${s.c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((p) => p.join(",")).join(" ")}"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.c}"/>`).join("")}`;
    })
    .join(
      "",
    )}</svg><div class="legend">${series.map((s) => `<span><i style="background:${s.c}"></i>${s.n}</span>`).join("")}</div>`;
}
/** Convierte la respuesta de la API (expediente + mediciones) en lo que necesitan los generadores. null si falta el objetivo o la primera medición. */
function datosFitness(av) {
  const exp = av.expediente,
    meds = av.mediciones,
    u = meds[meds.length - 1];
  if (!exp || !exp.objetivo_principal || !u) return null;
  return {
    exp,
    meds,
    u,
    objetivo: exp.objetivo_principal,
    nivel: exp.nivel,
    dias: exp.dias_entrenamiento,
    edad: av.socio.edad,
    sexo: av.socio.sexo,
    peso: u.peso_kg,
    estatura: u.estatura_cm,
  };
}
function formMedicion(u, formName, extraHidden = "") {
  return `<form class="form" data-form="${formName}" novalidate>${extraHidden}
    <div class="form-grid">
      <div class="field col-6"><label for="m-peso">Peso (kg) <span class="req">*</span></label><input class="input mono" id="m-peso" name="peso" inputmode="decimal" value="${u ? u.peso_kg : ""}" data-imc></div>
      <div class="field col-6"><label for="m-est">Estatura (cm) <span class="req">*</span></label><input class="input mono" id="m-est" name="estatura" inputmode="decimal" value="${u ? u.estatura_cm : ""}" data-imc></div>
      <div class="field col-6"><label for="m-gr">% de grasa</label><input class="input mono" id="m-gr" name="grasa" inputmode="decimal" placeholder="Opcional" value=""></div>
      <div class="field col-6"><label for="m-mu">% muscular</label><input class="input mono" id="m-mu" name="musculo" inputmode="decimal" placeholder="Opcional" value=""></div>
    </div>
    <div class="imc-live"><span class="label">IMC calculado</span><strong class="mono" data-imc-out>—</strong><span class="hint" data-imc-cat></span></div>
    <button class="btn btn-primary btn-block" type="submit">${icon("check", 18)} Guardar medición</button></form>`;
}
function initIMC(root, edad) {
  const p = $("#m-peso", root),
    e = $("#m-est", root);
  if (!p) return;
  const run = () => {
    const v = imc(parseFloat(p.value), parseFloat(e.value));
    const c = categoriaIMC(v, edad);
    $("[data-imc-out]", root).textContent = v && isFinite(v) ? v : "—";
    $("[data-imc-cat]", root).textContent = v && isFinite(v) ? c.txt : "";
  };
  p.addEventListener("input", run);
  e.addEventListener("input", run);
  run();
}
/** Las mismas reglas que valida el servidor; evita un viaje a la API por un error de captura. */
function validarMedicion(d) {
  const peso = parseFloat(d.peso),
    est = parseFloat(d.estatura),
    g = d.grasa === "" || d.grasa == null ? "" : parseFloat(d.grasa),
    mu = d.musculo === "" || d.musculo == null ? "" : parseFloat(d.musculo);
  if (!(peso >= 25 && peso <= 300))
    return "El peso debe estar entre 25 y 300 kg.";
  if (!(est >= 100 && est <= 230))
    return "La estatura debe estar entre 100 y 230 cm.";
  if (g !== "" && !(g >= 3 && g <= 70))
    return "El % de grasa debe estar entre 3 y 70.";
  if (mu !== "" && !(mu >= 10 && mu <= 70))
    return "El % muscular debe estar entre 10 y 70.";
  return null;
}
function semanaHTML(plan) {
  return `<div class="week">${plan.semanaCompleta
    .map(
      (d) => `<article class="day${d.descanso ? " rest" : ""}">
    <header><span class="mono dim">${d.dia.slice(0, 3).toUpperCase()}</span><strong>${esc(d.enfoque)}</strong>${d.minutos ? `<span class="chip mono">${d.minutos} min</span>` : ""}</header>
    ${d.descanso ? `<p class="hint" style="margin:0">${esc(d.nota)}</p>` : `<ul class="exlist">${d.ejercicios.map((e) => `<li><span>${esc(e.nombre)}</span><span class="mono">${e.series}×${esc(e.reps)}<small>${e.descanso}s</small></span></li>`).join("")}</ul><p class="hint cardio">${icon("bolt", 14)} ${esc(d.cardio)}</p>`}
  </article>`,
    )
    .join("")}</div>`;
}
function rutinaAsignadaHTML(a, rol) {
  return `<section class="card corners rise" style="margin-bottom:18px"><div class="card-head"><div><p class="card-kicker">Asignada por tu coach</p><h3 class="card-title">${esc(a.nombre)}</h3><p class="hint" style="margin:4px 0 0">Coach ${esc(a.coach)} · desde ${fechaMx(a.desde)}</p></div>${badge("activa")}</div>
      <div class="week">${a.dias.map((d) => `<article class="day"><header><span class="mono dim">DÍA ${d.dia_numero}</span><strong>${esc(d.enfoque || "")}</strong></header><ul class="exlist">${d.ejercicios.map((e) => `<li><span>${esc(e.nombre)}</span><span class="mono">${e.series}×${esc(e.repeticiones)}<small>${e.descanso}s</small></span></li>`).join("")}</ul></article>`).join("")}</div></section>`;
}
function nutricionHTML(n) {
  if (n.menor)
    return `<div class="alert alert-warn">${icon("alert", 18)}<span>Para menores de 18 años no generamos metas de calorías: su alimentación debe indicarla su pediatra o un nutriólogo. Guía general: plato del bien comer (½ verduras y frutas, ¼ cereales integrales, ¼ proteína), agua simple y 3 comidas + 2 colaciones.</span></div>`;
  const tot = n.prot * 4 + n.grasa * 9 + n.carb * 4;
  const NOM = {
    cereal: "Cereales",
    proteina: "Proteína (AOA)",
    leguminosa: "Leguminosas",
    verdura: "Verduras",
    fruta: "Frutas",
    leche: "Lácteos",
    grasa: "Grasas",
  };
  return `<div class="alert alert-warn" style="margin-bottom:18px">${icon("alert", 18)}<span><strong>Plan SUGERIDO, no es una prescripción médica.</strong> Se calcula con fórmulas generales (Mifflin-St Jeor y equivalentes SMAE). Si tienes una enfermedad crónica, estás embarazada o tomas medicamentos, valídalo con un nutriólogo.</span></div>
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card kpi"><span class="label">Meta diaria</span><strong>${n.kcal.toLocaleString("en-US")}<small>kcal</small></strong><span class="trend">gasto estimado ${n.gasto.toLocaleString("en-US")} kcal</span></div>
    <div class="card kpi"><span class="label">Proteína</span><strong>${n.prot}<small>g</small></strong><span class="trend">${Math.round(((n.prot * 4) / tot) * 100)}% de la energía</span></div>
    <div class="card kpi"><span class="label">Carbohidratos</span><strong>${n.carb}<small>g</small></strong><span class="trend">${Math.round(((n.carb * 4) / tot) * 100)}% de la energía</span></div>
    <div class="card kpi"><span class="label">Grasas</span><strong>${n.grasa}<small>g</small></strong><span class="trend">${Math.round(((n.grasa * 9) / tot) * 100)}% de la energía</span></div>
  </div>
  ${n.limitado ? `<p class="hint">Se aplicó un mínimo seguro de calorías para no bajar de tu metabolismo basal.</p>` : ""}
  <div class="grid g-main">
    <section class="card"><p class="card-kicker">Distribución por comida (equivalentes)</p>
      ${n.comidas
        .map(
          (
            c,
          ) => `<div class="meal"><div class="row row-between"><strong>${c.nombre}</strong><span class="mono dim">${c.hora} · ≈${c.kcal} kcal</span></div>
        <div class="eqs">${Object.entries(c.eq)
          .map(([g, x]) => `<span class="eq">${x} ${NOM[g]}</span>`)
          .join(
            "",
          )}</div><p class="hint" style="margin:6px 0 0">Ejemplo: ${esc(c.ejemplo)}</p></div>`,
        )
        .join("")}
    </section>
    <div class="grid" style="align-content:start">
      <section class="card"><p class="card-kicker">¿Qué es 1 equivalente?</p><dl class="dl" style="grid-template-columns:1fr">${Object.entries(
        EJEMPLOS,
      )
        .map(
          ([g, t]) =>
            `<div><dt>${NOM[g]} · ${n.eqDia[g]} al día</dt><dd style="font-weight:400;font-size:13.5px">${esc(t)}</dd></div>`,
        )
        .join("")}</dl></section>
      <section class="card"><p class="card-kicker">Para tu objetivo</p><ul class="benefits">${n.tips.map((t) => `<li>${icon("check", 16)}${esc(t)}</li>`).join("")}<li>${icon("check", 16)}Agua: ≈ ${n.agua} L al día.</li></ul></section>
    </div>
  </div>`;
}
function onboardingHTML(
  exp,
  u,
  formName,
  extraHidden = "",
  titulo = "Configura tu plan",
) {
  const sel = exp?.objetivo_principal;
  return `<section class="card corners rise"><p class="card-kicker">${titulo}</p><h2 class="title" style="font-size:24px">¿Cuál es el objetivo?</h2>
  <p class="lead">Con el objetivo, la edad, el peso y la estatura se genera la rutina semanal y un plan nutricional sugerido. Se puede cambiar cuando quieras.</p>
  <form class="form" data-form="${formName}" novalidate>${extraHidden}
    <div class="goals">${Object.entries(OBJETIVOS)
      .map(
        ([k, o]) =>
          `<label class="goal"><input type="radio" name="objetivo" value="${k}"${k === sel ? " checked" : ""}><span>${icon(o.icono, 22)}<strong>${o.nombre}</strong><small>${o.desc}</small></span></label>`,
      )
      .join("")}</div>
    <div class="form-grid">
      <div class="field col-6"><label for="o-nivel">Nivel de experiencia</label><select class="input" id="o-nivel" name="nivel">${Object.entries(
        NIVELES,
      )
        .map(
          ([k, n]) =>
            `<option value="${k}"${k === (exp?.nivel || "principiante") ? " selected" : ""}>${n}</option>`,
        )
        .join("")}</select></div>
      <div class="field col-6"><label for="o-dias">Días por semana para entrenar</label><select class="input" id="o-dias" name="dias">${[3, 4, 5, 6].map((n) => `<option${n === (exp?.dias_entrenamiento || 3) ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field col-6"><label for="m-peso">Peso actual (kg)</label><input class="input mono" id="m-peso" name="peso" inputmode="decimal" value="${u ? u.peso_kg : ""}" data-imc></div>
      <div class="field col-6"><label for="m-est">Estatura (cm)</label><input class="input mono" id="m-est" name="estatura" inputmode="decimal" value="${u ? u.estatura_cm : ""}" data-imc></div>
      ${u ? "" : `<div class="field col-6"><label for="m-gr">% de grasa (opcional)</label><input class="input mono" id="m-gr" name="grasa" inputmode="decimal"></div><div class="field col-6"><label for="m-mu">% muscular (opcional)</label><input class="input mono" id="m-mu" name="musculo" inputmode="decimal"></div>`}
    </div>
    <div class="imc-live"><span class="label">IMC calculado</span><strong class="mono" data-imc-out>—</strong><span class="hint" data-imc-cat></span></div>
    <button class="btn btn-primary btn-block" type="submit">${icon("bolt", 18)} Generar el plan</button>
  </form></section>`;
}
function progresoHTML(F, edad, formName, extra = "") {
  const { meds, u } = F,
    c = categoriaIMC(u.imc, edad);
  const delta = (k, un) => {
    const a = meds.filter((m) => m[k] != null);
    if (a.length < 2) return '<span class="trend">Sin comparación</span>';
    const d = Math.round((a[a.length - 1][k] - a[0][k]) * 10) / 10;
    const bueno = k === "porcentaje_musculo" ? d >= 0 : d <= 0;
    return `<span class="trend" style="color:${bueno ? "var(--ok)" : "var(--warn)"}">${d > 0 ? "▲ +" : "▼ "}${d}${un} desde ${fechaMx(a[0].fecha_medicion)}</span>`;
  };
  const ult = (k) => [...meds].reverse().find((m) => m[k] != null)?.[k];
  return `<div class="grid g-4" style="margin-bottom:18px">
    <div class="card kpi"><span class="label">Peso</span><strong>${u.peso_kg}<small>kg</small></strong>${delta("peso_kg", " kg")}</div>
    <div class="card kpi"><span class="label">IMC</span><strong>${u.imc}</strong><span class="trend"><span class="badge badge-${c.cls}">${esc(c.txt)}</span></span></div>
    <div class="card kpi"><span class="label">% grasa</span><strong>${ult("porcentaje_grasa") ?? "—"}<small>%</small></strong>${delta("porcentaje_grasa", "%")}</div>
    <div class="card kpi"><span class="label">% muscular</span><strong>${ult("porcentaje_musculo") ?? "—"}<small>%</small></strong>${delta("porcentaje_musculo", "%")}</div>
  </div>
  <div class="grid g-main">
    <section class="card"><p class="card-kicker">Evolución</p>${lineaSVG(
      [
        { n: "Peso", c: "#c8ff2e", v: meds.map((m) => m.peso_kg) },
        { n: "% grasa", c: "#ffb547", v: meds.map((m) => m.porcentaje_grasa) },
        {
          n: "% muscular",
          c: "#3fe0a1",
          v: meds.map((m) => m.porcentaje_musculo),
        },
      ],
      meds.map((m) => m.fecha_medicion),
    )}
      <div class="table-wrap" style="margin-top:14px"><table class="t"><thead><tr><th>Fecha</th><th class="num">Peso</th><th class="num">IMC</th><th class="num">Grasa</th><th class="num">Músculo</th><th>Registró</th></tr></thead><tbody>
      ${[...meds]
        .reverse()
        .map(
          (m) =>
            `<tr><td>${fechaMx(m.fecha_medicion)}</td><td class="num">${m.peso_kg} kg</td><td class="num">${m.imc}</td><td class="num">${m.porcentaje_grasa ?? "—"}${m.porcentaje_grasa != null ? "%" : ""}</td><td class="num">${m.porcentaje_musculo ?? "—"}${m.porcentaje_musculo != null ? "%" : ""}</td><td class="hint">${esc(m.registro)}</td></tr>`,
        )
        .join("")}</tbody></table></div></section>
    <section class="card" style="align-self:start"><p class="card-kicker">Registrar cambios</p><h3 class="card-title" style="margin-bottom:14px">Nueva medición</h3>${formMedicion(u, formName, extra)}
      <p class="hint" style="margin-bottom:0">El IMC se recalcula automáticamente con peso y estatura.</p></section>
  </div>`;
}
const tabsDe = (items, activo) =>
  `<nav class="tabs">${items.map(([k, href, n]) => `<a href="${href}" class="${k === activo ? "on" : ""}">${n}</a>`).join("")}</nav>`;

// ---------------------------------------------------------------- Varios
const durTxt = (v) => {
  if (!v.salida) return "—";
  const mi = Math.round((parseISO(v.salida) - parseISO(v.entrada)) / 60000);
  return `${Math.floor(mi / 60)}h ${pad(mi % 60)}m`;
};
const planOpts = (planes, sel) =>
  planes
    .map(
      (p) =>
        `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${esc(p.nombre)} · $${p.precio.toLocaleString("en-US")}</option>`,
    )
    .join("");
