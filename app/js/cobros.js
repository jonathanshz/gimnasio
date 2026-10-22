'use strict';
/* Panel de recepción · cobro de fichas de pago en efectivo.  API: GET fichas/pendientes · POST pagos/cobrar-ficha */
let cobroRes = null;

page(async () => {
  const st = await sesionStaff(['RECEPCION', 'ADMIN', 'DUENO']);
  const pend = await GET('fichas/pendientes', 'staff'), r = cobroRes; cobroRes = null;
  after(root => $('#ref', root).focus());
  return staffShell('Cobros en efectivo', 'cobros', st, `
<form class="scanbar rise" data-form="cobrarFicha"><span class="scan-ico">${icon('receipt', 22)}</span>
  <div style="flex:1;min-width:200px"><label class="label" for="ref">Referencia de la ficha</label><input class="input" id="ref" name="referencia" placeholder="Escanea o escribe · EF-XXXXXXXX" autocomplete="off" style="margin-top:8px"></div>
  <button class="btn btn-primary" type="submit">${icon('check', 18)} Cobrar</button></form>
${r ? `<div class="alert ${r.ok ? 'alert-ok' : 'alert-bad'} rise" style="margin-bottom:22px">${icon(r.ok ? 'check' : 'alert', 20)}<span style="flex:1">${r.ok ? `<strong>Cobro registrado · ${dinero(r.pago.monto)}</strong> · ${esc(r.pago.socio)} · ${esc(r.pago.plan)} activa ${fechaMx(r.pago.fecha_inicio)} → ${fechaMx(r.pago.fecha_fin)} · folio <span class="mono">${esc(r.pago.folio)}</span>` : esc(r.error)}</span>${r.ok ? `<a class="btn btn-sm" href="recibo.html?folio=${encodeURIComponent(r.pago.folio)}">Recibo</a>` : ''}</div>` : ''}
<section class="card rise rise-2"><div class="card-head"><div><p class="card-kicker">Fichas generadas por los socios</p><h3 class="card-title">${pend.length} pendiente(s) de cobro</h3></div></div>
  ${pend.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Referencia</th><th>Socio</th><th>Plan</th><th>Vence</th><th class="num">Monto</th><th></th></tr></thead><tbody>
  ${pend.map(p => `<tr><td class="mono">${esc(p.referencia_pago)}</td><td>${esc(p.socio)}<br><span class="hint mono">${esc(p.socio_usuario)}</span></td><td>${esc(p.plan)}</td><td class="mono">${fechaMx(p.expira_en, true)}</td><td class="num">${dinero(p.monto)}</td>
    <td><button class="btn btn-sm btn-primary" data-action="cobrarRef" data-ref="${esc(p.referencia_pago)}">Recibí el efectivo</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${icon('receipt', 32)}No hay fichas pendientes.</div>`}
  <p class="hint">Confirma el cobro solo cuando tengas el efectivo en mano. La membresía se activa al instante y queda tu usuario como cajero.</p></section>`);
});

async function cobrar(ref) {
  try { cobroRes = { ok: true, pago: await POST('pagos/cobrar-ficha', { referencia: ref }, 'staff') }; }
  catch (e) { if (e.redirigido) throw e; cobroRes = { ok: false, error: e.message }; }
  render();
}
FORMS.cobrarFicha = d => cobrar((d.referencia || '').trim());
ACTIONS.cobrarRef = a => confirm(`¿Confirmas que recibiste el efectivo de la ficha ${a.dataset.ref}?`) ? cobrar(a.dataset.ref) : null;
