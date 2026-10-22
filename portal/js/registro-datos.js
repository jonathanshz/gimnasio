'use strict';
/* Portal · registro, paso 3 de 5: datos del socio, documentos y firma.
   API: GET registro/estado (recupera lo ya capturado) · POST registro/documento (un archivo por petición) · POST registro/datos
   Las validaciones las hace el servidor; aquí solo se muestran los errores por campo. */
let datosErr = {};

page(async () => {
  if (!hayToken('registro')) { flash('error', 'Ingresa tu código de recepción para comenzar el registro.'); return ir('registro-codigo.html'); }
  const est = await GET('registro/estado', 'registro');
  if (!est.tipo) return ir('registro-tipo.html');
  const menor = est.tipo === 'menor', v = est.datos || {}, docs = est.docs || {}, E = datosErr; datosErr = {};
  const val = k => esc(v[k] || ''), inv = k => E[k] ? ' invalid' : '', n = Object.keys(E).length;
  return `<div class="reg-page">${regHead(3)}<div class="reg-body"><div class="panel panel-wide rise">
    <p class="kicker">Paso 3 de 5 · ${menor ? 'Menor de edad' : 'Mayor de edad'}</p><h2 class="title">Datos del socio</h2>
    <p class="lead">Escribe todo en <strong>MAYÚSCULAS</strong> (el formulario lo convierte automáticamente). Los campos con <span class="accent">*</span> son obligatorios.</p>
    ${n ? `<div class="alert alert-bad" role="alert" style="margin-bottom:22px">${icon('alert', 18)}<span>Revisa ${n} campo(s) marcados abajo.</span></div>` : ''}
    <form class="form" data-form="datos" novalidate>
      ${bloqueIdentidad(v, E, menor ? '01 · Identidad del menor' : '01 · Identidad', est.tipo)}
      <fieldset class="fieldset"><legend>02 · Contacto</legend><div class="form-grid">
        <div class="field col-6${inv('tel_contacto')}"><label for="tc">Número de contacto <span class="req">*</span></label><input class="input mono" id="tc" name="tel_contacto" value="${val('tel_contacto')}" inputmode="tel" data-digits="10" placeholder="10 dígitos">${errP(E, 'tel_contacto')}</div>
        <div class="field col-6${inv('tel_emergencia')}"><label for="te">Número de emergencia <span class="req">*</span></label><input class="input mono" id="te" name="tel_emergencia" value="${val('tel_emergencia')}" inputmode="tel" data-digits="10" placeholder="10 dígitos">${errP(E, 'tel_emergencia')}</div>
        ${menor ? `<div class="field col-12${inv('tutor_nombre')}"><label for="tutor">Nombre completo del padre, madre o tutor <span class="req">*</span></label><input class="input upper" id="tutor" name="tutor_nombre" value="${val('tutor_nombre')}" maxlength="120">${errP(E, 'tutor_nombre')}</div>` : ''}
      </div></fieldset>
      ${bloqueSalud(v, E, docs, 'Al indicar una enfermedad crónica, adjunta un documento en el que un médico avale que puedes realizar actividad física.')}
      <fieldset class="fieldset"><legend>04 · Documentos y firma</legend><div class="form-grid">
        <div class="col-${menor ? 6 : 12}">${uploadField('id_oficial', menor ? 'Identificación oficial del menor' : 'Foto de identificación oficial', menor ? 'Credencial escolar, pasaporte o CURP con foto' : 'INE, pasaporte o licencia · JPG, PNG o PDF', docs.id_oficial)}${errP(E, 'id_oficial')}</div>
        ${menor ? `<div class="col-6">${uploadField('id_tutor', 'Identificación oficial del padre/tutor', 'INE o pasaporte · JPG, PNG o PDF', docs.id_tutor)}${errP(E, 'id_tutor')}</div>` : ''}
        <div class="col-12">${firmaField(menor ? 'Firma electrónica del padre/tutor' : 'Firma electrónica', docs.firma)}${errP(E, 'firma')}
          <p class="hint">${menor ? 'Al firmar como padre/tutor autorizas la inscripción del menor, confirmas que la información es verídica y aceptas' : 'Al firmar confirmas que la información es verídica y aceptas'} el reglamento interno de FIT CODE.</p></div>
      </div></fieldset>
      <div class="actions"><a href="registro-tipo.html" class="btn btn-ghost">${icon('back', 18)} Cambiar tipo</a><button class="btn btn-primary" type="submit">Continuar ${icon('arrow', 18)}</button></div>
    </form></div></div></div>`;
});

const ETIQUETA_DOC = { id_oficial: 'Identificación', id_tutor: 'Identificación del padre/tutor', cert_medico: 'Constancia médica', firma: 'Firma' };

/** Sube un documento (tras comprimirlo en el navegador) a registro/documento. Devuelve un mensaje de error o null. */
async function subirDoc(campo, archivo) {
  try { await POST('registro/documento', { campo, archivo }, 'registro'); return null; }
  catch (e) { if (e.redirigido) throw e; return `${ETIQUETA_DOC[campo]}: ${e.message}`; }
}

FORMS.datos = async (d, form) => {
  const E = {};
  await conBoton(form, 'Procesando…', async () => {
    const necesitaCert = d.enfermedad_cronica && d.enfermedad_cronica !== 'NINGUNA';
    // 1) archivos: cada uno en su propia petición para no exceder el límite de tamaño del servidor
    for (const campo of ['id_oficial', 'id_tutor', 'cert_medico']) {
      const f = form.querySelector(`input[name=${campo}]`)?.files[0];
      if (!f || (campo === 'cert_medico' && !necesitaCert)) continue;
      let a; try { a = await prepararArchivo(f); } catch (e) { E[campo] = `${ETIQUETA_DOC[campo]}: ${e.message}.`; continue; }
      const err = await subirDoc(campo, a); if (err) E[campo] = err + (err.endsWith('.') ? '' : '.');
    }
    const dibujo = form.querySelector('input[name=firma_data]')?.value;
    const fFirma = form.querySelector('input[name=firma_file]')?.files[0];
    if (dibujo) { const err = await subirDoc('firma', { nombre: 'firma.png', mime: 'image/png', data: dibujo }); if (err) E.firma = err; }
    else if (fFirma) {
      try { const err = await subirDoc('firma', await prepararArchivo(fFirma)); if (err) E.firma = err; } catch (e) { E.firma = 'Firma: ' + e.message + '.'; }
    }
    // 2) datos: el servidor valida todo y comprueba que los documentos requeridos ya estén cargados
    delete d.firma_data; delete d.edad;
    try { await POST('registro/datos', d, 'registro'); }
    catch (e) { if (e.campos) Object.assign(E, e.campos, E); else throw e; }
  });
  if (Object.keys(E).length) { datosErr = E; return render(); }
  location.href = 'registro-cuenta.html';
};
