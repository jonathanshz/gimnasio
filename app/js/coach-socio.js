'use strict';
/* Panel del coach · expediente de un socio: objetivo, progreso/IMC, rutina y nutrición.
   API: GET socios/{id}/fitness · POST .../perfil · POST .../medicion · POST .../rutina · DELETE .../rutina/{rid}
   La rutina se genera en el navegador (fitness.js) y el coach la asigna: se guarda en rutinas y rutina_ejercicios. */
let paquete = null;
const idSocio = () => +query().id;

page(async () => {
  const st = await sesionStaff(['COACH']), id = idSocio(), tab = query().tab || 'progreso';
  if (!id) return ir('coach.html');
  try { paquete = await GET(`socios/${id}/fitness`, 'staff'); }
  catch (e) { if (e.status === 404) { flash('error', 'Socio no encontrado.'); return ir('coach.html'); } throw e; }
  const s = paquete.socio, F = datosFitness(paquete), asignada = paquete.rutina, hid = '';
  after(root => initIMC(root, s.edad));
  const tabs = tabsDe([['progreso', `coach-socio.html?id=${id}&tab=progreso`, 'Progreso e IMC'], ['rutina', `coach-socio.html?id=${id}&tab=rutina`, 'Rutina'], ['nutricion', `coach-socio.html?id=${id}&tab=nutricion`, 'Nutrición sugerida'], ['objetivo', `coach-socio.html?id=${id}&tab=objetivo`, 'Objetivo']], tab);
  const cab = `<a href="coach.html" class="btn btn-ghost btn-sm" style="margin-bottom:18px">${icon('back', 16)} Mis socios</a>
    <div class="goalbar card rise"><span class="avatar">${esc(s.nombre[0] + s.apellido_paterno[0])}</span><div><span class="label">Socio</span><strong>${esc(s.nombre_completo)}</strong></div><div><span class="label">Edad / sexo</span><strong>${s.edad} · ${esc(s.sexo)}</strong></div>
      <div><span class="label">Salud</span><strong style="color:${s.enfermedad_cronica === 'NINGUNA' ? 'inherit' : 'var(--warn)'}">${esc(s.enfermedad_cronica === 'OTRA' ? s.enfermedad_otra : s.enfermedad_cronica)}</strong></div>
      <div><span class="label">Objetivo</span><strong>${F ? OBJETIVOS[F.objetivo].nombre : 'Sin definir'}</strong></div></div>`;
  if (!F || tab === 'objetivo') return staffShell('Expediente del socio', 'coach', st, cab + (F ? tabs : '') + onboardingHTML(paquete.expediente, F?.u, 'perfilCoach', hid, F ? 'Ajustar objetivo' : 'El socio aún no define su objetivo'));
  let html = '';
  if (tab === 'progreso') html = progresoHTML(F, s.edad, 'medicionCoach', hid);
  if (tab === 'rutina') {
    const plan = generarPlan(F);
    html = (asignada ? `<div class="alert alert-ok" style="margin-bottom:18px">${icon('check', 18)}<span style="flex:1">Rutina asignada: <strong>${esc(asignada.nombre)}</strong> por ${esc(asignada.coach)} desde ${fechaMx(asignada.desde)}.</span><button class="btn btn-sm btn-ghost" data-action="quitarRutina" data-id="${asignada.id}">Quitar</button></div>` : '')
      + `<section class="card rise"><div class="card-head"><div><p class="card-kicker">Rutina semanal sugerida</p><h3 class="card-title">${esc(plan.nombre)} · ${NIVELES[F.nivel]}</h3></div>
        <button class="btn btn-primary btn-sm" data-action="asignarRutina">${icon('check', 16)} Asignar al socio</button></div>
        ${plan.notas.map(n => `<div class="alert" style="margin-bottom:10px">${icon('alert', 16)}<span class="muted">${esc(n)}</span></div>`).join('')}${semanaHTML(plan)}</section>`;
  }
  if (tab === 'nutricion') html = nutricionHTML(planNutricional(F));
  return staffShell('Expediente del socio', 'coach', st, cab + tabs + html);
});

FORMS.perfilCoach = async d => {
  if (!d.objetivo) return toast('error', 'Elige un objetivo.');
  const e = validarMedicion(d); if (e) return toast('error', e);
  await POST(`socios/${idSocio()}/fitness/perfil`, d, 'staff');
  flash('ok', 'Objetivo actualizado. El plan se recalculó.'); location.href = `coach-socio.html?id=${idSocio()}&tab=rutina`;
};
FORMS.medicionCoach = async d => {
  const e = validarMedicion(d); if (e) return toast('error', e);
  const r = await POST(`socios/${idSocio()}/fitness/medicion`, d, 'staff');
  flash('ok', `Medición registrada. IMC: ${r.imc}.`); render();
};
ACTIONS.asignarRutina = async () => {
  const F = datosFitness(paquete);
  await POST(`socios/${idSocio()}/fitness/rutina`, { plan: generarPlan(F) }, 'staff');
  flash('ok', `Rutina asignada a ${paquete.socio.nombre}. Ya la ve en su portal.`); render();
};
ACTIONS.quitarRutina = async a => {
  await DELETE(`socios/${idSocio()}/fitness/rutina/${a.dataset.id}`, 'staff');
  flash('ok', 'Rutina retirada.'); render();
};
