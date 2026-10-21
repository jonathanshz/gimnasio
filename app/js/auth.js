// Sesión del personal: guarda el JWT en localStorage y arma el menú lateral.
const ROLES_CAJA = ['dueno', 'administrador', 'recepcionista'];
const ROLES_GESTION = ['dueno', 'administrador'];

const Auth = {
  CLAVE: 'gym_token',
  USUARIO: 'gym_usuario',
  token() { return localStorage.getItem(this.CLAVE); },
  usuario() { try { return JSON.parse(localStorage.getItem(this.USUARIO)); } catch { return null; } },
  guardar(token, usuario) {
    localStorage.setItem(this.CLAVE, token);
    localStorage.setItem(this.USUARIO, JSON.stringify(usuario));
  },
  cerrar() {
    localStorage.removeItem(this.CLAVE);
    localStorage.removeItem(this.USUARIO);
    location.href = 'index.html';
  },
  proteger() { if (!this.token() || !this.usuario()) this.cerrar(); },
  async iniciarSesion(email, password) {
    const datos = await api('auth/login', { method: 'POST', body: { email, password } });
    this.guardar(datos.token, datos.usuario);
    location.href = 'dashboard.html';
  },
};

function pintarMenu(activa) {
  const u = Auth.usuario();
  const enlaces = [
    ['dashboard.html', 'Resumen', null],
    ['socios.html', 'Socios', null],
    ['punto-venta.html', 'Cobrar', ROLES_CAJA],
    ['control-acceso.html', 'Control de acceso', ROLES_CAJA],
  ].filter(([, , roles]) => !roles || roles.includes(u.rol));

  document.getElementById('menu').innerHTML =
    `<div class="marca"><span class="disco"></span>GymControl</div>` +
    enlaces.map(([href, texto]) =>
      `<a href="${href}" class="${href === activa ? 'activa' : ''}">${texto}</a>`).join('') +
    `<div class="quien">${esc(u.nombre)}<br><span>${esc(u.rol)}</span><br>
       <button class="btn chico" id="salir">Cerrar sesión</button></div>`;
  document.getElementById('salir').onclick = () => Auth.cerrar();
}
