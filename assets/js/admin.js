/* Panel de aspirantes · Ingeniería Metalúrgica UTN FRC · v3 */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CFG = window.IM_CONFIG;
  /* Los emails se redactan siempre en el Gmail de Metalúrgica (no en Outlook ni en el programa predeterminado) */
  const gmail = (to, asunto, cuerpo) => 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(CFG.ADMIN_EMAIL) +
    '&view=cm&fs=1&to=' + encodeURIComponent(to || '') + (asunto ? '&su=' + encodeURIComponent(asunto) : '') + (cuerpo ? '&body=' + encodeURIComponent(cuerpo) : '');
  const store = {
    get() { try { const s = JSON.parse(sessionStorage.getItem('im_ses')); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } },
    set(v) { try { v ? sessionStorage.setItem('im_ses', JSON.stringify(v)) : sessionStorage.removeItem('im_ses'); } catch (e) {} }
  };

  /* ---------- Modelo ---------- */
  const ESTADOS = ['Consultante', 'Ingresante', 'Estudiante', 'Baja'];
  const COLOR = { Consultante: 'var(--c-cons)', Ingresante: 'var(--c-ing)', Estudiante: 'var(--c-est)', Baja: 'var(--c-baja)' };
  const SITUACIONES = ['Nuevo · sin contactar', 'Contactado', 'Haciendo el cursillo', 'Responde pero no viene a clases',
    'No responde mensajes', 'Sin comunicación', 'Abandonó', 'Cambio de especialidad', 'Inscripto al cursado'];
  const ETAPAS = {
    1: [{ k: 'Req: Datos validados', t: 'Datos validados', req: true },
        { k: 'Req: Agendado / WhatsApp', t: 'Agendado / sumado al grupo de WhatsApp' },
        { k: 'Req: Preinscripción SysAcad', t: 'Preinscripto en el sistema de la facultad (SysAcad)', req: true, legajo: true }],
    2: [{ k: 'Req: Pre-cursillo', t: 'Asiste al pre-cursillo de Metalúrgica' },
        { k: 'Req: Matemática', t: 'Matemática aprobada', nota: 'Nota Matemática' },
        { k: 'Req: Física', t: 'Física aprobada', nota: 'Nota Física' },
        { k: 'Req: Intro Vida Univ.', t: 'Introducción a la Vida Universitaria aprobada', nota: 'Nota Intro Vida Univ.' },
        { k: 'Req: Equivalencia', t: 'Ingreso aprobado por equivalencia', alt: true }],
    3: [{ k: 'Req: Documentación', t: 'Documentación entregada', req: true },
        { k: 'Req: Requisitos académicos', t: 'Requisitos académicos (título secundario)', req: true },
        { k: 'Req: Inscripción Guaraní', t: 'Inscripto al cursado en Guaraní', req: true }]
  };
  const DATOS = ['Apellidos', 'Nombres', 'Email', 'Teléfono', 'CUIL', 'Fecha de nacimiento', 'Estado civil', 'Nacionalidad', 'País',
    'Dirección', 'Barrio', 'Localidad', 'Provincia', 'Código postal', 'Colegio', 'Secundario técnico', 'Egreso', 'Cómo nos conoció', 'Consulta'];
  const ACCIONES = [['WhatsApp', '#1DA851'], ['Llamada', '#5A49D6'], ['Email', '#C8154D'], ['Reunión / visita', '#C27E00'], ['Nota', '#0091B5']];
  const ACC_COLOR = Object.fromEntries(ACCIONES.concat([['Cambio de estado', '#0E9E5C'], ['Baja', '#6B7394'], ['Respuesta de baja', '#6B7394'], ['Formulario web', '#001484']]));

  const on = v => v === true || /^(✓|si|sí|x|ok|true|1)$/i.test(String(v == null ? '' : v).trim());
  const d10 = v => String(v || '').slice(0, 10);
  const hoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dias = (a, b) => Math.floor((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const fmt = v => { const s = d10(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const [y, m, d] = s.split('-'); return `${d}/${m}/${y.slice(2)}`; };
  const nombre = r => [r['Apellidos'], r['Nombres']].filter(Boolean).join(', ');
  const telLimpio = t => String(t || '').replace(/\D/g, '');
  function wa(t) { let n = telLimpio(t).replace(/^0/, ''); if (!n || /•/.test(t)) return ''; if (n.startsWith('54')) return n; return '549' + n.replace(/^(\d{2,4})15/, '$1'); }
  const cursillo = r => on(r['Req: Equivalencia']) || (on(r['Req: Matemática']) && on(r['Req: Física']) && on(r['Req: Intro Vida Univ.']));
  function faltantes(r) {
    const f = [];
    if (!on(r['Req: Datos validados'])) f.push('datos validados');
    if (!on(r['Req: Preinscripción SysAcad'])) f.push('preinscripción en SysAcad');
    if (!cursillo(r)) f.push('cursillo aprobado');
    if (!on(r['Req: Documentación'])) f.push('documentación');
    if (!on(r['Req: Requisitos académicos'])) f.push('requisitos académicos');
    if (!on(r['Req: Inscripción Guaraní'])) f.push('inscripción en Guaraní');
    return f;
  }
  const progreso = r => 6 - faltantes(r).length;
  function etapaActual(r) {
    if (!on(r['Req: Datos validados']) || !on(r['Req: Preinscripción SysAcad'])) return 1;
    if (!cursillo(r)) return 2;
    return 3;
  }
  /* Regla de seguimiento vencido */
  function pendiente(r) {
    if (['Estudiante', 'Baja'].includes(r['Estado'])) return null;
    const h = hoy(), prox = d10(r['Próximo contacto']);
    if (prox) return prox <= h ? { cls: prox < h ? 'late' : 'today', txt: prox < h ? 'Vencido' : 'Hoy', why: 'Contacto pactado para el ' + fmt(prox), orden: prox } : null;
    const ult = d10(r['Último contacto']), ing = d10(r['Fecha']);
    if (!ult && /^nuevo/i.test(r['Situación'] || '')) {
      const n = dias(ing, h);
      return n >= CFG.DIAS_NUEVO_SIN_CONTACTO ? { cls: 'late', txt: 'Sin contactar', why: `Ingresó hace ${n} días y nadie lo contactó`, orden: ing } : { cls: 'new', txt: 'Nuevo', why: 'Ingresó ' + (n === 0 ? 'hoy' : `hace ${n} día${n > 1 ? 's' : ''}`), orden: ing, soft: true };
    }
    const base = ult || ing, n = dias(base, h);
    return n >= CFG.DIAS_SIN_SEGUIMIENTO ? { cls: 'late', txt: `${n} días`, why: `Sin contacto hace ${n} días`, orden: base } : null;
  }

  /* ---------- Estado ---------- */
  let SES = store.get(), USER = null;
  let FILAS = [], LOG = [], MOTIVOS = [], CIERRE = CFG.CIERRE;
  let filtroEstado = '', orden = { k: 'Fecha', dir: -1 };
  let actual = null, draft = {}, accion = 'WhatsApp', FICHA = null;
  let REQS = [], CUOTA = null, HILO = null;
  const PORTAL = location.origin + location.pathname.replace(/[^/]*$/, '') + 'mi-ingreso.html';

  function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms || 2800); }
  const can = rol => USER && ({ lector: 1, editor: 2, admin: 3 }[USER.rol] >= { lector: 1, editor: 2, admin: 3 }[rol]);

  async function call(params, timeout) {
    const d = await imApi(Object.assign({}, params, { token: SES && SES.token }), timeout);
    if (d && d.auth === false) { logout(d.error); throw new Error(d.error); }
    if (!d || !d.ok) throw new Error((d && d.error) || 'Error');
    if (SES) { SES.exp = Date.now() + (SES.min || 120) * 60000; store.set(SES); }
    return d;
  }

  /* ---------- Ingreso con Google ---------- */
  function initGoogle(tries) {
    if (!CFG.GOOGLE_CLIENT_ID) { $('#lErr').textContent = 'Falta configurar el ID de cliente de Google (GOOGLE_CLIENT_ID en config.js).'; return; }
    if (!(window.google && google.accounts && google.accounts.id)) { if ((tries || 0) < 60) setTimeout(() => initGoogle((tries || 0) + 1), 150); else $('#lErr').textContent = 'No se pudo cargar el inicio de sesión de Google. Revisá la conexión.'; return; }
    google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: r => handleCredential(r.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
    google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'es', width: 280 });
  }
  async function handleCredential(idToken) {
    $('#lErr').textContent = 'Verificando…'; $('#lErr').style.color = 'var(--muted)';
    try {
      const d = await imApi({ action: 'login', idToken });
      if (!d.ok) throw new Error(d.error || 'No se pudo ingresar');
      SES = { token: d.token, exp: Date.now() + d.minutos * 60000, min: d.minutos }; store.set(SES);
      $('#lErr').textContent = '';
      await enter();
    } catch (e) { $('#lErr').style.color = ''; $('#lErr').textContent = e.message; }
  }
  window.imHandleCredential = handleCredential;   // usado por el botón de Google

  async function enter() {
    const d = await call({ action: 'list' });
    USER = d.user;
    $('#login').hidden = true; $('#app').hidden = false;
    $('#who').innerHTML = `<b>${esc(USER.nombre || USER.email)}</b>${esc(USER.email)} · ${esc(USER.rol)}`;
    $$('.adm').forEach(el => el.hidden = !can('admin'));
    document.body.classList.toggle('ro', !can('editor'));
    apply(d);
  }
  function logout(msg) {
    if (SES) imApi({ action: 'logout', token: SES.token }).catch(() => {});
    SES = null; USER = null; store.set(null); closeDrawer(true);
    FILAS = []; LOG = [];
    $('#app').hidden = true; $('#login').hidden = false;
    $('#lErr').style.color = ''; $('#lErr').textContent = msg || '';
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
  }
  $('#bOut').onclick = () => logout('Sesión cerrada.');
  $('#bRefresh').onclick = () => refresh(true);
  async function refresh(loud) {
    try { apply(await call({ action: 'list' })); if (loud) toast('Datos actualizados'); }
    catch (e) { if (loud) toast('No se pudo actualizar: ' + e.message); }
  }
  function apply(d) {
    FILAS = d.filas || []; LOG = d.log || []; MOTIVOS = d.motivos || MOTIVOS; if (d.cierre) CIERRE = d.cierre;
    REQS = d.requisitos || REQS; if (d.cuota != null) CUOTA = d.cuota;
    const nIn = FILAS.reduce((a, r) => a + (r._msg || 0), 0);
    $('#inboxN').textContent = nIn; $('#bInbox').classList.toggle('hot', nIn > 0);
    FILAS.forEach(r => { const p = pendiente(r); r._pend = p; r._venc = p && !p.soft ? '0' + p.orden : (p ? '1' + p.orden : '9'); });
    renderStages(); renderAgenda(); renderTable();
    if (actual) { const r = FILAS.find(x => x.ID === actual); if (r) fillDrawer(r, true); else closeDrawer(true); }
  }

  /* ---------- Tabs ---------- */
  $$('.tab').forEach(t => t.onclick = () => {
    $$('.tab').forEach(x => x.classList.toggle('on', x === t));
    ['seg', 'usr', 'aud'].forEach(k => $('#tab-' + k).hidden = k !== t.dataset.tab);
    if (t.dataset.tab === 'usr') loadUsers();
    if (t.dataset.tab === 'aud') loadAudit();
  });

  /* ---------- Etapas + para hoy ---------- */
  function renderStages() {
    const n = e => FILAS.filter(r => r['Estado'] === e).length;
    const ing = n('Ingresante') + n('Estudiante'), tot = FILAS.length;
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
    const [y, m, dd] = CIERRE.split('-').map(Number);
    const faltan = Math.ceil((new Date(y, m - 1, dd, 23, 59) - new Date()) / 86400000);
    const cards = [
      ['', 'Todos', tot, 'var(--navy)', `${FILAS.filter(r => r['Tipo'] === 'Preinscripción').length} preinscripciones · ${faltan > 0 ? faltan + ' días al cierre' : 'inscripción cerrada'}`],
      ['Consultante', 'Consultantes', n('Consultante'), COLOR.Consultante, `${FILAS.filter(r => r['Estado'] === 'Consultante' && r._pend && !r._pend.soft).length} con seguimiento vencido`],
      ['Ingresante', 'Ingresantes', n('Ingresante'), COLOR.Ingresante, `${pct(ing, tot)} del total llegó acá`],
      ['Estudiante', 'Estudiantes', n('Estudiante'), COLOR.Estudiante, `${pct(n('Estudiante'), ing)} de los ingresantes`],
      ['Baja', 'Bajas', n('Baja'), COLOR.Baja, `${FILAS.filter(r => r['Respuesta del aspirante (baja)']).length} respondieron el motivo`]
    ];
    $('#stages').innerHTML = cards.map(([e, t, v, c, s], i) => `<button class="stg ${filtroEstado === e ? 'on' : ''}" data-e="${e}" style="--c:${c}"><span>${t}</span><b>${v}</b><small>${esc(s)}</small>${i > 0 && i < 3 ? '<i class="arrow">›</i>' : ''}</button>`).join('');
    $$('#stages .stg').forEach(b => b.onclick = () => { filtroEstado = b.dataset.e; renderStages(); renderTable(); });
    $('#ruleTxt').innerHTML = `Un aspirante aparece como <b>pendiente</b> cuando:<br>• la <b>fecha de próximo contacto</b> que cargaste ya llegó; o<br>• es <b>nuevo</b> y nadie lo contactó en <b>${CFG.DIAS_NUEVO_SIN_CONTACTO} días</b>; o<br>• está en proceso y pasaron <b>${CFG.DIAS_SIN_SEGUIMIENTO} días sin contacto</b>.<br>Estudiantes y bajas no generan pendientes. Los días se cambian en <i>config.js</i>.`;
  }
  function renderAgenda() {
    const list = FILAS.filter(r => r._pend).sort((a, b) => a._venc.localeCompare(b._venc)).slice(0, 40);
    $('#agenda').innerHTML = list.length ? list.map(r => `<button class="ag" data-id="${esc(r.ID)}"><span class="d ${r._pend.cls}">${esc(r._pend.txt)}</span><div><b>${esc(nombre(r))}</b><small>${esc(r._pend.why)}</small></div></button>`).join('')
      : '<p class="none">No hay pendientes para hoy. 🎉</p>';
    $$('#agenda .ag').forEach(b => b.onclick = () => openDrawer(b.dataset.id));
  }

  /* ---------- Listado ---------- */
  function filtradas() {
    const q = $('#q').value.trim().toLowerCase(), tipo = $('#fTipo').value, sit = $('#fSit').value, pend = $('#fPend').checked;
    const fd = $('#fDoc').value, fm = $('#fMsg').checked;
    const docOk = r => { const x = r._doc || {}; if (!fd) return true; if (r['Estado'] === 'Baja') return false;
      if (fd === 'falta') return (x.falta || []).length > 0; if (fd === 'obs') return x.obs > 0; if (fd === 'rev') return x.rev > 0; return x.oblig > 0 && x.apr === x.oblig; };
    return FILAS.filter(r => (!filtroEstado || r['Estado'] === filtroEstado) && (!tipo || r['Tipo'] === tipo) && (!sit || r['Situación'] === sit) && (!pend || r._pend) &&
      docOk(r) && (!fm || r._msg > 0) &&
      (!q || ['Apellidos', 'Nombres', 'DNI', 'Email', 'Teléfono', 'Colegio', 'Localidad', 'ID', 'Legajo'].some(k => String(r[k] || '').toLowerCase().includes(q))))
      .sort((a, b) => String(a[orden.k] || '').localeCompare(String(b[orden.k] || ''), 'es', { numeric: true }) * orden.dir);
  }
  function renderTable() {
    const sits = Array.from(new Set(SITUACIONES.concat(FILAS.map(r => r['Situación']).filter(Boolean))));
    const sel = $('#fSit'), cur = sel.value;
    sel.innerHTML = '<option value="">Todas las situaciones</option>' + sits.map(s => `<option ${s === cur ? 'selected' : ''}>${esc(s)}</option>`).join('');
    const rows = filtradas();
    $('#empty').hidden = rows.length > 0;
    $('#difN').textContent = rows.length; $('#bDif').disabled = !rows.length;
    $('#bulkTxt').textContent = rows.length === FILAS.length ? `${rows.length} aspirantes` : `${rows.length} de ${FILAS.length} aspirantes con estos filtros`;
    $('#tbody').innerHTML = rows.map(r => {
      const p = progreso(r), w = wa(r['Teléfono']), pe = r._pend;
      return `<tr data-id="${esc(r.ID)}">
        <td><div class="p-name">${esc(nombre(r))}</div><div class="p-sub">${r['DNI'] ? 'DNI ' + esc(r['DNI']) + ' · ' : ''}${esc(r['Localidad'] || '')}</div><span class="tipo">${esc(r['Tipo'])}</span>${r._msg ? `<span class="chip-msg">💬 ${r._msg}</span>` : ''}</td>
        <td>${w ? `<a class="ic" href="https://wa.me/${w}" target="_blank" rel="noopener" title="WhatsApp">💬</a>` : ''}${r['Email'] && !/•/.test(r['Email']) ? `<a class="ic" href="${esc(gmail(r['Email'], 'Ingeniería Metalúrgica UTN FRC'))}" target="_blank" rel="noopener" title="Email (Gmail de Metalúrgica)">✉</a>` : ''}<div class="p-sub">${esc(r['Teléfono'] || '')}</div></td>
        <td><span class="badge b-${esc(r['Estado'])}">${esc(r['Estado'])}</span></td>
        <td>${esc(r['Situación'] || '')}${r['Estado'] === 'Baja' && r['Motivo de baja'] ? `<div class="p-sub">${esc(r['Motivo de baja'])}</div>` : ''}</td>
        <td><div class="mini"><div class="bt"><div style="width:${p / 6 * 100}%;--c:${p === 6 ? 'var(--c-est)' : 'var(--c-ing)'}"></div></div><span>${p}/6</span></div>${docChip(r._doc)}</td>
        <td class="${pe ? (pe.soft ? 'ok-t' : pe.cls === 'today' ? 'today-t' : 'late-t') : 'ok-t'}">${pe ? (pe.soft ? '' : '⚠ ') + esc(pe.why) : d10(r['Próximo contacto']) ? 'Próximo: ' + fmt(r['Próximo contacto']) : '—'}</td>
        <td>${fmt(r['Fecha'])}</td></tr>`;
    }).join('');
    $$('#tbody tr').forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('a')) openDrawer(tr.dataset.id); }));
  }
  function docChip(x) {
    if (!x || !x.oblig) return '';
    const cls = x.obs ? 'obs' : x.apr === x.oblig ? 'ok' : x.rev ? 'rev' : 'falta';
    const t = x.obs ? `${x.obs} observado${x.obs > 1 ? 's' : ''}` : x.apr === x.oblig ? 'Docs ✓' : x.rev ? `${x.rev} para revisar` : `Docs ${x.ent}/${x.oblig}`;
    return `<span class="dchip d-${cls}">📄 ${t}</span>`;
  }
  ['#q', '#fTipo', '#fSit', '#fPend', '#fDoc', '#fMsg'].forEach(s => $(s).addEventListener('input', renderTable));
  $('#bInbox').onclick = () => { filtroEstado = ''; $('#fMsg').checked = true; renderStages(); renderTable(); $('.list').scrollIntoView({ behavior: 'smooth' }); };
  $$('th[data-sort]').forEach(th => th.onclick = () => { const k = th.dataset.sort; orden = { k, dir: orden.k === k ? -orden.dir : 1 }; renderTable(); });

  /* ---------- Exportar (solo admin, queda auditado) ---------- */
  $('#bCsv').onclick = async () => {
    if (!confirm('Vas a descargar la base completa con datos personales. Guardala en un lugar seguro y no la compartas por canales abiertos. ¿Continuar?')) return;
    try {
      const d = await call({ action: 'export' }), rows = d.filas;
      if (!rows.length) return toast('No hay registros');
      const cols = Object.keys(rows[0]);
      const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const csv = '﻿' + [cols.join(';')].concat(rows.map(r => cols.map(c => cell(r[c])).join(';'))).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `aspirantes-metalurgica-${hoy()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { toast('No se pudo exportar: ' + e.message); }
  };

  /* ---------- Ficha ---------- */
  function openDrawer(id) {
    const r = FILAS.find(x => x.ID === id); if (!r) return;
    actual = id; draft = {}; FICHA = null;
    fillDrawer(r);
    const st = r['Estado'] === 'Consultante' || r['Estado'] === 'Ingresante' ? etapaActual(r) : 0;
    $$('.stage[data-st]').forEach(d => { if (/^\d$/.test(d.dataset.st)) { d.open = +d.dataset.st === st; d.classList.toggle('cur', +d.dataset.st === st); } });
    $('#dDatosBox').open = false; $('#dData').innerHTML = ''; $('#dDatosMsg').textContent = can('editor') ? 'Se cargan al abrir esta sección (queda registrado).' : 'Tu rol no permite ver datos personales.';
    $('#scrim').hidden = false; $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false');
    $('#dBody').scrollTop = 0;
    HILO = null; $('#dDocBox').hidden = $('#dMsgBox').hidden = !can('editor');
    $('#dMsgBox').open = r._msg > 0; $('#dDocBox').open = !!(r._doc && r._doc.rev);
    $('#stbDoc').innerHTML = '<p class="hint">Cargando…</p>'; $('#mThread').innerHTML = '<p class="hint">Cargando…</p>';
    $('#stDoc').textContent = r._doc && r._doc.oblig ? `${r._doc.apr}/${r._doc.oblig} aprobados` : ''; $('#stMsg').textContent = r._msg ? r._msg + ' sin leer' : '';
    if (can('editor')) loadHilo(id);
  }

  /* ---------- Documentación y mensajes de la ficha ---------- */
  async function loadHilo(id) {
    try { const d = await call({ action: 'hilo', id }); if (actual !== id) return; HILO = d; renderHilo(); const r = base(); if (r._msg) { r._msg = 0; apply({ filas: FILAS, log: LOG }); } }
    catch (e) { $('#stbDoc').innerHTML = `<p class="hint">No se pudo cargar: ${esc(e.message)}</p>`; }
  }
  const DOC_EST = { '': ['Falta entregar', 'falta'], 'Entregado': ['Para revisar', 'rev'], 'Aprobado': ['Aprobado', 'ok'], 'Observado': ['Observado', 'obs'] };
  function renderHilo() {
    if (!HILO) return;
    const docs = HILO.docs || [], ob = docs.filter(x => x.oblig);
    $('#stDoc').textContent = ob.length ? `${ob.filter(x => x.estado === 'Aprobado').length}/${ob.length} aprobados` : '';
    $('#stDoc').classList.toggle('done', ob.length > 0 && ob.every(x => x.estado === 'Aprobado'));
    $('#stbDoc').innerHTML = docs.map((x, i) => {
      const [t, c] = DOC_EST[x.estado] || DOC_EST[''], url = x.archivo || x.link;
      return `<div class="dv d-${c}"><div class="dv-h"><div><b>${esc(x.doc)}</b>${x.oblig ? '' : ' <span class="opt">opcional</span>'}<small>${x.estado ? 'Entregado ' + fmt(x.fecha) + (x.link ? ' · link' : x.nombre ? ' · ' + esc(x.nombre) : '') : 'Todavía no lo entregó'}</small></div><span class="dchip d-${c}">${t}</span></div>
        ${x.obs ? `<p class="dv-obs">⚠ ${esc(x.obs)}</p>` : ''}
        ${url ? `<div class="dv-a"><a class="btn btn-ghost-dark" href="${esc(url)}" target="_blank" rel="noopener">Abrir ${x.archivo ? 'archivo' : 'link'} ↗</a>${x.estado !== 'Aprobado' ? `<button class="btn btn-ok" data-ap="${i}">✓ Aprobar</button>` : ''}<button class="btn btn-ghost-dark" data-ob="${i}">Observar…</button></div>
        <div class="dv-f" id="obf${i}" hidden><textarea rows="2" placeholder="¿Qué tiene que corregir? Ej.: la foto del DNI está borrosa"></textarea><div class="msend"><label class="tog"><input type="checkbox" checked> Avisarle por email</label><button class="btn btn-navy" data-obok="${i}">Enviar observación</button></div></div>` : ''}</div>`;
    }).join('') + '<p class="hint">Los archivos se guardan en la carpeta "Documentación aspirantes" de Drive. Cuando todos los obligatorios están aprobados se marca sola la etapa "Documentación entregada".</p>';
    $$('#stbDoc [data-ap]').forEach(b => b.onclick = () => revisar(docs[b.dataset.ap].doc, 'Aprobado'));
    $$('#stbDoc [data-ob]').forEach(b => b.onclick = () => { const f = $('#obf' + b.dataset.ob); f.hidden = !f.hidden; if (!f.hidden) $('textarea', f).focus(); });
    $$('#stbDoc [data-obok]').forEach(b => b.onclick = () => { const f = $('#obf' + b.dataset.obok); revisar(docs[b.dataset.obok].doc, 'Observado', $('textarea', f).value.trim(), $('input', f).checked); });
    const ms = HILO.mensajes || [];
    $('#stMsg').textContent = ms.length ? ms.length + ' mensaje' + (ms.length > 1 ? 's' : '') : '';
    $('#mThread').innerHTML = ms.length ? ms.map(m => `<div class="bub ${m.de === 'oficina' ? 'me' : 'them'}"><p>${esc(m.texto)}</p><small>${m.de === 'oficina' ? esc((m.autor || '').split('@')[0]) + (m.canal && m.canal !== 'portal' ? ' · ' + esc(m.canal) : '') : 'Aspirante'} · ${fmt(m.fecha)} ${String(m.fecha).slice(11, 16)}</small></div>`).join('')
      : '<p class="hint">Sin mensajes todavía. Lo que escribas acá le aparece en <b>Mi ingreso</b>.</p>';
    const th = $('#mThread'); th.scrollTop = th.scrollHeight;
  }
  async function revisar(doc, estado, obs, avisar) {
    if (estado === 'Observado' && !obs) return toast('Escribí qué tiene que corregir');
    try {
      const d = await call({ action: 'docReview', id: actual, doc, estado, obs: obs || '', avisar: !!avisar });
      HILO = d.hilo; apply(d); renderHilo();
      toast(estado === 'Aprobado' ? (d.completo ? '✓ Aprobado · ¡documentación completa!' : '✓ Documento aprobado') : '✓ Observación enviada');
    } catch (e) { toast('No se pudo guardar: ' + e.message, 4000); }
  }
  $('#mSend').onclick = async () => {
    const texto = $('#mTxt').value.trim(); if (!texto) return toast('Escribí un mensaje');
    $('#mSend').disabled = true;
    try { const d = await call({ action: 'msgSend', id: actual, texto, avisar: $('#mMail').checked }); HILO = d; renderHilo(); $('#mTxt').value = ''; toast(d.emailEnviado ? '✓ Enviado y avisado por email' : '✓ Mensaje enviado'); }
    catch (e) { toast('No se pudo enviar: ' + e.message, 4000); }
    finally { $('#mSend').disabled = false; }
  };
  function closeDrawer(force) {
    if (!force && Object.keys(draft).length && !confirm('Tenés cambios sin guardar. ¿Cerrar igual?')) return;
    actual = null; draft = {}; FICHA = null;
    $('#scrim').hidden = true; $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true');
  }
  $('#dClose').onclick = () => closeDrawer(); $('#scrim').onclick = () => closeDrawer();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('.modal.on')) $$('.modal').forEach(m => m.classList.remove('on')); else if (actual) closeDrawer(); } });

  const base = () => FILAS.find(x => x.ID === actual) || {};
  const V = k => (k in draft ? draft[k] : (FICHA && k in FICHA ? FICHA[k] : base()[k]));
  function setDraft(k, v) {
    const orig = FICHA && k in FICHA ? FICHA[k] : base()[k];
    if (String(v ?? '') === String(orig ?? '')) delete draft[k]; else draft[k] = v;
    $('#dDirty').textContent = Object.keys(draft).length ? '● Cambios sin guardar' : '';
  }

  function fillDrawer(r, keep) {
    if (!keep) draft = {};
    $('#dId').textContent = r.ID + ' · ' + (r['Tipo'] || '');
    $('#dName').textContent = nombre(r);
    $('#dMeta').textContent = `Ingresó ${fmt(r['Fecha'])}${r['Colegio'] ? ' · ' + r['Colegio'] : ''}${r['Localidad'] ? ' · ' + r['Localidad'] : ''}`;
    const w = wa(r['Teléfono']);
    $('#dQuick').innerHTML = (w ? `<a class="q-wa" href="https://wa.me/${w}?text=${encodeURIComponent('¡Hola ' + (r['Nombres'] || '') + '! Te escribimos de Ingeniería Metalúrgica UTN FRC 👋')}" target="_blank" rel="noopener">💬 WhatsApp</a>` : '') +
      (telLimpio(r['Teléfono']) && !/•/.test(r['Teléfono']) ? `<a class="q-tel" href="tel:${telLimpio(r['Teléfono'])}">☎ Llamar</a>` : '') +
      (r['Email'] && !/•/.test(r['Email']) ? `<a class="q-mail" href="${esc(gmail(r['Email'], 'Ingeniería Metalúrgica UTN FRC'))}" target="_blank" rel="noopener">✉ Email</a>` : '');
    renderPipe(); renderEtapas();
    $('#dSit').innerHTML = Array.from(new Set(SITUACIONES.concat(V('Situación') ? [V('Situación')] : []))).map(s => `<option ${s === V('Situación') ? 'selected' : ''}>${esc(s)}</option>`).join('');
    $('#dSit').disabled = !can('editor');
    const bi = $('#dBajaInfo');
    if (r['Estado'] === 'Baja') {
      bi.hidden = false;
      bi.innerHTML = `<b>Baja:</b> ${esc(r['Motivo de baja'] || 'sin motivo')}${r['Detalle de baja'] ? ' — ' + esc(r['Detalle de baja']) : ''}<br><b>Etapa:</b> ${esc(r['Etapa de baja'] || '—')} · <b>Fecha:</b> ${fmt(r['Fecha de baja'])}` +
        (r['Respuesta del aspirante (baja)'] ? `<br><b>Respuesta del aspirante:</b> ${esc(r['Respuesta del aspirante (baja)'])}` : r._tieneToken ? '<br><i>Email enviado, esperando respuesta.</i>' : '');
    } else bi.hidden = true;
    $('#dProx').value = d10(V('Próximo contacto')); $('#dObs').value = V('Observaciones') || '';
    $('#dProx').disabled = $('#dObs').disabled = !can('editor');
    $('#dDirty').textContent = Object.keys(draft).length ? '● Cambios sin guardar' : '';
    $('#dActs').innerHTML = ACCIONES.map(([a]) => `<button class="${a === accion ? 'on' : ''}" data-a="${a}">${a}</button>`).join('');
    $$('#dActs button').forEach(b => b.onclick = () => { accion = b.dataset.a; $$('#dActs button').forEach(x => x.classList.toggle('on', x === b)); });
    const logs = LOG.filter(l => l.ID === r.ID).sort((a, b) => String(b['Fecha']).localeCompare(String(a['Fecha'])));
    $('#stLog').textContent = logs.length ? `${logs.length} registro${logs.length > 1 ? 's' : ''}` : '';
    $('#dLog').innerHTML = logs.length ? logs.map(l => `<li style="--c:${ACC_COLOR[l['Acción']] || '#0091B5'}"><b>${esc(l['Acción'])}</b><small>${fmt(l['Fecha'])} ${String(l['Fecha']).slice(11, 16)} · ${esc(String(l['Usuario'] || '').split('@')[0])}${l['Próximo contacto'] ? ' · próximo: ' + fmt(l['Próximo contacto']) : ''}</small>${l['Detalle'] ? `<p>${esc(l['Detalle'])}</p>` : ''}</li>`).join('')
      : '<li><p>Todavía no hay seguimientos registrados.</p></li>';
    $('#dBaja').hidden = r['Estado'] === 'Baja';
  }

  function renderPipe() {
    const r = Object.assign({}, base(), draft), falt = faltantes(r);
    $('#dPipe').innerHTML = ESTADOS.map(e => `<button data-e="${e}" class="${V('Estado') === e ? 'on' : ''} ${e === 'Estudiante' && falt.length ? 'lock' : ''}" ${can('editor') ? '' : 'disabled'}>${e}</button>`).join('');
    $('#dPipeHint').innerHTML = V('Estado') === 'Estudiante' ? '✓ Registrado/a como estudiante.' : V('Estado') === 'Baja' ? 'Dado/a de baja. Podés reactivarlo/a eligiendo otra condición.'
      : falt.length ? `Para pasar a <b>Estudiante</b> falta: ${esc(falt.join(', '))}.` : '✓ Cumple todos los requisitos: ya puede pasar a <b>Estudiante</b>.';
    $$('#dPipe button').forEach(b => b.onclick = () => {
      const e = b.dataset.e; if (e === V('Estado')) return;
      if (e === 'Baja') return openBaja();
      if (e === 'Estudiante' && falt.length && !confirm('Todavía falta: ' + falt.join(', ') + '.\n\n¿Marcar como estudiante igual?')) return;
      setDraft('Estado', e);
      if (e === 'Estudiante') setDraft('Situación', 'Inscripto al cursado');
      save();
    });
  }
  function renderEtapas() {
    const r = Object.assign({}, base(), draft);
    [1, 2, 3].forEach(n => {
      const items = ETAPAS[n];
      const hechos = n === 2 ? (cursillo(r) ? 1 : 0) : items.filter(q => q.req && on(V(q.k))).length;
      const total = n === 2 ? 1 : items.filter(q => q.req).length;
      const em = $('#st' + n); em.textContent = n === 2 ? (cursillo(r) ? '✓ Cursillo aprobado' : `${['Req: Matemática', 'Req: Física', 'Req: Intro Vida Univ.'].filter(k => on(V(k))).length}/3 módulos`) : `${hechos}/${total}`;
      em.classList.toggle('done', hechos === total);
      $('#stb' + n).innerHTML = items.map(q => {
        const ok = on(V(q.k));
        return `<label class="req ${ok ? 'ok' : ''}"><input type="checkbox" data-k="${q.k}" ${ok ? 'checked' : ''} ${can('editor') ? '' : 'disabled'}><span>${q.t}</span>${
          q.nota ? `<input class="nota" data-n="${q.nota}" value="${esc(V(q.nota) || '')}" placeholder="Nota" inputmode="decimal" ${can('editor') ? '' : 'disabled'}>`
          : q.legajo ? `<input class="nota" data-n="Legajo" value="${esc(V('Legajo') || '')}" placeholder="Legajo" inputmode="numeric" ${can('editor') ? '' : 'disabled'}>`
          : q.alt ? '<span class="opt">Reemplaza los 3 módulos</span>' : q.req ? '' : '<span class="opt">Opcional</span>'}</label>`;
      }).join('');
    });
    $$('.st-b input[type=checkbox]').forEach(c => c.onchange = () => { setDraft(c.dataset.k, c.checked ? '✓' : ''); renderEtapas(); renderPipe(); });
    $$('.st-b .nota').forEach(n => { n.onclick = e => e.preventDefault(); n.oninput = () => setDraft(n.dataset.n, n.value.trim()); });
  }
  $('#dSit').onchange = e => setDraft('Situación', e.target.value);
  $('#dProx').oninput = e => setDraft('Próximo contacto', e.target.value);
  $('#dObs').oninput = e => setDraft('Observaciones', e.target.value);

  // Datos personales: se piden al servidor solo al abrir (queda auditado)
  $('#dDatosBox').addEventListener('toggle', async e => {
    if (!e.target.open || FICHA || !can('editor') || !actual) return;
    $('#dDatosMsg').textContent = 'Cargando…';
    try {
      const d = await call({ action: 'get', id: actual });
      FICHA = d.ficha;
      $('#dDatosMsg').textContent = 'Estos datos son confidenciales (Ley 25.326).';
      $('#dData').innerHTML = DATOS.map(k => k === 'Consulta'
        ? `<label style="grid-column:1/-1">${k}<textarea data-k="${k}" rows="3">${esc(V(k) || '')}</textarea></label>`
        : `<label>${k}<input data-k="${k}" value="${esc(k === 'Fecha de nacimiento' ? d10(V(k)) : V(k) || '')}"></label>`).join('');
    } catch (err) { $('#dDatosMsg').textContent = 'No se pudieron cargar: ' + err.message; }
  });
  $('#dData').addEventListener('input', e => { const k = e.target.dataset.k; if (k) setDraft(k, e.target.value); });

  async function save() {
    if (!Object.keys(draft).length) { toast('No hay cambios para guardar'); return; }
    $('#dSave').disabled = true;
    try {
      const d = await call({ action: 'update', id: actual, cambios: Object.assign({}, draft) });
      draft = {}; if (FICHA) FICHA = null, $('#dDatosBox').open = false;
      apply(d); toast('✓ Cambios guardados');
    } catch (e) { toast('No se pudo guardar: ' + e.message, 4000); }
    finally { $('#dSave').disabled = false; }
  }
  $('#dSave').onclick = save;

  $('#lSave').onclick = async () => {
    const det = $('#lDet').value.trim(), prox = $('#lProx').value;
    if (!det && !prox) return toast('Escribí qué pasó o elegí un próximo contacto');
    $('#lSave').disabled = true;
    try {
      const params = { action: 'log', id: actual, accion, detalle: det, proximo: prox };
      if (/^nuevo/i.test(V('Situación') || '')) params.situacion = 'Contactado';
      if (!prox && d10(V('Próximo contacto')) && d10(V('Próximo contacto')) <= hoy()) params.limpiarProximo = true;
      const pend = Object.assign({}, draft);
      const d = await call(params);
      $('#lDet').value = ''; $('#lProx').value = '';
      draft = pend; apply(d); toast('✓ Seguimiento registrado');
    } catch (e) { toast('No se pudo registrar: ' + e.message, 4000); }
    finally { $('#lSave').disabled = false; }
  };

  /* ---------- Baja ---------- */
  function openBaja() {
    const r = base();
    $('#mBajaName').textContent = nombre(r) + ' · ' + (r['Estado'] || '');
    $('#bMot').innerHTML = '<option value="">Elegí un motivo</option>' + MOTIVOS.map(m => `<option>${esc(m)}</option>`).join('');
    $('#bDet').value = ''; $('#bErr').textContent = '';
    $('#bMail').checked = false; $('#bMail').disabled = !r['Email'];
    $('#mBaja').classList.add('on');
  }
  $('#dBaja').onclick = openBaja;
  $('#bNo').onclick = () => $('#mBaja').classList.remove('on');
  $('#bOk').onclick = async () => {
    const motivo = $('#bMot').value; if (!motivo) { $('#bErr').textContent = 'Elegí un motivo.'; return; }
    $('#bOk').disabled = true;
    try {
      const sitio = location.origin + location.pathname.replace(/[^/]*$/, '');
      const d = await call({ action: 'baja', id: actual, motivo, detalle: $('#bDet').value.trim(), enviarEmail: $('#bMail').checked, sitio });
      $('#mBaja').classList.remove('on'); draft = {}; apply(d);
      toast(d.emailEnviado ? '✓ Baja registrada y email enviado' : '✓ Baja registrada');
    } catch (e) { $('#bErr').textContent = e.message; }
    finally { $('#bOk').disabled = false; }
  };

  /* ---------- Eliminar (solo admin) ---------- */
  $('#dDel').onclick = () => { $('#mDelName').textContent = nombre(base()) + ' · ' + actual; $('#delTxt').value = ''; $('#delErr').textContent = ''; $('#mDel').classList.add('on'); setTimeout(() => $('#delTxt').focus(), 50); };
  $('#delNo').onclick = () => $('#mDel').classList.remove('on');
  $('#delOk').onclick = async () => {
    if ($('#delTxt').value.trim().toUpperCase() !== 'ELIMINAR') { $('#delErr').textContent = 'Escribí ELIMINAR para confirmar.'; return; }
    $('#delOk').disabled = true;
    try {
      const id = actual, d = await call({ action: 'delete', id });
      $('#mDel').classList.remove('on'); closeDrawer(true); apply(d); toast('Registro eliminado (copia en Papelera)');
    } catch (e) { $('#delErr').textContent = e.message; }
    finally { $('#delOk').disabled = false; }
  };

  /* ---------- Difusión: mensaje a todos los filtrados ---------- */
  const fechaCierre = () => { const [y, m, d] = CIERRE.split('-'); return `${+d}/${+m}`; };
  const PLANTILLAS = () => [
    { k: 'falta', t: 'Falta documentación', as: 'Te falta entregar documentación · Ingeniería Metalúrgica',
      tx: `¡Hola {nombre}! 👋 Te escribimos del Departamento de Ingeniería Metalúrgica (UTN FRC).\nPara completar tu ingreso todavía nos falta: {documentos}.\nLo podés subir en 2 minutos desde Mi ingreso (entrás con tu email): ${PORTAL}\nCualquier duda, respondé este mensaje.` },
    { k: 'obs', t: 'Documento observado', as: 'Tenés un documento para corregir · Ingeniería Metalúrgica',
      tx: `¡Hola {nombre}! Revisamos tu documentación y hay algo para corregir. Entrá a Mi ingreso, en la pestaña Documentación vas a ver qué falta: ${PORTAL}` },
    { k: 'cierre', t: 'Recordatorio de cierre', as: 'Las inscripciones cierran pronto · Ingeniería Metalúrgica',
      tx: `¡Hola {nombre}! Te recordamos que las inscripciones cierran el ${fechaCierre()}. Para completar tu ingreso te falta: {pasos}.\nSeguí tu proceso en Mi ingreso: ${PORTAL}` },
    { k: 'portal', t: 'Invitación a Mi ingreso', as: 'Seguí tu ingreso online · Ingeniería Metalúrgica',
      tx: `¡Hola {nombre}! Ya podés seguir tu ingreso a Ingeniería Metalúrgica online: ver tus pasos y notas, subir la documentación y escribirnos.\nEntrá con tu email acá: ${PORTAL}` },
    { k: 'libre', t: 'Mensaje libre', as: 'Ingeniería Metalúrgica UTN FRC', tx: '¡Hola {nombre}! ' }
  ];
  let DIF = [];
  function prevTxt() {
    const r = DIF[0]; if (!r) return '';
    const fal = (r._doc && r._doc.falta || []).join(', ') || 'nada, ¡ya está todo!';
    const pas = faltantes(r).join(', ') || 'nada, ¡ya completaste todo!';
    return $('#difTxt').value.replace(/\{nombre\}/g, String(r['Nombres'] || '').split(' ')[0]).replace(/\{documentos\}/g, fal).replace(/\{pasos\}/g, pas);
  }
  function updPrev() { $('#prevTxt').textContent = prevTxt(); }
  $('#bDif').onclick = () => {
    DIF = filtradas(); if (!DIF.length) return;
    const tp = PLANTILLAS();
    $('#difTit').textContent = DIF.length === 1 ? '1 aspirante' : DIF.length + ' aspirantes';
    $('#difDest').textContent = 'Ver destinatarios (' + DIF.length + ')';
    $('#difList').textContent = DIF.map(nombre).join(' · ');
    $('#difTpl').innerHTML = tp.map(x => `<option value="${x.k}">${esc(x.t)}</option>`).join('');
    const def = $('#fDoc').value === 'obs' ? 'obs' : $('#fDoc').value === 'falta' ? 'falta' : 'libre';
    $('#difTpl').value = def; usarTpl();
    const cupo = CUOTA == null ? null : Math.max(0, CUOTA - 15);
    $('#cuotaTxt').textContent = cupo == null ? '' : `· hoy podés enviar ${cupo}${cupo < DIF.length ? ' (el resto, mañana)' : ''}`;
    $('#prevN').textContent = nombre(DIF[0]);
    $('#difErr').textContent = ''; $('#difForm').hidden = false; $('#difRes').hidden = true;
    $('#mDif').classList.add('on');
  };
  function usarTpl() { const x = PLANTILLAS().find(t => t.k === $('#difTpl').value); $('#difAs').value = x.as; $('#difTxt').value = x.tx; updPrev(); }
  $('#difTpl').onchange = usarTpl;
  $('#difTxt').oninput = updPrev;
  $$('.vars button').forEach(b => b.onclick = e => { e.preventDefault(); const t = $('#difTxt'), i = t.selectionStart || t.value.length; t.value = t.value.slice(0, i) + b.dataset.v + t.value.slice(t.selectionEnd || i); t.focus(); updPrev(); });
  $('#difNo').onclick = () => $('#mDif').classList.remove('on');
  $('#difFin').onclick = () => $('#mDif').classList.remove('on');
  $('#difOk').onclick = async () => {
    const canales = { portal: $('#cPortal').checked, email: $('#cEmail').checked, wa: $('#cWa').checked };
    if (!canales.portal && !canales.email && !canales.wa) return $('#difErr').textContent = 'Elegí al menos un canal.';
    if (!$('#difTxt').value.trim()) return $('#difErr').textContent = 'Escribí el mensaje.';
    if (!confirm(`Vas a enviar este mensaje a ${DIF.length} aspirante${DIF.length > 1 ? 's' : ''}. ¿Confirmás?`)) return;
    $('#difOk').disabled = true; $('#difErr').textContent = 'Enviando…';
    try {
      const d = await call({ action: 'difundir', ids: DIF.map(r => r.ID), asunto: $('#difAs').value.trim(), texto: $('#difTxt').value.trim(), canales }, 300000);
      if (d.lista) apply(d.lista);
      const partes = [];
      if (canales.portal) partes.push(`✓ ${d.portal} mensajes en Mi ingreso`);
      if (canales.email) partes.push(`✓ ${d.email} emails enviados` + (d.sinCuota ? ` · ⚠ ${d.sinCuota} quedaron sin enviar por el límite diario de Gmail (repetilo mañana)` : '') + (d.sinEmail ? ` · ${d.sinEmail} sin email` : ''));
      if (canales.wa) partes.push(`WhatsApp: tocá "Enviar" en cada persona (${d.wa.length})`);
      $('#difResTxt').innerHTML = partes.map(esc).join('<br>');
      $('#waList').innerHTML = (d.wa || []).map((w, i) => `<div class="wa"><span>${esc(w.nombre)}</span><a class="btn btn-wa" href="${esc(w.link)}" target="_blank" rel="noopener" data-i="${i}">Enviar ▸</a></div>`).join('');
      $$('#waList a').forEach(a => a.addEventListener('click', () => { a.textContent = '✓ Abierto'; a.classList.add('done'); }));
      $('#difForm').hidden = true; $('#difRes').hidden = false; $('#difErr').textContent = '';
    } catch (e) { $('#difErr').textContent = e.message; }
    finally { $('#difOk').disabled = false; }
  };

  /* ---------- Usuarios ---------- */
  async function loadUsers(d) {
    try {
      d = d || await call({ action: 'users' });
      $('#uBody').innerHTML = d.usuarios.map(u => {
        const act = /^s[ií]$/i.test(String(u.Activo)) || u.principal;
        return `<tr><td><div class="p-name">${esc(u.Nombre || '—')}</div><div class="p-sub">${esc(u.Email)}</div></td>
          <td>${u.principal ? '<span class="role admin">admin · principal</span>' : `<select class="uRol" data-e="${esc(u.Email)}" data-n="${esc(u.Nombre || '')}">${['lector', 'editor', 'admin'].map(r => `<option ${r === u.Rol ? 'selected' : ''}>${r}</option>`).join('')}</select>`}</td>
          <td>${act ? '✅ Activo' : '⛔ Sin acceso'}</td><td>${u['Último acceso'] ? fmt(u['Último acceso']) : '—'}</td>
          <td>${u.principal ? '' : `<button class="btn ${act ? 'btn-danger' : 'btn-ghost-dark'} uTog" data-e="${esc(u.Email)}" data-n="${esc(u.Nombre || '')}" data-r="${esc(u.Rol)}" data-a="${act ? 0 : 1}">${act ? 'Quitar acceso' : 'Reactivar'}</button>`}</td></tr>`;
      }).join('');
      $$('.uRol').forEach(s => s.onchange = () => saveUser({ email: s.dataset.e, nombre: s.dataset.n, rol: s.value, activo: true }));
      $$('.uTog').forEach(b => b.onclick = () => { if (b.dataset.a === '0' && !confirm('¿Quitarle el acceso a ' + b.dataset.e + '?')) return; saveUser({ email: b.dataset.e, nombre: b.dataset.n, rol: b.dataset.r, activo: b.dataset.a === '1' }); });
    } catch (e) { $('#uErr').textContent = e.message; }
  }
  async function saveUser(u) {
    $('#uErr').textContent = '';
    try { const d = await call(Object.assign({ action: 'saveUser' }, u)); loadUsers(d); toast('✓ Accesos actualizados'); }
    catch (e) { $('#uErr').textContent = e.message; }
  }
  $('#uSave').onclick = () => {
    const email = $('#uEmail').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('#uErr').textContent = 'Escribí un email válido.'; return; }
    saveUser({ email, nombre: $('#uNombre').value.trim(), rol: $('#uRol').value, activo: true });
    $('#uEmail').value = ''; $('#uNombre').value = '';
  };

  async function loadAudit() {
    try {
      const d = await call({ action: 'audit' });
      $('#aBody').innerHTML = d.auditoria.map(a => `<tr><td>${fmt(a['Fecha'])} ${String(a['Fecha']).slice(11, 16)}</td><td>${esc(a['Usuario'])}</td><td>${esc(a['Acción'])}</td><td>${esc(a['ID'])}</td><td>${esc(a['Detalle'])}</td></tr>`).join('') || '<tr><td colspan="5">Sin movimientos.</td></tr>';
    } catch (e) { toast(e.message); }
  }

  /* ---------- Inicio ---------- */
  setInterval(() => { if (SES && USER && !document.hidden && !Object.keys(draft).length && !$('.modal.on')) refresh(false); }, 90000);
  if (SES) { $('#login').hidden = true; enter().catch(() => { $('#login').hidden = false; $('#app').hidden = true; initGoogle(); }); }
  initGoogle();
})();
