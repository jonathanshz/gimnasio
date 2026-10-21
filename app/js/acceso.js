// El lector de código de barras USB funciona como un teclado: "escribe" el código y envía Enter.
Auth.proteger(); pintarMenu('control-acceso.html');
if (!ROLES_CAJA.includes(Auth.usuario().rol)) location.href = 'dashboard.html';

const campo = $('#codigo'), puerta = $('#puerta');
let reposo;

function pitido(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), vol = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220; vol.gain.value = 0.08;
    osc.connect(vol); vol.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
  } catch { /* sin audio: no pasa nada */ }
}

function mostrar(clase, titulo, detalle) {
  puerta.className = 'puerta ' + clase;
  puerta.innerHTML = `<div><div class="nombre-grande">${esc(titulo)}</div><p>${esc(detalle)}</p></div>`;
  clearTimeout(reposo);
  reposo = setTimeout(() => {
    puerta.className = 'puerta';
    puerta.innerHTML = '<div><div class="nombre-grande">Listo para escanear</div><p class="muted">El resultado aparece aquí.</p></div>';
  }, 7000);
}

async function leer(codigo) {
  try {
    const r = await api('asistencias/lectura', { method: 'POST', body: { codigo } });
    if (!r.acceso) {
      mostrar('no', r.socio ? r.socio.nombre : 'Acceso denegado', r.motivo); pitido(false);
    } else if (r.aviso) {
      mostrar('aviso', r.socio.nombre, r.aviso); pitido(true);
    } else {
      mostrar('ok', r.socio.nombre, r.duplicado ? 'Ya registramos su entrada hace un momento.' : 'Bienvenido. Pasa.'); pitido(true);
    }
    cargarLista();
  } catch (e) { mostrar('no', 'No se pudo registrar', e.message); pitido(false); }
}

campo.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const codigo = campo.value.trim(); campo.value = '';
  if (codigo) leer(codigo);
});

async function cargarLista() {
  try {
    const filas = await api('asistencias');
    $('#lista').innerHTML = filas.length ? filas.slice(0, 30).map(a => `
      <tr><td>${hora(a.creado_en)}</td><td>${esc(a.socio || a.codigo_leido)}</td>
      <td><span class="insignia ${a.resultado}">${a.resultado === 'permitido' ? 'Permitido' : 'Denegado'}</span></td>
      <td>${esc(a.motivo || '')}</td></tr>`).join('')
      : '<tr><td colspan="4" class="vacio">Aún no hay entradas hoy.</td></tr>';
  } catch (e) { avisar(e.message, 'error'); }
}

// Mantiene el cursor en el campo para que el lector siempre escriba ahí.
setInterval(() => { if (document.activeElement === document.body) campo.focus(); }, 1000);
campo.focus(); cargarLista();
