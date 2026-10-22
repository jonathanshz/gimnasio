"use strict";
/* Portal · consulta de la membresía: vigencia, beneficios, historial y asistencia.  API: GET portal/membresia */
page(async () => {
  const d = await GET("portal/membresia", "socio"),
    s = d.socio,
    m = d.membresia;
  if (!m)
    return portalShell(
      "Consulta tu membresía",
      "membresia",
      s,
      `<div class="card corners rise" style="max-width:640px"><div class="empty">${icon("card", 40)}<h2 class="title">Aún no tienes membresía</h2><p class="muted">Tu cuenta está lista. Elige un plan y paga con tarjeta o en efectivo en recepción.</p><a href="pagos.html" class="btn btn-primary" style="margin-top:12px">Elegir plan ${icon("arrow", 18)}</a></div></div>`,
    );
  const sig = d.siguiente,
    pago = d.pago,
    rec = d.recientes,
    a30 = d.visitas_30;
  const ring = m.estado === "vencida" ? "bad" : m.por_vencer ? "warn" : "";
  return portalShell(
    "Consulta tu membresía",
    "membresia",
    s,
    `
<div class="grid g-main">
  <section class="card corners rise">
    <div class="card-head"><div><p class="card-kicker">Membresía <span class="mono">#MEM-${pad(m.id, 6)}</span></p><h2 class="plan-name">${esc(m.plan)}</h2><p class="muted" style="margin:0">${esc(m.descripcion)}</p></div>${badge(m.estado)}</div>
    ${m.estado === "vencida" ? `<div class="alert alert-bad" style="margin-bottom:20px">${icon("alert", 18)}<span>Tu membresía venció el <strong>${fechaMx(m.fecha_fin)}</strong>. Tu código de acceso no permitirá la entrada hasta renovar.</span></div>` : m.por_vencer ? `<div class="alert alert-warn" style="margin-bottom:20px">${icon("clock", 18)}<span>Quedan <strong>${m.dias_restantes} día(s)</strong>. Renueva antes del ${fechaMx(m.fecha_fin)} para no interrumpir tu acceso.</span></div>` : ""}
    ${sig ? `<div class="alert alert-ok" style="margin-bottom:20px">${icon("check", 18)}<span>Ya tienes pagada tu siguiente membresía <strong>${esc(sig.plan)}</strong>: inicia el ${fechaMx(sig.fecha_inicio)}.</span></div>` : ""}
    <div class="ring-wrap">
      <div class="ring ${ring}" data-pct="${m.porcentaje}" role="img" aria-label="${m.dias_restantes} días restantes"><svg viewBox="0 0 160 160"><circle class="track" cx="80" cy="80" r="70" fill="none" stroke-width="8"/><circle class="bar" cx="80" cy="80" r="70" fill="none" stroke-width="8"/></svg>
        <div class="ring-center"><strong>${m.dias_restantes}</strong><small>días<br>restantes</small></div></div>
      <dl class="dl" style="flex:1;min-width:240px">
        <div><dt>Inicio</dt><dd class="mono">${fechaMx(m.fecha_inicio)}</dd></div><div><dt>Vencimiento</dt><dd class="mono">${fechaMx(m.fecha_fin)}</dd></div>
        <div><dt>Duración</dt><dd>${m.dias_totales} días</dd></div><div><dt>Precio aplicado</dt><dd class="mono">${dinero(m.precio_aplicado)}</dd></div>
        <div><dt>Pagado con</dt><dd>${pago ? (METODO_NOMBRE[pago.metodo] || esc(pago.metodo)) + (pago.tarjeta_ultimos4 ? " ···· " + esc(pago.tarjeta_ultimos4) : "") : "—"}</dd></div><div><dt>Código de acceso</dt><dd class="mono">${esc(s.codigo_credencial)}</dd></div>
      </dl>
    </div>
    <div class="divider" style="margin:26px 0 18px">Incluye</div>
    <ul class="benefits">${m.beneficios.map((b) => `<li>${icon("check", 16)}${esc(b)}</li>`).join("")}</ul>
    <div class="actions no-print" style="margin-top:24px"><a href="pagos.html" class="btn btn-primary">${icon("refresh", 18)} Renovar o cambiar plan</a><button type="button" class="btn btn-ghost" data-action="print">${icon("print", 18)} Imprimir comprobante</button></div>
  </section>
  <div class="grid" style="align-content:start">
    <div class="grid g-2">
      <div class="card kpi rise rise-2"><span class="label">Visitas · 30 días</span><strong>${a30}</strong><span class="trend">≈ ${(a30 / 4.3).toFixed(1)} por semana</span></div>
      <div class="card kpi rise rise-2"><span class="label">En este periodo</span><strong>${d.visitas_periodo}</strong><span class="trend">desde ${fechaMx(m.fecha_inicio)}</span></div>
      <div class="card kpi rise rise-3"><span class="label">Sesión promedio</span><strong>${d.promedio_min}<small>min</small></strong><span class="trend">últimos 30 días</span></div>
      <div class="card kpi rise rise-3"><span class="label">Hora favorita</span><strong>${d.hora_favorita != null ? pad(d.hora_favorita) + ":00" : "—"}</strong><span class="trend">según tus entradas</span></div>
    </div>
    <div class="card rise rise-4"><p class="card-kicker">Historial de membresías</p>
      <ul class="timeline">${d.historial.map((h) => `<li class="${h.id === m.id ? "now" : ""}"><div class="row row-between"><strong>${esc(h.plan)}</strong>${badge(h.estado)}</div><span class="hint mono">${fechaMx(h.fecha_inicio)} → ${fechaMx(h.fecha_fin)}</span></li>`).join("")}</ul></div>
  </div>
  <section class="card rise rise-4" style="grid-column:1/-1"><div class="card-head"><div><p class="card-kicker">Registro de asistencia</p><h3 class="card-title">Entradas y salidas recientes</h3></div></div>
    ${
      rec.length
        ? `<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th class="num">Duración</th></tr></thead><tbody>
      ${rec.map((v) => `<tr><td>${fechaMx(v.entrada)}</td><td class="mono">${horaDe(v.entrada)}</td><td class="mono">${v.salida ? horaDe(v.salida) : '<span class="badge badge-ok">DENTRO</span>'}</td><td class="num">${durTxt(v)}</td></tr>`).join("")}</tbody></table></div>`
        : `<div class="empty">${icon("clock", 32)}Aún no tienes visitas registradas.</div>`
    }
  </section>
</div>`,
  );
});
