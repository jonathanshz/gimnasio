"use strict";
/* Portal · pagar una membresía con tarjeta en línea o generar una ficha para pagar en efectivo.
   API: GET planes · GET portal/pagos · POST portal/pagar-tarjeta (simulada) · POST portal/pagos/en-linea (Mercado Pago) · POST portal/ficha
   La tarjeta se valida en el servidor (Luhn, vencimiento, CVV). Nunca se guarda el número completo ni el CVV. */
let pagoErr = null;
const marcaTarjeta = (n) =>
  /^4/.test(n)
    ? "VISA"
    : /^(5[1-5]|2[2-7])/.test(n)
      ? "MASTERCARD"
      : /^3[47]/.test(n)
        ? "AMEX"
        : null;

page(async () => {
  const q = query();
  const [planes, d, s] = await Promise.all([
    GET("planes", "socio"),
    GET("portal/pagos", "socio"),
    sesionSocio(),
  ]);
  const p = planes.find((x) => x.id === +q.plan);
  if (!p) return ir("pagos.html");
  const m = d.membresia,
    err = pagoErr;
  pagoErr = null;
  const vigente = m && m.estado === "activa";
  const ini = vigente ? addDays(parseISO(m.fecha_fin), 1) : hoy(),
    fin = addDays(ini, p.duracion_dias - 1);
  const tipo = !vigente
    ? m
      ? "Renovación"
      : "Nueva membresía"
    : m.plan_id === p.id
      ? "Renovación anticipada"
      : "Cambio de plan";
  const metodo =
    q.metodo === "efectivo" || !d.tarjeta_habilitada ? "efectivo" : "tarjeta";
  after((root) => {
    const num = $("#cc-num", root),
      exp = $("#cc-exp", root),
      cvv = $("#cc-cvv", root),
      brand = $("#cc-brand", root);
    if (!num) return;
    num.addEventListener("input", () => {
      const x = num.value.replace(/\D/g, "").slice(0, 16);
      num.value = x.replace(/(.{4})/g, "$1 ").trim();
      const b = marcaTarjeta(x);
      brand.textContent = b || "TARJETA";
      brand.classList.toggle("on", !!b);
      cvv.maxLength = b === "AMEX" ? 4 : 3;
    });
    exp.addEventListener("input", () => {
      let x = exp.value.replace(/\D/g, "").slice(0, 4);
      if (x.length > 2) x = x.slice(0, 2) + "/" + x.slice(2);
      exp.value = x;
    });
    cvv.addEventListener("input", () => {
      cvv.value = cvv.value.replace(/\D/g, "");
    });
  });
  return portalShell(
    "Pagar membresía",
    "pagos",
    s,
    `
<a href="pagos.html" class="btn btn-ghost btn-sm" style="margin-bottom:18px">${icon("back", 16)} Volver a planes</a>
<div class="grid g-main">
  <section class="card rise">
    <p class="card-kicker">Método de pago</p>
    <div class="paytabs" role="tablist">
      ${d.tarjeta_habilitada ? `<a href="pagar.html?plan=${p.id}&metodo=tarjeta" class="${metodo === "tarjeta" ? "on" : ""}">${icon("card", 20)}<span><strong>Tarjeta</strong><small>Débito o crédito · se activa al instante</small></span></a>` : ""}
      <a href="pagar.html?plan=${p.id}&metodo=efectivo" class="${metodo === "efectivo" ? "on" : ""}">${icon("receipt", 20)}<span><strong>Efectivo</strong><small>Paga en recepción con tu ficha</small></span></a>
    </div>
    ${err ? `<div class="alert alert-bad" role="alert" style="margin:18px 0 0">${icon("alert", 18)}<span>${esc(err)}</span></div>` : ""}
    ${
      metodo === "tarjeta" && d.pago_modo === "mercadopago"
        ? `
    <form class="form" data-form="pagoMP" style="margin-top:20px"><input type="hidden" name="plan_id" value="${p.id}">
      <ol class="steps-list"><li>Te llevamos al sitio seguro de <strong>Mercado Pago</strong> para pagar con tu tarjeta.</li><li>Al terminar regresas aquí y tu membresía se activa sola.</li></ol>
      <button class="btn btn-primary btn-block" type="submit">${icon("lock", 18)} Pagar ${dinero(p.precio)} con Mercado Pago</button>
      <div class="alert" style="font-size:13px">${icon("shield", 18)}<span class="muted">Tus datos de tarjeta los captura Mercado Pago; este sistema nunca los recibe ni los guarda.</span></div>
    </form>`
        : metodo === "tarjeta"
          ? `
    <form class="form" data-form="pagoTarjeta" style="margin-top:20px" novalidate autocomplete="off">
      <input type="hidden" name="plan_id" value="${p.id}">
      <div class="field"><label for="cc-name">Nombre del titular</label><input class="input upper" id="cc-name" name="titular" placeholder="COMO APARECE EN LA TARJETA"></div>
      <div class="field"><label for="cc-num">Número de tarjeta</label><div class="input-wrap">${icon("card", 18)}<input class="input mono" id="cc-num" name="numero" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="19"><span class="cc-brand mono" id="cc-brand">TARJETA</span></div></div>
      <div class="form-grid"><div class="field col-6"><label for="cc-exp">Vencimiento</label><input class="input mono" id="cc-exp" name="exp" inputmode="numeric" placeholder="MM/AA" maxlength="5"></div>
        <div class="field col-6"><label for="cc-cvv">CVV</label><input class="input mono" id="cc-cvv" name="cvv" inputmode="numeric" placeholder="123" maxlength="3" type="password"></div></div>
      <button class="btn btn-primary btn-block" type="submit">${icon("lock", 18)} Pagar ${dinero(p.precio)}</button>
      <div class="alert" style="font-size:13px">${icon("shield", 18)}<span class="muted">Pasarela <strong>simulada</strong> (<span class="mono">PAGO_TARJETA_SIMULADO</span> en config.php). Para cobros reales se sustituye por Mercado Pago: la tarjeta se envía cifrada a la pasarela y <strong>nunca</strong> se guarda aquí; solo la marca y los últimos 4 dígitos.<br>Prueba: <span class="mono">4242 4242 4242 4242</span> aprobada · <span class="mono">4000 0000 0000 0002</span> rechazada.</span></div>
    </form>`
          : `
    <form class="form" data-form="pagoEfectivo" style="margin-top:20px"><input type="hidden" name="plan_id" value="${p.id}">
      <ol class="steps-list"><li>Genera tu ficha con una referencia única.</li><li>Preséntala en recepción (impresa o en tu celular) dentro de las próximas <strong>72 horas</strong>.</li><li>Recepción escanea la referencia, recibe el efectivo y tu membresía se activa al momento.</li></ol>
      <button class="btn btn-primary btn-block" type="submit">${icon("receipt", 18)} Generar ficha de pago</button>
      <p class="hint" style="margin:0">Si ya tenías una ficha pendiente, se reemplaza por esta.</p>
    </form>`
    }
  </section>
  <aside class="card corners rise rise-2" style="align-self:start">
    <p class="card-kicker">Resumen</p><h2 class="plan-name" style="font-size:34px">${esc(p.nombre)}</h2><p class="muted" style="margin:0 0 18px">${esc(p.descripcion)}</p>
    <div class="r-row"><span class="muted">Operación</span><span>${tipo}</span></div>
    <div class="r-row"><span class="muted">Vigencia</span><span class="mono">${fechaMx(isoDate(ini))} → ${fechaMx(isoDate(fin))}</span></div>
    <div class="r-row"><span class="muted">Duración</span><span>${p.duracion_dias} día(s)</span></div>
    <div class="row row-between" style="margin-top:20px"><span class="label">Total</span><span class="r-total">${dinero(p.precio)}</span></div>
    ${tipo === "Cambio de plan" ? `<p class="hint" style="margin-top:14px">Tu plan actual (${esc(m.plan)}) sigue vigente hasta el ${fechaMx(m.fecha_fin)}; el nuevo empieza al día siguiente.</p>` : ""}
  </aside>
</div>
<div class="processing hidden" id="processing"><div class="card corners"><div class="spinner"></div><p>Procesando con el banco…</p></div></div>`,
  );
});

FORMS.pagoTarjeta = async (d, form) => {
  $("#processing").classList.remove("hidden");
  form.querySelector("[type=submit]").disabled = true;
  try {
    const p = await POST(
      "portal/pagar-tarjeta",
      {
        plan_id: +d.plan_id,
        titular: d.titular || "",
        numero: (d.numero || "").replace(/\D/g, ""),
        exp: d.exp || "",
        cvv: d.cvv || "",
      },
      "socio",
    );
    flash("ok", `Pago aprobado. Tu membresía ${p.plan} quedó activa.`);
    location.href = "recibo.html?folio=" + encodeURIComponent(p.folio);
  } catch (e) {
    if (e.redirigido) throw e;
    pagoErr = e.message;
    render();
  }
};
FORMS.pagoMP = async (d, form) => {
  form.querySelector("[type=submit]").disabled = true;
  try {
    const r = await POST(
      "portal/pagos/en-linea",
      { plan_id: +d.plan_id },
      "socio",
    );
    location.href = r.init_point; // checkout de Mercado Pago; al terminar regresa a pagos.html?folio=..&payment_id=..
  } catch (e) {
    form.querySelector("[type=submit]").disabled = false;
    if (e.redirigido) throw e;
    pagoErr = e.message;
    render();
  }
};
FORMS.pagoEfectivo = async (d) => {
  await POST("portal/ficha", { plan_id: +d.plan_id }, "socio");
  flash(
    "ok",
    "Ficha generada. Preséntala en recepción para activar tu membresía.",
  );
  location.href = "ficha.html";
};
