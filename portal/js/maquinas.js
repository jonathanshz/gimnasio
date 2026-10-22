"use strict";
/* Portal · disponibilidad de máquinas en vivo (se consulta la API cada 8 segundos).  API: GET maquinas */
let maquinas = [];

page(async () => {
  const s = await sesionSocio();
  maquinas = await GET("maquinas", "socio");
  const zonas = [...new Set(maquinas.map((m) => m.zona))];
  after((root) => {
    const box = $("[data-machines]", root);
    const pintar = () => {
      const f = box.dataset.filter,
        c = { LIBRE: 0, OCUPADA: 0, MANTENIMIENTO: 0 };
      maquinas.forEach((m) => c[m.disponibilidad]++);
      $(".machine-grid", box).innerHTML = maquinas
        .filter((m) => f === "TODAS" || m.zona === f)
        .map(
          (m) =>
            `<div class="machine ${m.disponibilidad}"><div class="machine-top"><span class="zone">${esc(m.zona)}</span>${badge(m.disponibilidad)}</div><strong>${esc(m.nombre)}</strong></div>`,
        )
        .join("");
      $("[data-libres]", box).textContent = c.LIBRE;
      $("[data-ocupadas]", box).textContent = c.OCUPADA;
      $("[data-mant]", box).textContent = c.MANTENIMIENTO;
      const n = maquinas.length || 1;
      $(".occupancy", box).innerHTML =
        `<i style="width:${(c.LIBRE / n) * 100}%;background:var(--ok)"></i><i style="width:${(c.OCUPADA / n) * 100}%;background:var(--warn)"></i><i style="width:${(c.MANTENIMIENTO / n) * 100}%;background:var(--dim)"></i>`;
      $("[data-updated]", box).textContent = new Date().toLocaleTimeString(
        "es-MX",
        { hour: "2-digit", minute: "2-digit", second: "2-digit" },
      );
    };
    const refrescar = async () => {
      try {
        maquinas = await GET("maquinas", "socio");
        pintar();
      } catch (e) {
        if (e.redirigido) clearInterval(t);
      }
    };
    $$(".filters button", box).forEach(
      (b) =>
        (b.onclick = () => {
          $$(".filters button", box).forEach((x) =>
            x.classList.toggle("on", x === b),
          );
          box.dataset.filter = b.dataset.f;
          pintar();
        }),
    );
    $("[data-refresh]", box).onclick = refrescar;
    pintar();
    const t = setInterval(refrescar, 8000);
    cleanup.push(() => clearInterval(t));
  });
  return portalShell(
    "Máquinas disponibles",
    "maquinas",
    s,
    `<section data-machines data-filter="TODAS">
  <div class="grid g-3" style="margin-bottom:18px"><div class="card kpi rise"><span class="label">Libres</span><strong style="color:var(--ok)" data-libres>0</strong></div><div class="card kpi rise rise-2"><span class="label">Ocupadas</span><strong style="color:var(--warn)" data-ocupadas>0</strong></div><div class="card kpi rise rise-3"><span class="label">En mantenimiento</span><strong class="muted" data-mant>0</strong></div></div>
  <div class="card rise rise-3"><div class="card-head"><div class="filters" role="group" aria-label="Filtrar por zona"><button class="on" data-f="TODAS">Todas</button>${zonas.map((z) => `<button data-f="${esc(z)}">${esc(z)}</button>`).join("")}</div>
    <div class="row"><span class="hint mono"><span class="dot dot-live"></span> En vivo · <span data-updated></span></span><button class="icon-btn" data-refresh title="Actualizar" aria-label="Actualizar">${icon("refresh", 18)}</button></div></div>
    <div class="occupancy" style="margin-bottom:18px"></div><div class="machine-grid"></div></div></section>`,
  );
});
