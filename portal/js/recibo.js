"use strict";
/* Portal · recibo de un pago (se imprime o guarda como PDF).  API: GET portal/recibo/{folio} */
page(async () => {
  const folio = query().folio || "";
  const s = await sesionSocio();
  let r;
  try {
    r = await GET("portal/recibo/" + encodeURIComponent(folio), "socio");
  } catch (e) {
    if (e.status === 404) {
      flash("error", "No encontramos ese recibo.");
      return ir("pagos.html");
    }
    throw e;
  }
  return portalShell("Recibo de pago", "pagos", s, reciboHTML(r, "pagos.html"));
});
