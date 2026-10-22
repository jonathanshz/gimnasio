'use strict';
/* Panel del coach · lista de socios con objetivo, IMC y rutina.  API: GET socios?q= */
page(async () => {
  const st = await sesionStaff(['COACH']), q = (query().q || '').trim();
  const lista = await GET('socios?q=' + encodeURIComponent(q), 'staff');
  return listaSociosHTML(st, lista, q, 'coach');
});
