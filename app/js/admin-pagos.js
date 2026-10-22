'use strict';
/* Administración · pagos y corte de caja por día.  API: GET pagos/corte?dia= · GET pagos */
page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const q = query(), dia = /^\d{4}-\d{2}-\d{2}$/.test(q.dia || '') ? q.dia : hoyISO();
  const [corte, pagos] = await Promise.all([GET('pagos/corte?dia=' + dia, 'staff'), GET('pagos', 'staff')]);
  return adminShell('pagos', st, `<form class="row" style="margin-bottom:16px" data-form="diaAdmin"><input class="input" type="date" name="dia" value="${dia}" style="max-width:220px"><button class="btn" type="submit">Ver día</button></form>
    <div class="grid g-4" style="margin-bottom:18px">${corte.metodos.map(c => `<div class="card kpi"><span class="label">${METODO_NOMBRE[c.metodo] || esc(c.metodo)}</span><strong class="mono" style="font-size:22px">${dinero(c.total)}</strong><span class="trend">${c.pagos} pago(s)</span></div>`).join('')}<div class="card kpi"><span class="label">Corte de caja · ${fechaMx(dia)}</span><strong class="mono" style="font-size:22px;color:var(--accent)">${dinero(corte.total)}</strong><span class="trend">por fecha de cobro</span></div></div>
    <section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Folio</th><th>Socio</th><th>Concepto</th><th>Método</th><th>Estado</th><th>Cajero</th><th class="num">Monto</th></tr></thead><tbody>
      ${pagos.slice(0, 60).map(p => `<tr><td class="mono"><a class="link" href="recibo.html?folio=${encodeURIComponent(p.folio)}">${esc(p.folio)}</a><br><span class="hint">${fechaMx(p.pagado_en, true)}</span></td><td>${esc(p.socio)}</td><td>${esc(p.concepto)}</td><td>${METODO_NOMBRE[p.metodo] || esc(p.metodo)}${p.referencia_pago ? `<br><span class="hint mono">${esc(p.referencia_pago)}</span>` : ''}</td><td>${badge(p.estado)}</td><td class="hint">${esc(p.cajero || (p.metodo === 'mercadopago' ? 'En línea' : '—'))}</td><td class="num">${dinero(p.monto)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Sin pagos.</td></tr>'}</tbody></table></div>
      <p class="hint">Se muestran los 60 pagos más recientes.</p></section>`);
});
FORMS.diaAdmin = d => { location.search = '?dia=' + encodeURIComponent(d.dia); };
