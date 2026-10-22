"use strict";
/* Portal · pagos, recibos y cambio de plan.  API: GET portal/pagos · GET planes */
/** Al volver del checkout de Mercado Pago llegan ?folio=..&payment_id=..&status=..: se verifica el pago en el servidor. */
async function retornoMercadoPago() {
  const q = query();
  if (!q.folio) return;
  history.replaceState(null, "", location.pathname); // evita re-verificar al recargar
  if (!q.payment_id) {
    flash("error", "El pago no se completó. No se hizo ningún cargo.");
    return;
  }
  try {
    const r = await POST(
      `portal/pagos/en-linea/${encodeURIComponent(q.folio)}/verificar`,
      { payment_id: q.payment_id },
      "socio",
    );
    if (r.estado === "pagado" && r.folio_recibo) {
      flash("ok", "Pago aprobado. Tu membresía quedó activa.");
      return ir("recibo.html?folio=" + encodeURIComponent(r.folio_recibo));
    }
    flash(
      r.estado === "pendiente" ? "ok" : "error",
      r.estado === "pendiente"
        ? "Tu pago está en proceso. Se activará la membresía en cuanto Mercado Pago lo confirme."
        : r.estado === "revision"
          ? "Recibimos tu pago pero el monto requiere revisión del personal. Contacta a recepción."
          : "El pago fue rechazado. Intenta con otra tarjeta o paga en efectivo.",
    );
  } catch (e) {
    if (e.redirigido) throw e;
    flash("error", e.message);
  }
}

page(async () => {
  if ((await retornoMercadoPago()) === null) return null;
  const [d, planes, s] = await Promise.all([
    GET("portal/pagos", "socio"),
    GET("planes", "socio"),
    sesionSocio(),
  ]);
  const pagos = d.pagos,
    m = d.membresia,
    ficha = d.ficha;
  const total = pagos.reduce((a, p) => a + p.monto, 0);
  return portalShell(
    "Pagos, recibos y cambio de plan",
    "pagos",
    s,
    `
${ficha ? `<div class="alert alert-warn rise" style="margin-bottom:18px">${icon("receipt", 18)}<span style="flex:1">Ficha de pago en efectivo <strong class="mono">${esc(ficha.referencia_pago)}</strong> por <strong>${dinero(ficha.monto)}</strong> (${esc(ficha.plan)}). Vence el ${fechaMx(ficha.expira_en, true)}.</span><a class="btn btn-sm" href="ficha.html">Ver ficha</a></div>` : ""}
<div class="grid g-3" style="margin-bottom:18px">
  <div class="card kpi rise"><span class="label">Pagos confirmados</span><strong>${pagos.length}</strong><span class="trend">desde tu ingreso</span></div>
  <div class="card kpi rise rise-2"><span class="label">Total invertido</span><strong class="mono" style="font-size:24px">${dinero(total)}</strong><span class="trend">en tu entrenamiento</span></div>
  <div class="card kpi rise rise-3"><span class="label">Próximo pago</span><strong class="mono" style="font-size:24px">${m ? fechaMx(m.fecha_fin) : "Hoy"}</strong><span class="trend">${m ? dinero(m.precio) + " · " + esc(m.plan) : "Elige tu plan"}</span></div>
</div>
<section class="card rise rise-2" style="margin-bottom:18px"><div class="card-head"><div><p class="card-kicker">Pagar o cambiar de plan</p><h2 class="card-title">Elige un plan · paga con tarjeta o en efectivo</h2></div></div>
  ${planesHTML(planes, m, true)}
  <p class="hint" style="margin-top:14px">${m && m.estado === "activa" ? `Si ya tienes una membresía activa, el plan nuevo empieza al terminar la actual (${fechaMx(m.fecha_fin)}).` : "Tu membresía se activa en cuanto se confirma el pago."}</p></section>
<section class="card rise rise-3"><div class="card-head"><div><p class="card-kicker">Historial</p><h2 class="card-title">Pagos y recibos</h2></div></div>
  ${
    pagos.length
      ? `<div class="table-wrap"><table class="t"><thead><tr><th>Folio</th><th>Concepto</th><th>Fecha</th><th>Método</th><th>Estado</th><th class="num">Monto</th><th></th></tr></thead><tbody>
    ${pagos
      .map(
        (
          p,
        ) => `<tr><td class="mono">${esc(p.folio)}</td><td>${esc(p.concepto)}</td><td class="mono">${fechaMx(p.pagado_en)}</td><td>${METODO_NOMBRE[p.metodo] || esc(p.metodo)}${p.tarjeta_ultimos4 ? " ···· " + esc(p.tarjeta_ultimos4) : ""}</td><td>${badge(p.estado)}</td><td class="num">${dinero(p.monto)}</td>
      <td><a class="btn btn-sm btn-ghost" href="recibo.html?folio=${encodeURIComponent(p.folio)}">${icon("file", 16)} Recibo</a></td></tr>`,
      )
      .join("")}
  </tbody></table></div>`
      : `<div class="empty">${icon("receipt", 32)}Aún no tienes pagos registrados.</div>`
  }</section>`,
  );
});
