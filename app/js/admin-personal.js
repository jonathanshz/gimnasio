'use strict';
/* Administración · personal: aprobar/desactivar cuentas, revisar documentos y (solo el DUEÑO) dar de alta cuentas nuevas.
   API: GET personal · PUT personal/{id}/estado · GET personal/{id}/documentos/{doc} · POST personal (DUEÑO) */
let nuevaCuentaErr = { E: {}, v: {} };

page(async () => {
  const st = await sesionStaff(['ADMIN', 'DUENO']);
  const lista = await GET('personal', 'staff'), dueno = st.rol === 'DUENO';
  const { E, v } = nuevaCuentaErr; nuevaCuentaErr = { E: {}, v: {} };
  after(root => $$('[data-edoc]', root).forEach(a => a.onclick = e => { e.preventDefault(); verDocumento(`personal/${a.dataset.emp}/documentos/${a.dataset.edoc}`, 'staff'); }));
  const puedeCambiar = x => x.id !== st.id && x.rol !== 'DUENO' && (x.rol !== 'ADMIN' || dueno);
  const val = k => esc(v[k] || ''), inv = k => E[k] ? ' invalid' : '';
  return adminShell('personal', st, `<section class="card rise"><div class="table-wrap"><table class="t"><thead><tr><th>Empleado</th><th>RFC</th><th>Rol</th><th>Correo</th><th>Documentos</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lista.map(x => `<tr><td><strong style="font-weight:500">${esc(x.nombre)}</strong><br><span class="hint mono">${esc(x.numero_empleado)}</span></td><td class="mono">${esc(x.rfc)}</td><td>${ROL_NOMBRE[x.rol]}</td>
        <td>${esc(x.email)}<br>${x.verificado ? badge('activo', 'verificado') : badge('pendiente', 'sin verificar')}</td>
        <td>${x.documentos.length ? x.documentos.map(d => `<a href="#" class="link" data-emp="${x.id}" data-edoc="${d.id}">${DOC_NOMBRE[d.tipo] || esc(d.tipo)}</a>`).join('<br>') : '<span class="hint">—</span>'}</td>
        <td>${badge(x.estado)}</td>
        <td>${puedeCambiar(x) ? (x.estado === 'activo' ? `<button class="btn btn-sm btn-ghost btn-danger" data-action="estadoStaff" data-id="${x.id}" data-estado="INACTIVO">Desactivar</button>` : `<button class="btn btn-sm btn-primary" data-action="estadoStaff" data-id="${x.id}" data-estado="ACTIVO"${x.verificado ? '' : ' disabled title="Debe verificar su correo primero"'}>Aprobar</button>`) : ''}</td></tr>`).join('')}
    </tbody></table></div><p class="hint">Solo se puede aprobar a quien ya verificó su correo. Revisa la identificación y la firma antes de aprobar.${dueno ? '' : ' Las cuentas de administración solo las gestiona el dueño.'}</p></section>
  ${dueno ? `<section class="card corners rise rise-2" style="margin-top:18px"><p class="card-kicker">Solo dirección</p><h3 class="card-title" style="margin-bottom:6px">Dar de alta una cuenta</h3>
    <p class="hint" style="margin-top:0">Crea cuentas de administración, recepción o coach ya verificadas y activas (sin el trámite de autorregistro). Quien la recibe puede cambiarla después con administración.</p>
    <form class="form" data-form="nuevaCuenta" novalidate><div class="form-grid">
      <div class="field col-4${inv('nombre')}"><label for="n-nombre">Nombre(s) <span class="req">*</span></label><input class="input upper" id="n-nombre" name="nombre" value="${val('nombre')}" maxlength="60">${errP(E, 'nombre')}</div>
      <div class="field col-4${inv('apellido_paterno')}"><label for="n-ap">Apellido paterno <span class="req">*</span></label><input class="input upper" id="n-ap" name="apellido_paterno" value="${val('apellido_paterno')}" maxlength="60">${errP(E, 'apellido_paterno')}</div>
      <div class="field col-4${inv('apellido_materno')}"><label for="n-am">Apellido materno <span class="req">*</span></label><input class="input upper" id="n-am" name="apellido_materno" value="${val('apellido_materno')}" maxlength="60">${errP(E, 'apellido_materno')}</div>
      <div class="field col-3"><label for="n-rol">Rol <span class="req">*</span></label><select class="input" id="n-rol" name="rol"><option value="ADMIN">Administración</option><option value="RECEPCION">Recepción</option><option value="COACH">Coach</option></select></div>
      <div class="field col-3${inv('rfc')}"><label for="n-rfc">RFC <span class="req">*</span></label><input class="input mono" id="n-rfc" name="rfc" value="${val('rfc')}" maxlength="10" style="text-transform:uppercase" placeholder="ABCD000000">${errP(E, 'rfc')}</div>
      <div class="field col-3${inv('email')}"><label for="n-mail">Correo <span class="req">*</span></label><input class="input" type="email" id="n-mail" name="email" value="${val('email')}" autocomplete="off">${errP(E, 'email')}</div>
      <div class="field col-3${inv('telefono')}"><label for="n-tel">Teléfono</label><input class="input mono" id="n-tel" name="telefono" value="${val('telefono')}" inputmode="tel" data-digits="10">${errP(E, 'telefono')}</div>
      <div class="col-12">${pwField('n-pw', 'Contraseña inicial')}${errP(E, 'password')}</div>
    </div>
    <button class="btn btn-primary" type="submit">${icon('check', 18)} Crear cuenta</button></form></section>` : ''}`);
});

ACTIONS.estadoStaff = async a => {
  await PUT(`personal/${a.dataset.id}/estado`, { estado: a.dataset.estado }, 'staff');
  flash('ok', a.dataset.estado === 'ACTIVO' ? 'Cuenta aprobada: ya puede iniciar sesión.' : 'Cuenta desactivada.'); render();
};
FORMS.nuevaCuenta = async (d, form) => {
  try {
    const r = await conBoton(form, 'Creando…', () => POST('personal', { ...d, rfc: (d.rfc || '').trim().toUpperCase() }, 'staff'));
    flash('ok', `Cuenta creada. Número de empleado: ${r.numero_empleado}.`); render();
  } catch (e) {
    if (e.campos) { nuevaCuentaErr = { E: e.campos, v: { ...d, password: '' } }; return render(); }
    throw e;
  }
};
