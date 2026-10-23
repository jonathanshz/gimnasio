"use strict";
/* Verificación del correo (socios y personal). Lo cargan portal/verificar.html y app/verificar.html.
   API (token de tipo "verif"): GET auth/verificacion · POST auth/verificar · POST auth/reenviar */
let verifErr = null;

page(async () => {
  const v = Ses.get("verif") || {};
  if (!hayToken("verif")) {
    flash("error", "Inicia sesión para verificar tu correo.");
    return ir("index.html");
  }
  let info;
  try {
    info = await GET("auth/verificacion", "verif");
  } catch (e) {
    if (e.status === 404) {
      cerrarVerif();
      flash("error", e.message);
      return ir(v.registro ? "registro-codigo.html" : "index.html");
    }
    throw e;
  }
  if (info.verificada) {
    cerrarVerif();
    flash("ok", "Tu correo ya estaba verificado. Inicia sesión.");
    return ir("index.html");
  }
  const err = verifErr;
  verifErr = null;
  const pasos = v.tipo === "socio" && v.registro;
  return `<div class="reg-page">${pasos ? regHead(5) : `<header class="reg-head"><a href="index.html">${logo()}</a><span class="tag mono">VERIFICACIÓN</span></header>`}
  <div class="reg-body"><div class="panel rise">
    <p class="kicker">${pasos ? "Paso 5 de 5" : "Seguridad de la cuenta"}</p><h2 class="title">Verifica tu correo</h2>
    <p class="lead">Enviamos un código de 6 dígitos a <strong>${esc(info.correo)}</strong>. Vence en 15 minutos.${pasos ? " Tu cuenta se creará en cuanto lo confirmes." : ""}</p>
    ${
      info.codigo_demo
        ? `<div class="mailbox"><div class="mailbox-head">${icon("file", 16)} Bandeja simulada <span class="tag mono">MODO DEMO</span></div>
      <p><strong>FIT CODE</strong> &lt;no-responder@fitcode.mx&gt;<br>Tu código de verificación es <span class="mono accent" style="font-size:18px;letter-spacing:.2em">${esc(info.codigo_demo)}</span></p>
      <p class="hint" style="margin:0">Con <span class="mono">MAIL_MODO = 'mail'</span> en config.php este mensaje llega al correo real y nunca se muestra aquí.</p></div>`
        : ""
    }
    <form class="form card corners" data-form="verificar" autocomplete="off">
      <input type="hidden" name="codigo" id="vcod"><span class="label">Código de verificación</span>
      <div class="otp${err ? " shake" : ""}" data-target="vcod">${'<input inputmode="numeric" maxlength="1" aria-label="Dígito">'.repeat(6)}</div>
      ${err ? `<p class="hint err" role="alert" style="margin:0">${esc(err)}</p>` : ""}
      <button class="btn btn-primary btn-block" type="submit" disabled>Verificar correo ${icon("check", 18)}</button>
    </form>
    <p class="hint" style="text-align:center;margin-top:18px">¿No te llegó? <a class="link" href="#" data-action="reenviar">Reenviar código</a></p>
  </div></div></div>`;
});

function cerrarVerif() {
  Ses.del(TOKEN.verif);
  Ses.del("verif");
}

FORMS.verificar = async (d, form) => {
  try {
    const r = await conBoton(form, "Verificando…", () =>
      POST("auth/verificar", { codigo: d.codigo || "" }, "verif"),
    );
    cerrarVerif();
    if (r.tipo === "socio") {
      Ses.set("nuevo", r.usuario);
      flash("ok", "¡Correo verificado! Tu cuenta está lista. Inicia sesión.");
    } else
      flash(
        "ok",
        "Correo verificado. Tu cuenta quedó pendiente de aprobación por administración.",
      );
    location.href = "index.html";
  } catch (e) {
    if (e.redirigido) throw e;
    if (e.status === 409) {
      // el alta ya no se puede completar (correo/teléfono tomados, código usado…)
      const reg = (Ses.get("verif") || {}).registro;
      cerrarVerif();
      flash("error", e.message);
      location.href = reg ? "registro-codigo.html" : "index.html";
      return;
    }
    verifErr = e.message;
    render();
  }
};
ACTIONS.reenviar = async () => {
  await POST("auth/reenviar", {}, "verif");
  flash("ok", "Te enviamos un código nuevo.");
  render();
};
