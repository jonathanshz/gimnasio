"use strict";
/* Portal · registro, paso 1 de 5: código de recepción.  API: POST registro/codigo → token de registro (45 min) */
let codigoErr = null;
const HORAS_CODIGO = 72; // misma vigencia que HORAS_CODIGO_REGISTRO en config/config.php

page(async () => {
  if (hayToken("socio")) return ir("inicio.html");
  const err = codigoErr;
  codigoErr = null;
  return `<div class="reg-page">${regHead(1)}<div class="reg-body"><div class="panel rise">
    <p class="kicker">Paso 1 de 5</p><h2 class="title">Tu código de recepción</h2>
    <p class="lead">Por seguridad y privacidad del gimnasio, solo puedes registrarte con el código único de 6 dígitos que te entregan en recepción.</p>
    <form class="form card corners" data-form="codigo" autocomplete="off"><input type="hidden" name="codigo" id="codigo"><span class="label">Código único</span>
      <div class="otp${err ? " shake" : ""}" data-target="codigo">${'<input inputmode="numeric" maxlength="1" aria-label="Dígito">'.repeat(6)}</div>
      ${err ? `<p class="hint err" role="alert" style="margin:0">${esc(err)}</p>` : ""}
      <button class="btn btn-primary btn-block" type="submit" disabled>Validar código ${icon("arrow", 18)}</button></form>
    <div class="alert" style="margin-top:18px">${icon("shield", 18)}<span class="muted" style="font-size:13.5px">El código es de un solo uso y vence a las ${HORAS_CODIGO} horas de generarse. Si no funciona, pide uno nuevo en recepción.</span></div>
    <p class="hint" style="text-align:center;margin-top:22px">¿Ya tienes cuenta? <a class="link" href="index.html">Inicia sesión</a></p>
  </div></div></div>`;
});
FORMS.codigo = async (d, form) => {
  try {
    const r = await conBoton(form, "Validando…", () =>
      POST("registro/codigo", { codigo: (d.codigo || "").replace(/\s/g, "") }),
    );
    Ses.set(TOKEN.registro, r.registro_token);
    flash("ok", "Código validado. Continuemos con tu registro.");
    location.href = "registro-tipo.html";
  } catch (e) {
    if (e.redirigido) throw e;
    codigoErr = e.message;
    render();
  }
};
