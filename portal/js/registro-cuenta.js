'use strict';
/* Portal · registro, paso 4 de 5: correo, teléfono y contraseña.
   API: GET registro/cuenta (usuario asignado) · POST registro/cuenta → crea el socio y manda el código al correo */
let cuentaState = { E: {}, email: '', telefono: null };

page(async () => {
  if (!hayToken('registro')) { flash('error', 'Ingresa tu código de recepción para comenzar el registro.'); return ir('registro-codigo.html'); }
  let info;
  try { info = await GET('registro/cuenta', 'registro'); }
  catch (e) { if (e.status === 409) { flash('error', e.message); return ir('registro-datos.html'); } throw e; }
  const st = cuentaState; cuentaState = { E: {}, email: '', telefono: null }; const E = st.E;
  return `<div class="reg-page">${regHead(4)}<div class="reg-body"><div class="panel rise" style="max-width:520px">
    <p class="kicker">Paso 4 de 5</p><h2 class="title">Crea tu cuenta</h2><p class="lead">Generamos tu usuario con tu nombre y fecha de nacimiento. Completa tus datos de acceso.</p>
    <div class="user-reveal corners"><span class="label">Tu usuario asignado</span><span class="mono">${esc(info.usuario)}</span><p class="hint" style="margin:10px 0 0">Nombre + iniciales de apellidos + fecha (DDMMAA). También podrás entrar con tu correo o número.</p></div>
    <form class="form" data-form="cuenta" novalidate>
      <div class="field${E.email ? ' invalid' : ''}"><label for="email">Correo electrónico <span class="req">*</span></label><div class="input-wrap">${icon('file', 18)}<input class="input" type="email" id="email" name="email" value="${esc(st.email)}" autocomplete="email" placeholder="tucorreo@ejemplo.com"></div>${errP(E, 'email')}<p class="hint">Te enviaremos un código para verificarlo.</p></div>
      <div class="field${E.telefono ? ' invalid' : ''}"><label for="tel">Número de teléfono <span class="req">*</span></label><div class="input-wrap">${icon('user', 18)}<input class="input mono" id="tel" name="telefono" value="${esc(st.telefono ?? info.tel_contacto)}" inputmode="tel" data-digits="10"></div>${errP(E, 'telefono')}</div>
      ${pwField()}${errP(E, 'password')}
      <div class="field"><label for="pw2">Confirmar contraseña <span class="req">*</span></label><div class="input-wrap">${icon('lock', 18)}<input class="input" type="password" id="pw2" name="password2" autocomplete="new-password" data-match="pw"></div><p class="hint"></p>${errP(E, 'password2')}</div>
      <button class="btn btn-primary btn-block" type="submit">${icon('check', 18)} Crear cuenta y verificar correo</button>
    </form></div></div></div>`;
});

FORMS.cuenta = async (d, form) => {
  try {
    const r = await conBoton(form, 'Creando cuenta…', () => POST('registro/cuenta', d, 'registro'));
    Ses.del(TOKEN.registro);
    irAVerificar(r.verif_token, { tipo: 'socio', usuario: r.usuario, registro: true });
  } catch (e) {
    if (e.campos) { cuentaState = { E: e.campos, email: (d.email || '').trim(), telefono: (d.telefono || '').replace(/\D/g, '') }; return render(); }
    throw e;
  }
};
