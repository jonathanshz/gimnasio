'use strict';
/* Panel de recepción · ficha del socio: datos, membresía, cobro en mostrador, documentos, asistencia y pagos.
   API: GET socios/{id} · GET planes · POST pagos/mostrador · POST pagos/cobrar-ficha · POST asistencias/lectura · GET socios/{id}/documentos/{doc} */
let socioActual = null;

page(async () => {
  const st = await sesionStaff(['RECEPCION', 'ADMIN', 'DUENO']), id = +query().id;
  if (!id) return ir('socios.html');
  let d, planes;
  try { [d, planes] = await Promise.all([GET('socios/' + id, 'staff'), GET('planes', 'staff')]); }
  catch (e) { if (e.status === 404) { flash('error', 'Socio no encontrado.'); return ir('socios.html'); } throw e; }
  const s = d.socio, m = d.membresia, dentro = d.dentro, ficha = d.ficha, docs = d.documentos;
  socioActual = s;
  after(root => $$('[data-doc]', root).forEach(a => a.onclick = e => { e.preventDefault(); verDocumento(`socios/${s.id}/documentos/${a.dataset.doc}`, 'staff'); }));
  return staffShell('Información del usuario', 'usuarios', st, `
<a href="socios.html" class="btn btn-ghost btn-sm" style="margin-bottom:18px">${icon('back', 16)} Volver a la búsqueda</a>
<div class="grid g-main">
  <section class="card corners rise">
    <div class="card-head"><div class="person"><span class="avatar" style="width:56px;height:56px;font-size:18px">${esc(s.nombre[0] + s.apellido_paterno[0])}</span><div><h2 class="card-title" style="font-size:20px">${esc(s.nombre_completo)}</h2><small class="mono">${esc(s.usuario)} · socio desde ${fechaMx(s.creado_en)}</small></div></div>
      ${dentro ? '<span class="badge badge-ok">DENTRO</span>' : '<span class="badge badge-mute">FUERA</span>'}</div>
    <dl class="dl">
      <div><dt>Edad / nacimiento</dt><dd>${s.edad} años · <span class="mono">${s.fecha_nacimiento.split('-').reverse().join('/')}</span></dd></div>
      <div><dt>Tipo</dt><dd>${s.tipo_socio === 'menor' ? 'Menor · tutor: ' + esc(s.tutor_nombre) : 'Mayor de edad'}</dd></div>
      <div><dt>Género / sexo</dt><dd>${esc(s.genero)} · ${esc(s.sexo)}</dd></div><div><dt>Servicio médico</dt><dd>${esc(s.servicio_medico)}</dd></div>
      <div><dt>Contacto</dt><dd class="mono">${esc(s.telefono)}</dd></div><div><dt>Emergencia</dt><dd class="mono">${esc(s.telefono_emergencia)}</dd></div>
      <div><dt>Correo</dt><dd>${esc(s.email)} ${s.email_verificado_en ? badge('activo', 'verificado') : badge('pendiente', 'sin verificar')}</dd></div>
      <div><dt>Enfermedad crónica</dt><dd>${s.enfermedad_cronica === 'NINGUNA' ? 'Ninguna' : `<span style="color:var(--warn)">${esc(s.enfermedad_cronica === 'OTRA' ? s.enfermedad_otra : s.enfermedad_cronica)}</span>`}</dd></div>
    </dl>
    <div style="margin-top:22px;background:#f4f6f2;border-radius:10px;padding:14px 16px">${barcodeSVG(s.codigo_credencial, 60, 1.6)}<div class="mono" style="text-align:center;font-size:12px;letter-spacing:.3em;margin-top:8px;color:#07080a">${esc(s.codigo_credencial)}</div></div>
    <button class="btn btn-block" style="margin-top:14px" data-action="accesoManual">${icon('scan', 18)} Registrar ${dentro ? 'salida' : 'entrada'} manual</button>
  </section>
  <div class="grid" style="align-content:start">
    <section class="card rise rise-2">
      <div class="card-head"><div><p class="card-kicker">Membresía</p><h3 class="card-title">${esc(m ? m.plan : 'Sin membresía')}</h3></div>${m ? badge(m.estado) : ''}</div>
      ${m ? `<p class="mono muted" style="margin:0 0 16px;font-size:13px">${fechaMx(m.fecha_inicio)} → ${fechaMx(m.fecha_fin)} · ${m.dias_restantes} días restantes</p>` : ''}
      ${ficha ? `<div class="alert alert-warn" style="margin-bottom:12px">${icon('receipt', 18)}<span style="flex:1">Ficha en efectivo <strong class="mono">${esc(ficha.referencia_pago)}</strong> · ${dinero(ficha.monto)} (${esc(ficha.plan)})</span><button class="btn btn-sm btn-primary" data-action="cobrarRef" data-ref="${esc(ficha.referencia_pago)}">Cobrar</button></div>` : ''}
      <form class="form" data-form="cobroMostrador">
        <div class="form-grid">
          <div class="field col-6"><label for="pl">Plan a cobrar</label><select class="input" id="pl" name="plan_id">${planOpts(planes, m && m.plan_id)}</select></div>
          <div class="field col-6"><label for="mt">Método</label><select class="input" id="mt" name="metodo"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta (terminal)</option></select></div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${icon('check', 18)} Cobrar en mostrador y asignar</button>
        <p class="hint" style="margin:0">Si tiene membresía activa, la nueva empieza al terminar la actual.</p></form>
    </section>
    <section class="card rise rise-3"><p class="card-kicker">Documentos</p>
      ${docs.length ? `<div class="doc-list">${docs.map(x => `<a href="#" data-doc="${x.id}">${icon('file', 16)}${DOC_NOMBRE[x.tipo] || esc(x.tipo)}<span class="hint mono" style="margin-left:auto">${esc((x.mime || '').split('/')[1]?.toUpperCase() || '')}</span></a>`).join('')}</div>` : '<p class="hint">Sin documentos cargados.</p>'}</section>
  </div>
  <section class="card rise rise-3"><p class="card-kicker">Asistencia</p><div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th></tr></thead><tbody>
    ${d.visitas.map(v => `<tr><td>${fechaMx(v.entrada)}</td><td class="mono">${horaDe(v.entrada)}</td><td class="mono">${v.salida ? horaDe(v.salida) : '<span class="badge badge-ok">DENTRO</span>'}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Sin visitas.</td></tr>'}</tbody></table></div></section>
  <section class="card rise rise-4"><p class="card-kicker">Pagos</p><div class="table-wrap"><table class="t"><thead><tr><th>Folio</th><th>Concepto</th><th>Estado</th><th class="num">Monto</th></tr></thead><tbody>
    ${d.pagos.map(p => `<tr><td class="mono"><a class="link" href="recibo.html?folio=${encodeURIComponent(p.folio)}">${esc(p.folio)}</a><br><span class="hint">${fechaMx(p.pagado_en)} · ${METODO_NOMBRE[p.metodo] || esc(p.metodo)}</span></td><td>${esc(p.concepto)}</td><td>${badge(p.estado)}</td><td class="num">${dinero(p.monto)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sin pagos.</td></tr>'}</tbody></table></div></section>
</div>`);
});

FORMS.cobroMostrador = async (d, form) => {
  const p = await conBoton(form, 'Cobrando…', () => POST('pagos/mostrador', { socio_id: socioActual.id, plan_id: +d.plan_id, metodo: d.metodo }, 'staff'));
  flash('ok', `Cobro registrado (${METODO_NOMBRE[p.metodo]}). ${p.plan}: ${fechaMx(p.fecha_inicio)} → ${fechaMx(p.fecha_fin)}. Folio ${p.folio}.`); render();
};
ACTIONS.cobrarRef = async a => {
  if (!confirm(`¿Confirmas que recibiste el efectivo de la ficha ${a.dataset.ref}?`)) return;
  const p = await POST('pagos/cobrar-ficha', { referencia: a.dataset.ref }, 'staff');
  flash('ok', `Cobro registrado. ${p.plan}: ${fechaMx(p.fecha_inicio)} → ${fechaMx(p.fecha_fin)}. Folio ${p.folio}.`); render();
};
ACTIONS.accesoManual = async () => {
  const r = await POST('asistencias/lectura', { codigo: socioActual.codigo_credencial }, 'staff');
  flash(r.ok ? 'ok' : 'error', r.ok ? `${r.tipo} registrada a las ${horaDe(r.hora)}.` : r.motivo); render();
};
