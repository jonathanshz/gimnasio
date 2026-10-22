'use strict';
/* Administración · bitácora de acceso: todas las lecturas del lector, incluidas las rechazadas.  API: GET asistencias/bitacora?dia= */
page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const q = query(), dia = /^\d{4}-\d{2}-\d{2}$/.test(q.dia || '') ? q.dia : hoyISO();
  const b = await GET('asistencias/bitacora?dia=' + dia, 'staff');
  return adminShell('bitacora', st, `<section class="card rise"><form class="row" style="margin-bottom:16px" data-form="diaAdmin"><input class="input" type="date" name="dia" value="${dia}" style="max-width:220px"><button class="btn" type="submit">Ver día</button></form>
      <div class="table-wrap"><table class="t"><thead><tr><th>Hora</th><th>Socio</th><th>Código leído</th><th>Movimiento</th><th>Resultado</th><th>Registró</th></tr></thead><tbody>
      ${b.lecturas.map(x => `<tr><td class="mono">${horaDe(x.creado_en)}</td><td>${esc(x.socio)}</td><td class="mono">${esc(x.codigo_leido)}</td><td>${esc(x.tipo_movimiento || '—')}</td><td>${badge(x.resultado)}${x.motivo ? `<br><span class="hint">${esc(x.motivo)}</span>` : ''}</td><td class="hint">${esc(x.registro)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin lecturas ese día.</td></tr>'}</tbody></table></div>
      <p class="hint">Se guardan también los intentos rechazados (código inválido, sin membresía o vencida) en la tabla accesos_log.</p></section>`);
});
FORMS.diaAdmin = d => { location.search = '?dia=' + encodeURIComponent(d.dia); };
