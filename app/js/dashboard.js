'use strict';
/* Panel de recepción: lector de código (entrada/salida), indicadores del día y generador de códigos de registro.
   API: GET staff/resumen · POST asistencias/lectura · POST codigos */
let ultimoScan = null, codigoNuevo = null;

page(async () => {
  const st = await sesionStaff(['RECEPCION', 'ADMIN', 'DUENO']);
  const d = await GET('staff/resumen', 'staff'), k = d.kpis, esAdmin = ['ADMIN', 'DUENO'].includes(st.rol);
  const sc = ultimoScan, cn = codigoNuevo; ultimoScan = null; codigoNuevo = null;
  after(root => $('#scan', root).focus());
  const scanHtml = !sc ? '' : `<div class="alert ${sc.ok ? 'alert-ok' : 'alert-bad'} rise" style="margin-bottom:22px;padding:16px 18px">${icon(sc.ok ? 'check' : 'alert', 22)}<div style="flex:1">
    ${sc.ok ? `<strong style="font:500 17px/1.3 var(--f-display)">${sc.tipo} · ${esc(sc.socio.nombre_completo)}</strong><div class="muted mono" style="font-size:13px;margin-top:4px">${sc.hora.slice(11)}${sc.m ? ` · ${esc(sc.m.plan)} · vence ${fechaMx(sc.m.fecha_fin)}` : ''}${sc.minutos !== undefined ? ' · estancia ' + sc.minutos + ' min' : ''}</div>`
    : `<strong style="font:500 17px/1.3 var(--f-display)">ACCESO DENEGADO${sc.socio ? ' · ' + esc(sc.socio.nombre_completo) : ''}</strong><div class="muted" style="font-size:13.5px;margin-top:4px">${esc(sc.motivo)}</div>`}</div>
    ${sc.socio ? `<a class="btn btn-sm" href="socio.html?id=${sc.socio.id}">Ver ficha</a>` : ''}</div>`;
  return staffShell('Panel de recepción', 'panel', st, `
<form class="scanbar rise" data-form="scan"><span class="scan-ico">${icon('scan', 22)}</span>
  <div style="flex:1;min-width:200px"><label class="label" for="scan">Entrada / salida de socios</label><input class="input" id="scan" name="codigo" placeholder="Escanea o escribe el código · FC2600000…" autocomplete="off" style="margin-top:8px"></div>
  <button class="btn btn-primary" type="submit">${icon('check', 18)} Registrar</button></form>
${scanHtml}
<div class="grid g-4" style="margin-bottom:22px">
  <div class="card kpi rise"><span class="label">Dentro ahora</span><strong>${k.dentro}</strong></div>
  <div class="card kpi rise rise-2"><span class="label">Entradas hoy</span><strong>${k.entradas}</strong><span class="trend">${k.rechazos} rechazo(s)</span></div>
  <div class="card kpi rise rise-3"><span class="label">Vencen en 7 días</span><strong style="color:var(--warn)">${d.por_vencer}</strong></div>
  <a href="cobros.html" class="card kpi rise rise-4"><span class="label">Cobros en efectivo pendientes</span><strong style="color:${d.fichas_pendientes ? 'var(--accent)' : 'inherit'}">${d.fichas_pendientes}</strong><span class="trend">ver fichas →</span></a>
</div>
<div class="big-choice" style="margin-bottom:22px">
  <a href="socios.html" class="rise rise-2"><span class="ico-box">${icon('users', 26)}</span><h3>Información del usuario</h3><p>Busca socios por nombre: datos, membresía, asistencias, pagos y documentos. Cobra en mostrador.</p><span class="go">Buscar socio ${icon('arrow', 16)}</span></a>
  <a href="admin-resumen.html" class="rise rise-3${esAdmin ? '' : ' locked'}"><span class="ico-box">${icon(esAdmin ? 'shield' : 'lock', 26)}</span><h3>Acceso administración</h3><p>${esAdmin ? 'Ingresos, corte de caja, personal, máquinas, códigos y bitácora.' : 'Solo para administración y dirección.'}</p><span class="go">${esAdmin ? 'Entrar' : 'Restringido'} ${icon('arrow', 16)}</span></a>
</div>
<div class="grid g-2">
  <section class="card rise rise-3"><div class="card-head"><div><p class="card-kicker">Registro</p><h3 class="card-title">Código para nuevo socio</h3></div></div>
    ${cn ? `<div class="user-reveal corners"><span class="label">Entrega este código al cliente</span><span class="mono" style="letter-spacing:.3em">${esc(cn.codigo)}</span></div>` : ''}
    <form data-form="genCodigo"><button class="btn btn-block" type="submit">${icon('key', 18)} Generar código de 6 dígitos</button></form>
    <p class="hint" style="margin-bottom:0">Vigente ${cn ? cn.vigencia_horas : 72} horas y de un solo uso. El cliente lo escribe en “Registrarme con mi código de recepción”.</p></section>
  <section class="card rise rise-4"><p class="card-kicker">Actividad reciente</p>
    ${d.recientes.map(a => `<a href="socio.html?id=${a.socio_id}" class="row row-between" style="padding:9px 0;border-bottom:1px solid var(--line)"><span>${esc(a.socio)}</span><span class="mono dim" style="font-size:12.5px">${a.tipo_movimiento === 'entrada' ? '<span class="accent">ENTRADA</span>' : 'SALIDA'} ${fechaMx(a.creado_en).slice(0, 6)} ${horaDe(a.creado_en)}</span></a>`).join('') || '<div class="empty">Sin movimientos.</div>'}</section>
</div>
<p class="hint" style="margin-top:22px">El lector USB funciona como teclado: deja el cursor en el recuadro y escanea la credencial del socio (o su pantalla en el portal).</p>`);
});

FORMS.scan = async d => { ultimoScan = await POST('asistencias/lectura', { codigo: d.codigo || '' }, 'staff').catch(e => { if (e.redirigido) throw e; return { ok: false, motivo: e.message }; }); render(); };
FORMS.genCodigo = async () => { codigoNuevo = await POST('codigos', {}, 'staff'); render(); };
