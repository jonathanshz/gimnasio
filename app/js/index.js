'use strict';
/* Panel del personal · inicio de sesión.
   API: POST auth/staff-login (recepción y coaches: número o correo) · POST auth/admin-login (administración y dirección: número + correo) */
let staffLogin = { error: null, v: {} };

page(async () => {
  if (hayToken('staff')) { const st = Ses.get('staff'); return ir(st ? inicioStaff(st) : 'dashboard.html'); }
  const modo = query().modo === 'admin' ? 'admin' : 'staff', st = staffLogin; staffLogin = { error: null, v: {} };
  return `<div class="reg-page"><header class="reg-head"><a href="index.html">${logo()}</a><span class="tag mono">ACCESO DEL PERSONAL</span></header>
  <div class="reg-body" style="align-items:center"><div class="panel rise">
    <p class="kicker">Personal FIT CODE</p><h2 class="title">Inicia sesión</h2>
    <p class="lead">${modo === 'admin' ? 'Administración y dirección: número de empleado, correo institucional y contraseña.' : 'Recepción y coaches: número de empleado o correo y tu contraseña.'}</p>
    <div class="tabs" role="tablist"><a href="index.html?modo=staff" class="${modo === 'staff' ? 'on' : ''}">${icon('users', 16)} Recepción y coaches</a><a href="index.html?modo=admin" class="${modo === 'admin' ? 'on' : ''}">${icon('shield', 16)} Administración</a></div>
    ${st.error ? `<div class="alert alert-bad" role="alert" style="margin-bottom:18px">${icon('alert', 18)}<span>${esc(st.error)}</span></div>` : ''}
    <form class="form card corners" data-form="${modo === 'admin' ? 'adminLogin' : 'staffLogin'}" novalidate>
      ${modo === 'admin' ? `
      <div class="field"><label for="num">Número de empleado</label><div class="input-wrap">${icon('id', 18)}<input class="input mono" id="num" name="numero" value="${esc(st.v.numero || '')}" placeholder="ADM-0001" style="text-transform:uppercase" autofocus></div></div>
      <div class="field"><label for="mail">Correo institucional</label><div class="input-wrap">${icon('file', 18)}<input class="input" type="email" id="mail" name="email" value="${esc(st.v.email || '')}" placeholder="nombre@fitcode.mx" autocomplete="username"></div></div>` : `
      <div class="field"><label for="sid">Número de empleado o correo</label><div class="input-wrap">${icon('user', 18)}<input class="input" id="sid" name="identificador" value="${esc(st.v.identificador || '')}" placeholder="REC-0001 · nombre@fitcode.mx" autocomplete="username" autofocus></div></div>`}
      <div class="field"><label for="spw">Contraseña</label><div class="input-wrap">${icon('lock', 18)}<input class="input" type="password" id="spw" name="password" autocomplete="current-password"><button type="button" class="peek" aria-label="Mostrar contraseña">${icon('eye', 18)}</button></div></div>
      <button class="btn btn-primary btn-block" type="submit">Entrar al panel ${icon('arrow', 18)}</button>
    </form>
    ${modo === 'staff' ? `<div class="divider" style="margin:24px 0 16px">¿Eres nuevo?</div>
    <div class="grid g-2"><a class="btn btn-ghost" href="registro-recepcion.html">${icon('user', 16)} Registro de recepción</a><a class="btn btn-ghost" href="registro-coach.html">${icon('dumbbell', 16)} Registro de coach</a></div>
    <p class="hint" style="text-align:center;margin-top:12px">Tu cuenta se activa cuando verifiques tu correo y administración la apruebe.</p>`
    : `<p class="hint" style="text-align:center;margin-top:16px">Las cuentas de administración las da de alta la dirección del gimnasio.</p>`}
    <p class="hint" style="text-align:center;margin-top:18px"><a class="link" href="../portal/">Ir al portal de socios</a></p>
    <details class="demo-box"><summary>Cuentas de demostración</summary><p>Si importaste <span class="mono">config/datos_demo.sql</span>:<br>
      Administración: <span class="mono">ADM-0001</span> · <span class="mono">admin@fitcode.mx</span> · <span class="mono">Admin#2026</span><br>
      Recepción: <span class="mono">REC-0001</span> · <span class="mono">Recep#2026</span> · Coach: <span class="mono">COA-0001</span> · <span class="mono">Coach#2026</span><br>
      Dueño (viene en schema.sql): <span class="mono">DUE-0001</span> · <span class="mono">dueno@fitcode.mx</span> · <span class="mono">Dueno#2026</span> — cámbiala al instalar.</p></details>
  </div></div></div>`;
});

async function entrarStaff(form, ruta, cuerpo, v) {
  try {
    const r = await conBoton(form, 'Entrando…', () => POST(ruta, cuerpo));
    Ses.set(TOKEN.staff, r.token); Ses.set('staff', r.staff);
    flash('ok', `Hola, ${r.staff.nombre_corto}. Sesión de ${ROL_NOMBRE[r.staff.rol]} iniciada.`);
    location.href = inicioStaff(r.staff);
  } catch (e) {
    if (e.data && e.data.sin_verificar) { flash('error', 'Primero verifica tu correo.'); return irAVerificar(e.data.verif_token, { tipo: 'staff' }); }
    staffLogin = { error: e.message, v }; render();
  }
}
FORMS.staffLogin = (d, form) => {
  if (!d.identificador || !d.password) { staffLogin = { error: 'Completa ambos campos.', v: d }; return render(); }
  return entrarStaff(form, 'auth/staff-login', { identificador: d.identificador.trim(), password: d.password }, { identificador: d.identificador });
};
FORMS.adminLogin = (d, form) => {
  if (!d.numero || !d.email || !d.password) { staffLogin = { error: 'Completa los tres campos.', v: d }; return render(); }
  return entrarStaff(form, 'auth/admin-login', { numero: d.numero.trim().toUpperCase(), email: d.email.trim(), password: d.password }, { numero: d.numero, email: d.email });
};
