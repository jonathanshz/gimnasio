'use strict';
/* Panel de recepción · búsqueda de socios.  API: GET socios?q= */
page(async () => {
  const st = await sesionStaff(['RECEPCION', 'ADMIN', 'DUENO']), q = (query().q || '').trim();
  const lista = await GET('socios?q=' + encodeURIComponent(q), 'staff');
  return listaSociosHTML(st, lista, q, 'socios');
});
