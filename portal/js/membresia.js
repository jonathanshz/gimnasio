Sesion.proteger(); pintarMarco('membresia');

const ESTADOS = {
  activa: ['Membresía activa', 'Puedes entrenar con normalidad.'],
  por_vencer: ['Por vencer', 'Renueva en recepción para no perder el acceso.'],
  vencida: ['Membresía vencida', 'Pasa a recepción para renovarla.'],
  congelada: ['Membresía congelada', 'Pide en recepción que la reactiven.'],
  sin_membresia: ['Sin membresía', 'Pasa a recepción para contratar una.'],
};

(async () => {
  try {
    const d = await api('portal/mi-membresia');
    const m = d.membresia, [titulo, ayuda] = ESTADOS[m.estado] || ESTADOS.sin_membresia;
    const dias = m.dias_restantes;

    $('#contenido').innerHTML = `
      <h1>Hola, ${esc(d.nombre.split(' ')[0])}</h1>
      <p class="muted">Tu credencial y el estado de tu membresía.</p>
      <section class="estado ${m.estado}" style="margin-top:16px" aria-live="polite">
        <h2>${titulo}</h2>
        ${m.vigente_hasta && m.estado !== 'sin_membresia' ? `<span class="cifra">${dias !== null ? dias + (dias === 1 ? ' día' : ' días') : fecha(m.vigente_hasta)}</span>
        <div>${dias !== null ? 'restantes · hasta el ' + fecha(m.vigente_hasta) : 'venció el ' + fecha(m.vigente_hasta)}</div>` : ''}
        <p style="margin:8px 0 0">${ayuda}</p>
      </section>
      <section class="card credencial">
        <h2>Tu credencial</h2>
        <p class="muted">Muéstrala en el lector de recepción.</p>
        <svg id="barras" role="img" aria-label="Código de barras ${esc(d.codigo_credencial)}"></svg>
        <div class="codigo">${esc(d.codigo_credencial)}</div>
      </section>
      <section class="card">
        <h2>Historial de membresías</h2>
        ${d.historial.length ? d.historial.map(h => `
          <div class="fila"><div><strong>${esc(h.tipo)}</strong><br><span class="muted">${fecha(h.fecha_inicio)} al ${fecha(h.fecha_fin)}</span></div>
          <span><span class="insignia ${h.estado}">${h.estado}</span></span></div>`).join('')
          : '<div class="vacio">Aún no tienes membresías registradas.</div>'}
      </section>`;

    if (window.JsBarcode) JsBarcode('#barras', d.codigo_credencial, { format: 'CODE128', height: 80, displayValue: false, margin: 8 });
  } catch (e) { $('#contenido').innerHTML = `<p class="error">${esc(e.message)}</p>`; }
})();
