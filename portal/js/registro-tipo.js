"use strict";
/* Portal · registro, paso 2 de 5: mayor o menor de edad.  API: GET registro/estado · POST registro/tipo */
page(async () => {
  if (!hayToken("registro")) {
    flash("error", "Ingresa tu código de recepción para comenzar el registro.");
    return ir("registro-codigo.html");
  }
  await GET("registro/estado", "registro"); // valida que el código siga vigente
  return `<div class="reg-page">${regHead(2)}<div class="reg-body"><div class="panel panel-wide rise">
    <p class="kicker">Paso 2 de 5</p><h2 class="title">¿Quién se va a registrar?</h2>
    <p class="lead">Los socios menores de edad necesitan la identificación y la firma de su padre, madre o tutor.</p>
    <form class="choice-grid" data-form="tipo">
      <button class="choice" name="tipo" value="mayor" type="submit"><span class="big">18<small>+ años</small></span><h3>Mayor de edad</h3><p>Registro con tus datos, identificación oficial y tu firma electrónica.</p><span class="go">Continuar ${icon("arrow", 16)}</span></button>
      <button class="choice" name="tipo" value="menor" type="submit"><span class="big">−18<small>años</small></span><h3>Menor de edad</h3><p>Identificación del menor y del padre/tutor, más la firma electrónica del padre/tutor.</p><span class="go">Continuar ${icon("arrow", 16)}</span></button>
    </form></div></div></div>`;
});

FORMS.tipo = async (d) => {
  if (!["mayor", "menor"].includes(d.tipo)) return;
  await POST("registro/tipo", { tipo: d.tipo }, "registro");
  location.href = "registro-datos.html";
};
