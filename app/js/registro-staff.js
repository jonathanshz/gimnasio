'use strict';
/* Panel del personal · autorregistro de recepcionista o coach (queda pendiente de aprobación).
   El puesto sale de <body data-puesto="recepcion|coach">.  API: POST personal/registro (datos + documentos en una sola petición) */
const PUESTO = document.body.dataset.puesto;
let staffReg = { E: {}, v: {}, docs: {} };

page(async () => {
  const coach = PUESTO === 'coach', { E, v, docs } = staffReg; staffReg = { E: {}, v: {}, docs };
  const val = k => esc(v[k] || ''), inv = k => E[k] ? ' invalid' : '', n = Object.keys(E).length;
  const rfc = (cls) => `<div class="field ${cls}${inv('rfc')}"><label for="rfc">RFC <span class="req">*</span></label><input class="input mono" id="rfc" name="rfc" value="${val('rfc')}" maxlength="10" style="text-transform:uppercase" placeholder="ABCD000000">${errP(E, 'rfc') || '<p class="hint">4 letras y 6 números, sin homoclave.</p>'}</div>`;
  return `<div class="reg-page"><header class="reg-head"><a href="index.html">${logo()}</a><a href="index.html" class="btn btn-ghost btn-sm">${icon('back', 16)} Volver</a></header>
  <div class="reg-body"><div class="panel panel-wide rise">
    <p class="kicker">${coach ? 'Coaches y entrenadores' : 'Recepción'}</p><h2 class="title">Registro de ${coach ? 'coach' : 'recepcionista'}</h2>
    <p class="lead">Datos en <strong>MAYÚSCULAS</strong>. Tu cuenta se activa después de verificar tu correo y de que administración la apruebe.</p>
    ${n ? `<div class="alert alert-bad" role="alert" style="margin-bottom:22px">${icon('alert', 18)}<span>Revisa ${n} campo(s) marcados abajo.</span></div>` : ''}
    <form class="form" data-form="registroStaff" novalidate>
      ${coach ? bloqueIdentidad(v, E, '01 · Identidad', 'coach', rfc('col-6')) : `
      <fieldset class="fieldset"><legend>01 · Identidad</legend><div class="form-grid">
        <div class="field col-4${inv('nombre')}"><label for="nombre">Nombre(s) <span class="req">*</span></label><input class="input upper" id="nombre" name="nombre" value="${val('nombre')}" maxlength="60">${errP(E, 'nombre')}</div>
        <div class="field col-4${inv('apellido_paterno')}"><label for="ap">Apellido paterno <span class="req">*</span></label><input class="input upper" id="ap" name="apellido_paterno" value="${val('apellido_paterno')}" maxlength="60">${errP(E, 'apellido_paterno')}</div>
        <div class="field col-4${inv('apellido_materno')}"><label for="am">Apellido materno <span class="req">*</span></label><input class="input upper" id="am" name="apellido_materno" value="${val('apellido_materno')}" maxlength="60">${errP(E, 'apellido_materno')}</div>
        ${rfc('col-6')}
      </div></fieldset>`}
      <fieldset class="fieldset"><legend>02 · Contacto</legend><div class="form-grid">
        <div class="field col-${coach ? 4 : 6}${inv('email')}"><label for="email">Correo <span class="req">*</span></label><input class="input" type="email" id="email" name="email" value="${val('email')}" autocomplete="email">${errP(E, 'email')}</div>
        <div class="field col-${coach ? 4 : 6}${inv('telefono')}"><label for="tel">Número de contacto <span class="req">*</span></label><input class="input mono" id="tel" name="telefono" value="${val('telefono')}" inputmode="tel" data-digits="10" placeholder="10 dígitos">${errP(E, 'telefono')}</div>
        ${coach ? `<div class="field col-4${inv('telefono_emergencia')}"><label for="tem">Número de emergencia <span class="req">*</span></label><input class="input mono" id="tem" name="telefono_emergencia" value="${val('telefono_emergencia')}" inputmode="tel" data-digits="10" placeholder="10 dígitos">${errP(E, 'telefono_emergencia')}</div>` : ''}
      </div></fieldset>
      ${coach ? bloqueSalud(v, E, docs, 'Adjunta un documento en el que un médico avale que puedes ejercer y laborar como coach.') : ''}
      <fieldset class="fieldset"><legend>${coach ? '04' : '03'} · Documentos y firma</legend><div class="form-grid">
        <div class="col-12">${uploadField('id_oficial', 'Foto de identificación oficial', 'INE, pasaporte o cédula · JPG, PNG o PDF', docs.id_oficial)}${errP(E, 'id_oficial')}</div>
        <div class="col-12">${firmaField('Firma electrónica', docs.firma)}${errP(E, 'firma')}</div>
      </div></fieldset>
      <fieldset class="fieldset"><legend>${coach ? '05' : '04'} · Contraseña</legend><div class="form-grid">
        <div class="col-6">${pwField('pw')}${errP(E, 'password')}</div>
        <div class="field col-6"><label for="pw2">Confirmar contraseña <span class="req">*</span></label><div class="input-wrap">${icon('lock', 18)}<input class="input" type="password" id="pw2" name="password2" autocomplete="new-password" data-match="pw"></div><p class="hint"></p>${errP(E, 'password2')}</div>
      </div></fieldset>
      <div class="actions"><span class="hint">Recibirás un código de verificación en tu correo.</span><button class="btn btn-primary" type="submit">Enviar registro ${icon('arrow', 18)}</button></div>
    </form></div></div></div>`;
});

FORMS.registroStaff = async (d, form) => {
  const coach = PUESTO === 'coach', E = {}, previos = staffReg.docs || {};
  const necesitaCert = coach && d.enfermedad_cronica && d.enfermedad_cronica !== 'NINGUNA';
  const req = { id_oficial: 'Identificación oficial' }; if (necesitaCert) req.cert_medico = 'Constancia médica';
  let r;
  await conBoton(form, 'Procesando…', async () => {
    const nuevos = await leerDocumentos(form, req, E);
    const docs = { ...previos, ...nuevos }; if (!necesitaCert) delete docs.cert_medico;
    staffReg.docs = docs;                                         // se conservan para no pedirlos de nuevo si hay que corregir algo
    if (Object.keys(E).length) return;
    delete d.firma_data; delete d.edad;
    try { r = await POST('personal/registro', { ...d, puesto: PUESTO, rfc: (d.rfc || '').trim().toUpperCase(), docs }); }
    catch (e) { if (e.campos) Object.assign(E, e.campos); else throw e; }
  });
  if (!r) { staffReg = { E, v: { ...d, rfc: (d.rfc || '').toUpperCase() }, docs: staffReg.docs }; return render(); }
  flash('ok', `Registro recibido. Tu número de empleado es ${r.numero_empleado}. Verifica tu correo.`);
  irAVerificar(r.verif_token, { tipo: 'staff' });
};
