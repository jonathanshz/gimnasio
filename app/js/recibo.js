'use strict';
/* Panel de recepción · recibo de un pago.  API: GET pagos/recibo/{folio} */
page(async () => {
  const st = await sesionStaff(['RECEPCION', 'ADMIN', 'DUENO']), folio = query().folio || '';
  let r;
  try { r = await GET('pagos/recibo/' + encodeURIComponent(folio), 'staff'); }
  catch (e) { if (e.status === 404) { flash('error', 'No encontramos ese recibo.'); return ir('dashboard.html'); } throw e; }
  return staffShell('Recibo de pago', 'cobros', st, reciboHTML(r, 'cobros.html'));
});
