"use strict";
/* Portal · credencial en pantalla completa (para el lector de recepción).  Usa el socio de la sesión. */
page(async () => {
  const s = await sesionSocio();
  return `<div class="fullcode"><div class="full">${barcodeSVG(s.codigo_credencial, 160, 3)}<p class="code">${esc(s.codigo_credencial)}</p><p class="name">${esc(s.nombre_completo)}</p><a class="back" href="inicio.html">${icon("back", 16)} Volver</a></div></div>`;
});
