'use strict';
/* Portal · pantalla de bienvenida e inicio de sesión del socio.  API: POST auth/login · GET publico/resumen */
let loginState = { error: null, id: '' };

page(async () => {
  if (hayToken('socio')) return ir('inicio.html');
  const nuevo = Ses.get('nuevo'); Ses.del('nuevo');
  const st = loginState; loginState = { error: null, id: '' };
  let r = { socios_activos: '—', maquinas_libres: '—', dentro_ahora: '—' };
  try { r = await GET('publico/resumen'); } catch (_) { /* la bienvenida funciona aunque falle el resumen */ }
  return `
<div class="welcome">
  <section class="hero">
    <div class="hero-scan" aria-hidden="true"></div><div class="hero-ring" aria-hidden="true"></div>
    <div class="hero-top rise">${logo()}<span class="chip mono"><span class="dot dot-live"></span>ABIERTO · 05:00 — 23:00</span></div>
    <div>
      <p class="kicker rise rise-2">Bienvenid@ a</p>
      <h1 class="hero-title rise rise-2" aria-label="FIT CODE"><span>FIT</span><span class="outline">CODE<span class="lime" aria-hidden="true"></span></span></h1>
      <p class="hero-sub rise rise-3">Tu entrenamiento, tu acceso y tu progreso en un solo código. Entra, escanea y entrena.</p>
      <div class="hero-stats rise rise-4"><div><strong class="mono">${r.socios_activos}</strong><small>Socios activos</small></div><div><strong class="mono">${r.maquinas_libres}</strong><small>Máquinas libres ahora</small></div><div><strong class="mono">${r.dentro_ahora}</strong><small>Entrenando ahora</small></div></div>
    </div>
    <p class="dim mono" style="font-size:11px;letter-spacing:.1em;margin:40px 0 0">FIT CODE © ${new Date().getFullYear()} · ACCESO DIGITAL</p>
  </section>
  <section class="auth-side"><div class="panel rise rise-3">
    <p class="kicker">Socios</p><h2 class="title">Inicia sesión</h2><p class="lead">Usa tu usuario, correo o número de teléfono.</p>
    ${nuevo ? `<div class="user-reveal corners"><span class="label">Correo verificado · tu usuario es</span><span class="mono">${esc(nuevo)}</span></div>` : ''}
    ${st.error ? `<div class="alert alert-bad" role="alert" style="margin-bottom:18px">${icon('alert', 18)}<span>${esc(st.error)}</span></div>` : ''}
    <form class="form" data-form="login" novalidate>
      <div class="field"><label for="identificador">Usuario, correo o número</label>
        <div class="input-wrap">${icon('user', 18)}<input class="input" id="identificador" name="identificador" value="${esc(st.id || nuevo || '')}" autocomplete="username" placeholder="ANAPP-150398 · ana@correo.mx · 5512345678" ${nuevo ? '' : 'autofocus'}></div></div>
      <div class="field"><label for="password">Contraseña</label>
        <div class="input-wrap">${icon('lock', 18)}<input class="input" type="password" id="password" name="password" autocomplete="current-password" placeholder="••••••••" ${nuevo ? 'autofocus' : ''}><button type="button" class="peek" aria-label="Mostrar contraseña">${icon('eye', 18)}</button></div></div>
      <button class="btn btn-primary btn-block" type="submit">Entrar ${icon('arrow', 18, 'ico-arrow')}</button>
    </form>
    <div class="divider" style="margin:26px 0 18px">¿Primera vez?</div>
    <a href="registro-codigo.html" class="btn btn-ghost btn-block">${icon('key', 18)} Registrarme con mi código de recepción</a>
    <p class="hint" style="text-align:center;margin-top:14px">El código de 6 dígitos se entrega únicamente en la recepción del gimnasio.</p>
    <p class="hint" style="text-align:center;margin-top:30px"><a class="link" href="../app/">Acceso para personal (recepción, coaches y administración)</a></p>
    <details class="demo-box"><summary>Cuentas de demostración</summary>
      <p>Si importaste <span class="mono">config/datos_demo.sql</span>:<br>Socia activa: <span class="mono">ANAPP-150398</span> · <span class="mono">Socio#2026</span><br>Por vencer: <span class="mono">LUISRM-020901</span> · Vencida (menor): <span class="mono">SOFIAHL-110510</span> (misma contraseña)</p></details>
  </div></section>
</div>`;
});

FORMS.login = async (d, form) => {
  const id = (d.identificador || '').trim(), pw = d.password || ''; loginState.id = id;
  if (!id || !pw) { loginState.error = 'Escribe tu usuario, correo o número y tu contraseña.'; return render(); }
  try {
    const r = await conBoton(form, 'Entrando…', () => POST('auth/login', { identificador: id, password: pw }));
    Ses.set(TOKEN.socio, r.token); Ses.set('socio', r.socio); Ses.del(TOKEN.registro);
    flash('ok', `Bienvenid@, ${r.socio.nombre}. Tu código de acceso está listo.`);
    location.href = 'inicio.html';
  } catch (e) {
    if (e.data && e.data.sin_verificar) { flash('error', 'Antes de entrar, verifica tu correo.'); return irAVerificar(e.data.verif_token, { tipo: 'socio', usuario: e.data.usuario }); }
    loginState.error = e.message; render();
  }
};
