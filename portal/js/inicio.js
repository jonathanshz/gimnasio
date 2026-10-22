'use strict';
/* Portal · “Mi acceso”: credencial con código de barras, estado de la membresía y asistencia.  API: GET portal/inicio */
page(async () => {
  const d = await GET('portal/inicio', 'socio'), s = d.socio, m = d.membresia, ficha = d.ficha;
  Ses.set('socio', s);
  const libres = d.maquinas.libres, totalMaq = d.maquinas.total || 1;
  const dias = d.dias14;
  let racha = 0; for (const [k, n] of Object.entries(dias).reverse()) { if (n) racha++; else if (k !== hoyISO()) break; }
  const max = Math.max(1, ...Object.values(dias));
  let alerta = '';
  if (ficha) alerta = `<div class="alert alert-warn">${icon('receipt', 18)}<span>Tienes una ficha de pago en efectivo por <strong>${dinero(ficha.monto)}</strong>. Preséntala en recepción: <a class="link" href="ficha.html">ver ficha ${esc(ficha.referencia_pago)}</a>.</span></div>`;
  else if (!m) alerta = `<div class="alert alert-warn">${icon('alert', 18)}<span>Aún no tienes membresía. <a class="link" href="pagos.html">Elige tu plan y paga con tarjeta o en efectivo</a>; tu código se activa al confirmarse el pago.</span></div>`;
  else if (m.estado === 'vencida') alerta = `<div class="alert alert-bad">${icon('alert', 18)}<span>Tu membresía venció el ${fechaMx(m.fecha_fin)}. <a class="link" href="pagos.html">Renueva aquí</a>.</span></div>`;
  else if (m.por_vencer) alerta = `<div class="alert alert-warn">${icon('clock', 18)}<span>Tu membresía vence en ${m.dias_restantes} día(s). <a class="link" href="pagos.html">Renueva</a> para no perder tu acceso.</span></div>`;
  return portalShell('Mi acceso', 'inicio', s, `
<div class="grid g-main">
  <section class="card access corners rise">
    <div class="access-top"><div><p class="card-kicker" style="margin-bottom:6px">Credencial digital</p><h2 class="card-title">Muestra este código en recepción</h2></div>${badge(m ? m.estado : 'pendiente', m ? m.estado : 'sin membresía')}</div>
    <div class="access-body">
      <div class="barcode-plate"><span class="laser" aria-hidden="true"></span>${barcodeSVG(s.codigo_credencial, 118, 2)}<div class="code-txt"><span>${esc(s.codigo_credencial)}</span><span>FIT·CODE</span></div></div>
      <div class="access-meta">
        <div><span class="label">Socio</span><strong>${esc(s.nombre + ' ' + s.apellido_paterno)}</strong></div>
        <div><span class="label">Plan</span><strong>${esc(m ? m.plan : 'Sin asignar')}</strong></div>
        <div><span class="label">Vence</span><strong class="mono">${m ? fechaMx(m.fecha_fin) : '—'}</strong></div>
        <div><span class="label">Tipo</span><strong>${s.tipo_socio === 'menor' ? 'Menor de edad' : 'Mayor de edad'}</strong></div>
      </div>
      ${alerta}
      <div class="access-state">${d.dentro ? `<span class="dot dot-live"></span><span>Estás <strong>dentro del gimnasio</strong> desde las <span class="mono">${horaDe(d.dentro)}</span>. Escanea al salir.</span>` : `<span class="dot"></span><span class="muted">Fuera del gimnasio · última visita: <span class="mono">${d.ultima_visita ? fechaMx(d.ultima_visita, true) : 'sin registros'}</span></span>`}</div>
      <div class="row row-between no-print"><p class="hint" style="margin:0">Sube el brillo de tu pantalla para un escaneo más rápido.</p><a class="btn btn-sm" href="codigo.html">${icon('scan', 16)} Pantalla completa</a></div>
    </div>
  </section>
  <div class="grid" style="align-content:start">
    <nav class="quick rise rise-2" aria-label="Opciones del socio">
      <a href="asignacion.html">${icon('id', 22)}<span>Asignación y tipo de membresía<small>Tu plan y catálogo</small></span></a>
      <a href="membresia.html">${icon('card', 22)}<span>Consulta tu membresía<small>${m ? m.dias_restantes + ' días restantes' : 'Sin plan activo'}</small></span></a>
      <a href="pagos.html">${icon('receipt', 22)}<span>Pagos, recibos y cambio de plan<small>Tarjeta o efectivo</small></span></a>
      <a href="avance.html">${icon('chart', 22)}<span>Avance, rutina y nutrición<small>Tu plan semanal</small></span></a>
    </nav>
    <a href="maquinas.html" class="card rise rise-3" style="display:grid;gap:14px">
      <div class="row row-between"><p class="card-kicker" style="margin:0">Máquinas en este momento</p>${icon('arrow', 18)}</div>
      <div class="row" style="align-items:baseline;gap:8px"><strong style="font:500 34px/1 var(--f-display)">${libres}</strong><span class="muted">de ${d.maquinas.total} libres</span></div>
      <div class="occupancy"><i style="width:${libres / totalMaq * 100}%;background:var(--ok)"></i></div></a>
    <div class="card rise rise-4">
      <div class="row row-between" style="margin-bottom:16px"><p class="card-kicker" style="margin:0">Asistencia · 14 días</p><span class="chip mono">${icon('bolt', 14)} Racha: ${racha} día(s)</span></div>
      <div class="bars" role="img" aria-label="Asistencias de los últimos 14 días">${Object.entries(dias).map(([k, n]) => `<i class="${n ? 'on' : ''}" style="height:${n ? Math.max(18, n / max * 100) : 4}%" title="${fechaMx(k)}: ${n}"></i>`).join('')}</div>
      <div class="bars-x"><span>${fechaMx(Object.keys(dias)[0])}</span><span>hoy</span></div>
    </div>
  </div>
</div>`);
});
