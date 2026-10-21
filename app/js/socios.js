Auth.proteger(); pintarMenu('socios.html');

const rol = Auth.usuario().rol;
const puedeEditar = ROLES_CAJA.includes(rol);
const puedeBaja = ROLES_GESTION.includes(rol);
const dlg = $('#dlg'), form = $('#form');
let editandoId = null, temporizador;

if (!puedeEditar) $('#nuevo').classList.add('oculto');

async function cargar() {
  try {
    const socios = await api('socios?buscar=' + encodeURIComponent($('#buscar').value.trim()));
    $('#tabla').innerHTML = socios.length ? socios.map(s => `
      <tr>
        <td>${esc(s.codigo_credencial)}</td>
        <td>${esc(s.nombre)} ${esc(s.apellidos)}</td>
        <td>${esc(s.telefono || '')}<br><span class="muted">${esc(s.email)}</span></td>
        <td>${insignia(estadoPorFecha(s.vigente_hasta))}</td>
        <td>${fecha(s.vigente_hasta)}</td>
        <td class="acciones">
          ${puedeEditar ? `<a class="btn chico" href="punto-venta.html?socio=${s.id}" style="text-decoration:none">Cobrar</a>
            <button class="btn chico" data-editar="${s.id}">Editar</button>` : ''}
          ${puedeBaja ? `<button class="btn chico peligro" data-baja="${s.id}">Dar de baja</button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="vacio">No hay socios con esa búsqueda. Registra el primero con “Nuevo socio”.</td></tr>';
  } catch (e) { avisar(e.message, 'error'); }
}

function abrirFormulario(socio) {
  editandoId = socio ? socio.id : null;
  form.reset(); $('#error').textContent = '';
  $('#dlg-titulo').textContent = socio ? 'Editar socio' : 'Nuevo socio';
  if (socio) for (const [k, v] of Object.entries(socio)) { if (form.elements[k]) form.elements[k].value = v ?? ''; }
  form.classList.remove('oculto'); $('#listo').classList.add('oculto');
  dlg.showModal();
}

$('#nuevo').onclick = () => abrirFormulario(null);
$('#cancelar').onclick = () => dlg.close();
$('#cerrar-listo').onclick = () => dlg.close();
$('#buscar').addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(cargar, 250); });

$('#tabla').addEventListener('click', async (e) => {
  const editar = e.target.closest('[data-editar]'), baja = e.target.closest('[data-baja]');
  try {
    if (editar) abrirFormulario(await api('socios/' + editar.dataset.editar));
    if (baja && confirm('¿Dar de baja a este socio? Su historial se conserva.')) {
      await api('socios/' + baja.dataset.baja, { method: 'DELETE' });
      avisar('Socio dado de baja.'); cargar();
    }
  } catch (err) { avisar(err.message, 'error'); }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#guardar'); btn.disabled = true; $('#error').textContent = '';
  const datos = Object.fromEntries(new FormData(form));
  try {
    const socio = await api(editandoId ? 'socios/' + editandoId : 'socios', { method: editandoId ? 'PUT' : 'POST', body: datos });
    if (editandoId) { dlg.close(); avisar('Cambios guardados.'); }
    else {
      form.classList.add('oculto'); $('#listo').classList.remove('oculto');
      $('#l-codigo').textContent = socio.codigo_credencial; $('#l-pass').textContent = socio.password_temporal;
      $('#l-cobrar').href = 'punto-venta.html?socio=' + socio.id;
      $('#l-cobrar').classList.toggle('oculto', !puedeEditar);
    }
    cargar();
  } catch (err) { $('#error').textContent = err.message; }
  btn.disabled = false;
});

cargar();
