"use strict";
/* Portal · ficha de pago en efectivo con su código de barras.  API: GET portal/ficha · DELETE portal/ficha/{id} */
page(async () => {
  const [f, s] = await Promise.all([
    GET("portal/ficha", "socio"),
    sesionSocio(),
  ]);
  if (!f)
    return portalShell(
      "Ficha de pago",
      "pagos",
      s,
      `<div class="card empty rise">${icon("receipt", 32)}No tienes fichas pendientes.<br><a class="btn btn-primary" style="margin-top:14px" href="pagos.html">Ir a pagos</a></div>`,
    );
  return portalShell(
    "Ficha de pago en efectivo",
    "pagos",
    s,
    `
<section class="card corners receipt rise">
  <div class="row row-between" style="margin-bottom:20px">${logo()}<span class="mono dim">FICHA DE PAGO</span></div>
  <p class="card-kicker">Referencia</p><h2 class="title mono" style="letter-spacing:.12em">${esc(f.referencia_pago)}</h2>
  <div style="background:#f4f6f2;padding:14px;border-radius:10px;margin:8px 0 18px">${barcodeSVG(f.referencia_pago, 70, 1.8)}</div>
  <div class="r-row"><span class="muted">Socio</span><span>${esc(s.nombre_completo)}</span></div>
  <div class="r-row"><span class="muted">Concepto</span><span>${esc(f.concepto)}</span></div>
  <div class="r-row"><span class="muted">Generada</span><span class="mono">${fechaMx(f.creado_en, true)}</span></div>
  <div class="r-row"><span class="muted">Vence</span><span class="mono" style="color:var(--warn)">${fechaMx(f.expira_en, true)}</span></div>
  <div class="row row-between" style="margin-top:22px"><span class="label">Total a pagar en recepción</span><span class="r-total">${dinero(f.monto)}</span></div>
  <div class="alert" style="margin-top:20px">${icon("alert", 18)}<span class="muted">Tu membresía se activa en cuanto recepción registre el pago. Si la ficha vence, genera una nueva.</span></div>
  <div class="actions no-print"><button class="btn btn-ghost btn-danger" data-action="cancelarFicha" data-id="${f.id}">Cancelar ficha</button><button class="btn btn-primary" data-action="print">${icon("print", 18)} Imprimir</button></div>
</section>`,
  );
});

ACTIONS.cancelarFicha = async (a) => {
  if (!confirm("¿Cancelar esta ficha de pago?")) return;
  await DELETE("portal/ficha/" + a.dataset.id, "socio");
  flash("ok", "Ficha cancelada.");
  location.href = "pagos.html";
};
