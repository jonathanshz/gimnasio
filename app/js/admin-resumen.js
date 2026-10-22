'use strict';
/* Administración · resumen: ingresos del mes, socios activos, afluencia por hora y vencimientos.  API: GET admin/resumen */
page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const r = await GET('admin/resumen', 'staff');
  const horas = r.afluencia, mx = Math.max(1, ...Object.values(horas)), totalPlan = r.por_plan.reduce((a, p) => a + p.n, 0) || 1;
  return adminShell('resumen', st, `<div class="grid g-4" style="margin-bottom:18px">
      <div class="card kpi rise"><span class="label">Ingresos del mes</span><strong class="mono" style="font-size:24px">${dinero(r.ingresos_mes)}</strong></div>
      <div class="card kpi rise rise-2"><span class="label">Socios activos</span><strong>${r.socios_activos}<small>/ ${r.socios_total}</small></strong></div>
      <div class="card kpi rise rise-3"><span class="label">Cobros en efectivo pendientes</span><strong>${r.fichas_pendientes}</strong></div>
      <a class="card kpi rise rise-4" href="admin-personal.html"><span class="label">Personal por aprobar</span><strong style="color:${r.personal_pendiente ? 'var(--accent)' : 'inherit'}">${r.personal_pendiente}</strong></a></div>
    <div class="grid g-main">
      <section class="card rise rise-2"><p class="card-kicker">Afluencia por hora · 30 días</p><div class="bars" style="height:140px">${Object.entries(horas).map(([h, n]) => `<i class="${n ? 'on' : ''}" style="height:${Math.max(3, n / mx * 100)}%" title="${h}:00 · ${n}"></i>`).join('')}</div><div class="bars-x"><span>05:00</span><span>14:00</span><span>22:00</span></div></section>
      <section class="card rise rise-3"><p class="card-kicker">Membresías activas por plan</p>${r.por_plan.map(p => `<div style="margin-bottom:12px"><div class="row row-between" style="font-size:14px"><span>${esc(p.nombre)}</span><span class="mono">${p.n}</span></div><div class="occupancy" style="margin-top:6px"><i style="width:${p.n / totalPlan * 100}%;background:var(--accent)"></i></div></div>`).join('') || '<p class="hint">Sin membresías activas.</p>'}</section>
      <section class="card rise rise-4" style="grid-column:1/-1"><p class="card-kicker">Vencen en los próximos 7 días</p>${r.por_vencer.map(s => `<a class="row row-between" href="socio.html?id=${s.id}" style="padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(s.nombre_completo)} · <span class="muted">${esc(s.plan)}</span></span><span class="mono" style="color:var(--warn)">${fechaMx(s.fecha_fin)}</span></a>`).join('') || '<p class="hint">Ninguna.</p>'}</section>
    </div>`);
});
