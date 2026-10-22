'use strict';
/* Administración · estado de las máquinas.  API: GET maquinas · PUT maquinas/{id}/estado (mantenimiento solo ADMIN/DUENO) */
const ESTADOS_MAQ = [['LIBRE', 'Libre'], ['OCUPADA', 'Ocupada'], ['MANTENIMIENTO', 'Mantenimiento']];

page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const lista = await GET('maquinas', 'staff');
  return adminShell('maquinas', st, `<section class="card rise"><div class="machine-grid">${lista.map(x => `<div class="machine ${x.disponibilidad}" style="opacity:1"><div class="machine-top"><span class="zone">${esc(x.zona)}</span>${badge(x.disponibilidad)}</div><strong>${esc(x.nombre)}</strong>
      <div class="row" style="gap:6px">${ESTADOS_MAQ.map(([k, t]) => `<button class="btn btn-sm ${x.estado === k ? 'btn-primary' : 'btn-ghost'}" style="flex:1;padding:0 6px;font-size:12px" data-action="equipo" data-id="${x.id}" data-estado="${k}">${t}</button>`).join('')}</div></div>`).join('')}</div>
      <p class="hint">Aquí se cambia el estado físico de cada equipo. Los socios ven este mismo estado en su portal (se actualiza cada 8 segundos).</p></section>`);
});
ACTIONS.equipo = async a => {
  await PUT(`maquinas/${a.dataset.id}/estado`, { estado: a.dataset.estado }, 'staff');
  flash('ok', 'Estado del equipo actualizado.'); render();
};
