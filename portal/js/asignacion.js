"use strict";
/* Portal · asignación y catálogo de membresías.  API: GET portal/membresia · GET planes */
page(async () => {
  const [d, planes] = await Promise.all([
    GET("portal/membresia", "socio"),
    GET("planes", "socio"),
  ]);
  const s = d.socio,
    m = d.membresia,
    pago = d.pago;
  return portalShell(
    "Asignación y tipo de membresía",
    "asignacion",
    s,
    `
<div class="grid g-3" style="margin-bottom:18px">
  <div class="card kpi rise"><span class="label">Tipo de socio</span><strong style="font-size:22px">${s.tipo_socio === "menor" ? "Menor de edad" : "Mayor de edad"}</strong><span class="trend">${s.tipo_socio === "menor" ? "Tutor: " + esc(s.tutor_nombre) : "Titular de la cuenta"}</span></div>
  <div class="card kpi rise rise-2"><span class="label">Membresía asignada</span><strong style="font-size:22px">${esc(m ? m.plan : "Sin asignar")}</strong><span class="trend">${m ? "Desde " + fechaMx(m.fecha_inicio) : "Elige un plan"}</span></div>
  <div class="card kpi rise rise-3"><span class="label">Asignada mediante</span><strong style="font-size:22px">${pago ? METODO_NOMBRE[pago.metodo] || esc(pago.metodo) : "—"}</strong><span class="trend">${pago ? (pago.cajero ? "Cobró: " + esc(pago.cajero.split(" ")[0]) : "Pago en línea") : "Pendiente"}</span></div>
</div>
<section class="card rise rise-3"><div class="card-head"><div><p class="card-kicker">Catálogo</p><h2 class="card-title">Tipos de membresía FIT CODE</h2></div></div>
  ${planesHTML(planes, m)}
  <p class="hint" style="margin-top:18px">La membresía se asigna automáticamente cuando se confirma tu pago (tarjeta en línea o efectivo cobrado en recepción).</p></section>`,
  );
});
