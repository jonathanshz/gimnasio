'use strict';
/* Administración · códigos de registro generados en recepción (vigencia, uso).  API: GET codigos · POST codigos */
page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const lista = await GET('codigos', 'staff'), ahora = ahoraISO();
  const estado = c => c.usado_en ? badge('pagado', 'usado') : c.expira_en < ahora ? badge('expirado') : badge('activo', 'vigente');
  return adminShell('codigos', st, `<section class="card rise"><div class="row row-between" style="margin-bottom:16px"><p class="hint" style="margin:0">Cada código sirve una sola vez y vence a las 72 horas. Solo los generados aquí o en recepción permiten registrarse.</p>
      <form data-form="genCodigo"><button class="btn btn-sm" type="submit">${icon('key', 16)} Generar código</button></form></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Código</th><th>Estado</th><th>Generado por</th><th>Fecha</th><th>Vence</th><th>Usado por</th></tr></thead><tbody>
      ${lista.map(c => `<tr><td class="mono" style="letter-spacing:.2em">${esc(c.codigo)}</td><td>${estado(c)}</td><td>${esc(c.generado_por_nombre || '—')}</td><td class="mono">${fechaMx(c.creado_en, true)}</td><td class="mono">${fechaMx(c.expira_en, true)}</td><td class="mono">${esc(c.usado_por || '—')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin códigos.</td></tr>'}</tbody></table></div></section>`);
});
FORMS.genCodigo = async () => { const c = await POST('codigos', {}, 'staff'); flash('ok', `Código generado: ${c.codigo}. Entrégalo al cliente.`); render(); };
