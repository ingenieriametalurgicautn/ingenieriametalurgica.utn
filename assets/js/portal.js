/* Mi ingreso · portal del aspirante · Ingeniería Metalúrgica UTN FRC */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const on = v => /^(✓|si|sí|x|ok|true|1)$/i.test(String(v == null ? '' : v).trim());
  const fmt = v => { const s = String(v || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const hora = v => String(v || '').slice(11, 16);

  const KEY = 'im_portal';
  const ses = {
    get() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } },
    set(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} }
  };
  let SES = ses.get(), D = null, vista = 'camino';


  function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 3000); }
  const err = (m, el) => { (el || $('#lErr')).textContent = m || ''; };

  async function call(params, timeout) {
    const d = await imApi(Object.assign({}, params, { token: SES && SES.token }), timeout);
    if (d && d.auth === false) { salir(d.error); throw new Error(d.error); }
    if (!d || !d.ok) throw new Error((d && d.error) || 'No se pudo completar. Probá de nuevo.');
    if (SES) { SES.exp = Date.now() + (SES.h || 6) * 3600000; ses.set(SES); }
    return d;
  }

  /* ---------- Ingreso con email + DNI (sin código) ---------- */
  async function entrar() {
    const email = $('#dato').value.trim(), dni = $('#dni').value.replace(/\D/g, '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('Escribí el email con el que te preinscribiste.');
    if (dni.length < 6) return err('Escribí tu DNI (solo números).');
    $('#bEnt').disabled = true; err('');
    try {
      const d = await imApi({ action: 'pEntrarDni', dato: email, dni });
      if (!d.ok) throw new Error(d.error);
      SES = { token: d.token, h: d.horas, exp: Date.now() + d.horas * 3600000 }; ses.set(SES);
      try { localStorage.setItem('im_portal_email', email); } catch (e) {}
      mostrar(d);
    } catch (e) { err(e.message); }
    finally { $('#bEnt').disabled = false; }
  }
  $('#bEnt').onclick = entrar;
  $('#dato').onkeydown = e => { if (e.key === 'Enter') $('#dni').focus(); };
  $('#dni').onkeydown = e => { if (e.key === 'Enter') entrar(); };
  try { const em = localStorage.getItem('im_portal_email'); if (em) $('#dato').value = em; } catch (e) {}

  function salir(msg) {
    if (SES) imApi({ action: 'pSalir', token: SES.token }).catch(() => {});
    SES = null; D = null; ses.set(null);
    $('#app').hidden = true; $('#login').hidden = false; $('#dni').value = '';
    err(msg || '');
  }
  $('#bOut').onclick = () => salir('Cerraste la sesión.');

  /* ---------- Vistas ---------- */
  $$('.tab').forEach(t => t.onclick = () => ver(t.dataset.t));
  function ver(v) {
    vista = v;
    $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.t === v));
    ['camino', 'docs', 'msg'].forEach(k => $('#v-' + k).hidden = k !== v);
    if (v === 'msg') { const th = $('#thread'); th.scrollTop = th.scrollHeight; if (D && D._sinLeer) refrescar(); }
    window.scrollTo(0, 0);
  }

  function mostrar(d) {
    D = d;
    $('#login').hidden = true; $('#app').hidden = false;
    $('#hiName').textContent = (d.yo['Nombres'] || '') + ' ' + (d.yo['Apellidos'] || '');
    pintarCamino(); pintarDocs(); pintarMsg();
    if (vista !== 'camino') ver(vista);
  }

  function pasos(y) {
    const cursillo = on(y['Req: Equivalencia']) || (on(y['Req: Matemática']) && on(y['Req: Física']) && on(y['Req: Intro Vida Univ.']));
    const mods = ['Req: Matemática', 'Req: Física', 'Req: Intro Vida Univ.'].filter(k => on(y[k])).length;
    return [
      { t: 'Preinscripción web', ok: true, d: 'Recibimos tus datos el ' + fmt(y['Fecha']) + '.' },
      { t: 'Validamos tus datos', ok: on(y['Req: Datos validados']), d: 'Alguien del Departamento te contacta para confirmar tus datos.' },
      { t: 'Preinscripción en SysAcad', ok: on(y['Req: Preinscripción SysAcad']), d: y['Legajo'] ? 'Tu legajo: ' + y['Legajo'] : 'Te guiamos para completar la preinscripción en el sistema de la facultad.' },
      { t: 'Pre-cursillo de Metalúrgica', ok: on(y['Req: Pre-cursillo']), d: 'Opcional, ¡pero suma muchísimo!', opt: true },
      { t: 'Cursillo de ingreso', ok: cursillo, d: on(y['Req: Equivalencia']) ? 'Aprobado por equivalencia.' : `Matemática, Física e Introducción a la Vida Universitaria (${mods}/3 aprobados).` },
      { t: 'Documentación', ok: on(y['Req: Documentación']), d: 'Presentala en papel en el Departamento. En la pestaña Documentación ves qué te falta.', go: 'docs' },
      { t: 'Título secundario', ok: on(y['Req: Requisitos académicos']), d: 'Requisito académico para el cursado.' },
      { t: 'Inscripción al cursado en SAAP', ok: on(y['Req: Inscripción Guaraní']), d: 'Último paso para empezar a cursar.' },
      { t: '¡Estudiante de Ingeniería Metalúrgica!', ok: y['Estado'] === 'Estudiante', d: 'Te esperamos en clases 🎉', fin: true }
    ];
  }

  function pintarCamino() {
    const y = D.yo, ps = pasos(y), req = ps.filter(p => !p.opt);
    const hechos = req.filter(p => p.ok).length, pct = Math.round(hechos / req.length * 100);
    const prox = ps.find(p => !p.ok && !p.opt);
    const est = y['Estado'] || 'Consultante';
    $('#estado').textContent = est === 'Consultante' ? 'Aspirante' : est; $('#estado').className = 'badge b-' + est;
    $('#frase').textContent = est === 'Estudiante' ? '¡Ya sos estudiante! 🎉' : est === 'Baja' ? 'Tu ingreso está en pausa' : prox ? 'Próximo paso: ' + prox.t : '¡Completaste todo!';
    $('#sub').textContent = est === 'Baja' ? 'Si querés retomar, escribinos en Mensajes: las puertas están abiertas.' : (prox ? prox.d : '');
    $('#pct').textContent = pct + '%'; $('#ring').style.setProperty('--p', pct);
    let marcado = false;
    $('#steps').innerHTML = ps.map(p => {
      const cur = !p.ok && !p.opt && !marcado ? (marcado = true) : false;
      return `<li class="${p.ok ? 'ok' : ''} ${cur ? 'cur' : ''} ${p.opt ? 'opt' : ''}"><span class="dot">${p.ok ? '✓' : ''}</span><div><b>${esc(p.t)}${p.opt ? ' <em>opcional</em>' : ''}</b><small>${esc(p.d)}</small>${p.go && !p.ok ? `<button class="lnk" data-go="${p.go}">Ir a Documentación ▸</button>` : ''}</div></li>`;
    }).join('');
    $$('#steps [data-go]').forEach(b => b.onclick = () => ver(b.dataset.go));
    const mods = [['Matemática', 'Req: Matemática', 'Nota Matemática'], ['Física', 'Req: Física', 'Nota Física'], ['Intro. a la Vida Universitaria', 'Req: Intro Vida Univ.', 'Nota Intro Vida Univ.']];
    $('#notas').innerHTML = mods.map(([t, k, n]) => {
      const nota = String(y[n] || ''), ok = on(y[k]);
      return `<div class="nota ${ok ? 'ok' : nota ? 'mal' : ''}"><span>${esc(t)}</span><b>${nota ? esc(nota) : '—'}</b><small>${ok ? 'Aprobado' : nota ? 'Pendiente de aprobar' : 'Sin nota todavía'}</small></div>`;
    }).join('');
    $('#notasHint').textContent = on(y['Req: Equivalencia']) ? '✓ Tu ingreso fue aprobado por equivalencia.' : 'Las notas las carga el Departamento a medida que rendís.';
  }

  /* Documentación: se presenta en papel en la facultad; acá solo se ve qué está tildado */
  function pintarDocs() {
    const ds = D.docs || [];
    const pend = ds.filter(x => x.oblig && x.estado !== 'Aprobado').length;
    $('#tDocs').textContent = pend || ''; $('#tDocs').hidden = !pend;
    $('#docList').innerHTML = ds.map(x => {
      const ok = x.estado === 'Aprobado';
      return `<div class="doc ${ok ? 'k-apr' : 'k-falta'}">
        <div class="doc-h"><div><b>${esc(x.doc)}</b>${x.oblig ? '' : ' <em>opcional</em>'}<small>${esc(x.desc || '')}</small></div><span class="st ${ok ? 'st-apr' : 'st-falta'}">${ok ? 'Presentado ✓' : 'Falta presentar'}</span></div>
        ${ok && x.fecha ? `<p class="meta">Lo recibimos el ${fmt(x.fecha)}</p>` : ''}
      </div>`;
    }).join('') || '<div class="card"><p>No hay documentos para presentar por ahora.</p></div>';
  }

  /* ---------- Mensajes ---------- */
  function pintarMsg() {
    const ms = D.mensajes || [];
    const nuevos = ms.filter(m => m.de === 'oficina' && !m.leido).length;
    $('#tMsg').textContent = nuevos || ''; $('#tMsg').hidden = !nuevos; D._sinLeer = nuevos;
    const th = $('#thread');
    th.innerHTML = ms.length ? ms.map(m => `<div class="bub ${m.de === 'aspirante' ? 'me' : 'them'}"><p>${esc(m.texto)}</p><small>${m.de === 'aspirante' ? 'Vos' : esc(m.autor ? 'Departamento · ' + m.autor.split('@')[0] : 'Departamento')} · ${fmt(m.fecha).slice(0, 5)} ${hora(m.fecha)}</small></div>`).join('')
      : '<p class="empty">¿Tenés dudas sobre el ingreso, el cursillo o la documentación? Escribinos acá 👇</p>';
    th.scrollTop = th.scrollHeight;
  }
  $('#bSend').onclick = async () => {
    const texto = $('#txt').value.trim(); if (!texto) return;
    $('#bSend').disabled = true;
    try { const d = await call({ action: 'pMsg', texto }); $('#txt').value = ''; D = Object.assign(D, d); pintarMsg(); toast('✓ Mensaje enviado'); }
    catch (x) { toast(x.message, 4000); }
    finally { $('#bSend').disabled = false; }
  };

  async function refrescar() {
    try { const d = await call({ action: 'pYo' }); D = d; pintarCamino(); pintarDocs(); pintarMsg(); } catch (e) {}
  }
  setInterval(() => { if (SES && D && !document.hidden && !$('.modal.on')) refrescar(); }, 60000);
  /* Al volver a la app (por ejemplo desde el ícono del celular) se actualiza enseguida */
  document.addEventListener('visibilitychange', () => { if (!document.hidden && SES && D && !$('.modal.on')) refrescar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal').forEach(m => m.classList.remove('on')); });

  /* ---------- Inicio ---------- */
  if (location.hash === '#mensajes') vista = 'msg';
  if (location.hash === '#documentacion') vista = 'docs';
  if (SES) {
    $('#login').hidden = true;
    call({ action: 'pYo' }).then(mostrar).catch(() => { $('#login').hidden = false; });
  }
})();
