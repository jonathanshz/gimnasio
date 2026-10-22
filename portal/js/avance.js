"use strict";
/* Portal · avance físico, rutina y nutrición.
   API: GET portal/avance · POST portal/avance/perfil · POST portal/avance/medicion
   La rutina sugerida y el plan nutricional se calculan en el navegador (shared/js/fitness.js);
   la rutina “asignada por el coach” viene guardada en la base de datos. */
const TABS_AVANCE = [
  ["resumen", "avance.html?tab=resumen", "Progreso e IMC"],
  ["rutina", "avance.html?tab=rutina", "Rutina semanal"],
  ["nutricion", "avance.html?tab=nutricion", "Plan nutricional sugerido"],
  ["objetivo", "avance.html?tab=objetivo", "Objetivo"],
];

page(async () => {
  const q = query(),
    av = await GET("portal/avance", "socio"),
    s = av.socio,
    F = datosFitness(av);
  after((root) => initIMC(root, s.edad));
  if (!F || q.tab === "objetivo")
    return portalShell(
      "Avance, rutina y nutrición",
      "avance",
      s,
      (F ? tabsDe(TABS_AVANCE, "objetivo") : "") +
        onboardingHTML(
          av.expediente,
          F?.u,
          "perfilSocio",
          "",
          F ? "Ajustar objetivo" : "Primer paso",
        ),
    );
  const tab = ["resumen", "rutina", "nutricion"].includes(q.tab)
    ? q.tab
    : "resumen";
  const plan = generarPlan(F),
    asignada = av.rutina,
    o = OBJETIVOS[F.objetivo];
  let html = "";
  if (tab === "resumen")
    html =
      `<div class="goalbar card rise">${icon(o.icono, 24)}<div><span class="label">Objetivo</span><strong>${o.nombre}</strong></div><div><span class="label">Nivel</span><strong>${NIVELES[F.nivel]}</strong></div><div><span class="label">Entrena</span><strong>${F.dias} días/sem</strong></div><div><span class="label">Edad</span><strong>${s.edad} años</strong></div><div><span class="label">Estatura</span><strong>${F.estatura} cm</strong></div><a class="btn btn-sm" href="avance.html?tab=objetivo">Cambiar</a></div>` +
      progresoHTML(F, s.edad, "medicionSocio");
  if (tab === "rutina")
    html =
      (asignada ? rutinaAsignadaHTML(asignada) : "") +
      `<section class="card rise"><div class="card-head"><div><p class="card-kicker">Rutina semanal sugerida</p><h3 class="card-title">${esc(plan.nombre)} · ${NIVELES[F.nivel]}</h3></div></div>
      ${plan.notas.map((n) => `<div class="alert" style="margin-bottom:10px">${icon("alert", 16)}<span class="muted">${esc(n)}</span></div>`).join("")}
      ${semanaHTML(plan)}<p class="hint" style="margin-top:16px">${icon("chart", 14)} Progresión: ${esc(plan.progresion)} Calienta 5-10 min antes de cada sesión.</p></section>`;
  if (tab === "nutricion") html = nutricionHTML(planNutricional(F));
  return portalShell(
    "Avance, rutina y nutrición",
    "avance",
    s,
    tabsDe(TABS_AVANCE, tab) + html,
  );
});

FORMS.perfilSocio = async (d) => {
  if (!d.objetivo) return toast("error", "Elige un objetivo.");
  const e = validarMedicion(d);
  if (e) return toast("error", e);
  await POST("portal/avance/perfil", d, "socio");
  flash(
    "ok",
    "Listo: tu rutina y tu plan nutricional se generaron con tus datos.",
  );
  location.href = "avance.html?tab=rutina";
};
FORMS.medicionSocio = async (d) => {
  const e = validarMedicion(d);
  if (e) return toast("error", e);
  const r = await POST("portal/avance/medicion", d, "socio");
  flash("ok", `Medición guardada. Tu IMC ahora es ${r.imc}.`);
  render();
};
