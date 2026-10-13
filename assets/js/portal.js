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
  let SES = ses.get(), D = null, DATO = '', docActual = '', vista = 'camino';

  function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 3000); }
  const err = (m, el) => { (el || $('#lErr')).textContent = m || ''; };

  async function call(params, timeout) {
    const d = await imApi(Object.assign({}, params, { token: SES && SES.token }), timeout);
    if (d && d.auth === false) { salir(d.error); throw new Error(d.error); }
    if (!d || !d.ok) throw new Error((d && d.error) || 'No se pudo completar. Probá de nuevo.');
    if (SES) { SES.exp = Date.now() + (SES.h || 6) * 3600000; ses.set(SES); }
    return d;
  }

  /* ---------- Ingreso con código ---------- */
  async function pedirCodigo() {
    DATO = $('#dato').value.trim();
    if (DATO.length < 6) return err('Escribí el email con el que te preinscribiste.');
    $('#bCod').disabled = true; err('');
    try {
      const d = await imApi({ action: 'pCodigo', dato: DATO });
      if (!d.ok) throw new Error(d.error);
      $('#codMsg').textContent = d.msg; $('#step1').hidden = true; $('#step2').hidden = false;
      $('#codigo').value = ''; setTimeout(() => $('#codigo').focus(), 50);
    } catch (e) { err(e.message || 'No se pudo enviar el código.'); }
    finally { $('#bCod').disabled = false; }
  }
  async function entrar() {
    const codigo = $('#codigo').value.replace(/\D/g, '');
    if (codigo.length !== 6) return err('El código tiene 6 números.');
    $('#bEnt').disabled = true; err('');
    try {
      const d = await imApi({ action: 'pEntrar', dato: DATO, codigo });
      if (!d.ok) throw new Error(d.error);
      SES = { token: d.token, h: d.horas, exp: Date.now() + d.horas * 3600000 }; ses.set(SES);
      mostrar(d);
    } catch (e) { err(e.message); }
    finally { $('#bEnt').disabled = false; }
  }
  $('#bCod').onclick = pedirCodigo;
  $('#dato').onkeydown = e => { if (e.key === 'Enter') pedirCodigo(); };
  $('#bEnt').onclick = entrar;
  $('#codigo').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); if (e.target.value.length === 6) entrar(); };
  $('#bRe').onclick = () => { $('#step2').hidden = true; $('#step1').hidden = false; pedirCodigo(); };
  $('#bCam').onclick = () => { $('#step2').hidden = true; $('#step1').hidden = false; err(''); $('#dato').focus(); };

  function salir(msg) {
    if (SES) imApi({ action: 'pSalir', token: SES.token }).catch(() => {});
    SES = null; D = null; ses.set(null);
    $('#app').hidden = true; $('#login').hidden = false; $('#step2').hidden = true; $('#step1').hidden = false;
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
    $('#maxMb').textContent = d.maxMb || 10;
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
      { t: 'Documentación', ok: on(y['Req: Documentación']), d: 'Subila desde la pestaña Documentación.', go: 'docs' },
      { t: 'Título secundario', ok: on(y['Req: Requisitos académicos']), d: 'Requisito académico para el cursado.' },
      { t: 'Inscripción al cursado en Guaraní', ok: on(y['Req: Inscripción Guaraní']), d: 'Último paso para empezar a cursar.' },
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

  const ESTADOS_DOC = { '': ['Falta entregar', 'falta'], 'Entregado': ['En revisión', 'rev'], 'Aprobado': ['Aprobado ✓', 'apr'], 'Observado': ['Hay que corregirlo', 'obs'] };
  function pintarDocs() {
    const ds = D.docs || [];
    const pend = ds.filter(x => x.oblig && (!x.estado || x.estado === 'Observado')).length;
    $('#tDocs').textContent = pend || ''; $('#tDocs').hidden = !pend;
    $('#docList').innerHTML = ds.map(x => {
      const [lbl, cls] = ESTADOS_DOC[x.estado] || ESTADOS_DOC[''];
      const verLink = x.archivo || x.link;
      return `<div class="doc k-${cls}">
        <div class="doc-h"><div><b>${esc(x.doc)}</b>${x.oblig ? '' : ' <em>opcional</em>'}<small>${esc(x.desc)}</small></div><span class="st st-${cls}">${lbl}</span></div>
        ${x.estado === 'Observado' && x.obs ? `<p class="obs">⚠ ${esc(x.obs)}</p>` : ''}
        ${x.estado ? `<p class="meta">Entregado el ${fmt(x.fecha)}${x.nombre ? ' · ' + esc(x.nombre) : ''}${x.link ? ` · <a href="${esc(x.link)}" target="_blank" rel="noopener">ver link</a>` : ''}</p>` : ''}
        ${x.estado !== 'Aprobado' ? `<div class="doc-a"><button class="btn btn-navy" data-up="${esc(x.doc)}">${x.estado ? '↻ Subir de nuevo' : '⬆ Subir archivo'}</button><button class="btn btn-ghost" data-ln="${esc(x.doc)}">🔗 Pegar link</button></div>` : ''}
        <div class="prog" hidden><div></div><span>Subiendo…</span></div>
      </div>`;
    }).join('') || '<div class="card"><p>No hay documentos para entregar por ahora.</p></div>';
    $$('[data-up]').forEach(b => b.onclick = () => { docActual = b.dataset.up; $('#file').value = ''; $('#file').click(); });
    $$('[data-ln]').forEach(b => b.onclick = () => { docActual = b.dataset.ln; $('#mLinkDoc').textContent = docActual; $('#linkTxt').value = ''; err('', $('#linkErr')); $('#mLink').classList.add('on'); setTimeout(() => $('#linkTxt').focus(), 50); });
  }

  /* Subida: las fotos grandes se achican en el celular antes de enviarlas */
  function leerB64(blob) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob); }); }
  function achicar(file) {
    return new Promise(res => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.2 * 1048576) return res(file);
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(b => res(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  $('#file').onchange = async e => {
    let f = e.target.files[0]; if (!f) return;
    const card = $(`[data-up="${CSS.escape(docActual)}"]`).closest('.doc'), prog = $('.prog', card);
    const max = (D.maxMb || 10) * 1048576;
    const tipo = f.type || (/\.heic$/i.test(f.name) ? 'image/heic' : /\.pdf$/i.test(f.name) ? 'application/pdf' : '');
    if (!/^(application\/pdf|image\/(jpeg|png|webp|heic|heif))$/.test(tipo)) return toast('Subí un PDF o una foto (JPG o PNG).', 4000);
    prog.hidden = false; $$('button', card).forEach(b => b.disabled = true);
    try {
      f = await achicar(f);
      if (f.size > max) throw new Error(`El archivo pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es ${D.maxMb} MB.`);
      const data = await leerB64(f);
      const d = await call({ action: 'pSubir', doc: docActual, mime: f.type || tipo, nombre: f.name, data }, 120000);
      D = Object.assign(D, d); pintarDocs(); pintarCamino(); toast('✓ ¡Documento recibido! Lo vamos a revisar.');
    } catch (x) { prog.hidden = true; $$('button', card).forEach(b => b.disabled = false); toast(x.message || 'No se pudo subir. Probá de nuevo.', 5000); }
  };
  $('#linkNo').onclick = () => $('#mLink').classList.remove('on');
  $('#linkOk').onclick = async () => {
    const link = $('#linkTxt').value.trim();
    if (!/^https:\/\//.test(link)) return err('Pegá el link completo (empieza con https://).', $('#linkErr'));
    $('#linkOk').disabled = true;
    try { const d = await call({ action: 'pLink', doc: docActual, link }); D = Object.assign(D, d); $('#mLink').classList.remove('on'); pintarDocs(); toast('✓ Link guardado. Revisá que se pueda abrir sin pedir permiso.', 4500); }
    catch (x) { err(x.message, $('#linkErr')); }
    finally { $('#linkOk').disabled = false; }
  };

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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal').forEach(m => m.classList.remove('on')); });

  /* ---------- Inicio ---------- */
  if (location.hash === '#mensajes') vista = 'msg';
  if (location.hash === '#documentacion') vista = 'docs';
  if (SES) {
    $('#login').hidden = true;
    call({ action: 'pYo' }).then(mostrar).catch(() => { $('#login').hidden = false; });
  }
})();
