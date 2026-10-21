// Cliente base de la API: agrega el token JWT y normaliza los errores.
const RAIZ = location.pathname.split('/').slice(0, -2).join('/');
const API_BASE = RAIZ + '/api/v1';

async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.token();
  if (token) headers.Authorization = 'Bearer ' + token;

  let resp;
  try {
    resp = await fetch(`${API_BASE}/${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No hay conexión con el servidor.');
  }
  const json = await resp.json().catch(() => null);
  if (!json) throw new Error('El servidor no respondió correctamente.');
  if (resp.status === 401 && !ruta.startsWith('auth/')) { Auth.cerrar(); throw new Error(json.error); }
  if (!json.ok) throw new Error(json.error || 'Ocurrió un error.');
  return json.data;
}

// Utilidades de interfaz
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dinero = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function fecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split(/[ T]/)[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
const hora = (f) => (f && f.split(' ')[1] ? f.split(' ')[1].slice(0, 5) : '');

const ETIQUETAS = { activa: 'Activa', por_vencer: 'Por vencer', vencida: 'Vencida',
                    congelada: 'Congelada', sin_membresia: 'Sin membresía' };
const insignia = (estado) => `<span class="insignia ${estado}">${ETIQUETAS[estado] || estado}</span>`;

/** Estado aproximado a partir de la fecha de vigencia (la API calcula el oficial). */
function estadoPorFecha(vigenteHasta) {
  if (!vigenteHasta) return 'sin_membresia';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = vigenteHasta.split('-').map(Number);
  const dias = Math.round((new Date(y, m - 1, d) - hoy) / 86400000);
  return dias < 0 ? 'vencida' : dias <= 7 ? 'por_vencer' : 'activa';
}

let temporizadorAviso;
function avisar(texto, tipo = '') {
  let el = $('.aviso-toast');
  if (!el) { el = document.createElement('div'); el.className = 'aviso-toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.className = 'aviso-toast ' + tipo;
  el.textContent = texto;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.remove(), 4000);
}
