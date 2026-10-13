/* Desafío de Postas · modo individual (todo queda en el navegador, no se envía nada) */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = window.POSTAS || [];
  const LET = 'ABCD';
  const ACC = [['var(--pink)', '#fff'], ['var(--amber)', 'var(--navy)'], ['var(--cyan)', 'var(--navy)'], ['var(--violet)', 'var(--navy)']];
  const OPC = ['var(--pink)', 'var(--amber)', 'var(--cyan)', 'var(--violet)'];
  const ok = p => { try { return atob(p.k).slice(-1); } catch (e) { return ''; } };
  let i = 0, sel = null, res = [];

  function prog() { $('#pProg').innerHTML = P.map((_, k) => `<i class="${res[k] === true ? 'ok' : res[k] === false ? 'no' : k === i ? 'cur' : ''}"></i>`).join(''); }

  function render() {
    prog();
    if (i >= P.length) return fin();
    const p = P[i], [acc, ink] = ACC[i % 4];
    sel = null;
    $('#pGame').innerHTML = `<article class="pcard" style="--acc:${acc};--acc-ink:${ink}"><div class="pcard-top"></div><div class="pcard-b">
      <div class="ph"><span class="num">${i + 1}</span><div><small>Posta ${i + 1} de ${P.length}</small><h3>${esc(p.titulo)}</h3></div></div>
      <div class="pvinc">${p.vinc.map(v => `<span>📘 ${esc(v)}</span>`).join('')}</div>
      <div class="pdil"><b>El dilema</b>${esc(p.dilema)}</div>
      <details><summary>Preguntas para pensar antes de elegir</summary><ol>${p.guia.map(q => `<li>${esc(q)}</li>`).join('')}</ol></details>
      <div class="pcons"><small>Desafío</small>${esc(p.consigna)}</div>
      <div class="pops">${p.ops.map((o, j) => `<button class="pop" data-j="${j}" style="--c:${OPC[j]}"><span class="l">${LET[j]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="pwhy"><label>¿Por qué elegiste esa opción? <span style="font-weight:600;color:var(--muted)">(opcional, solo para vos)</span><textarea id="pWhy" rows="2" placeholder="Explicalo con tus palabras…"></textarea></label></div>
      <div id="pRes"></div>
      <div class="pact"><button class="btn btn-pink" id="pBtn" disabled>Ver la respuesta</button></div>
    </div></article>`;
    document.querySelectorAll('.pop').forEach(b => b.onclick = () => {
      if (b.disabled) return; sel = +b.dataset.j;
      document.querySelectorAll('.pop').forEach(x => x.classList.toggle('sel', x === b));
      $('#pBtn').disabled = false;
    });
    $('#pBtn').onclick = reveal;
  }

  function reveal() {
    const p = P[i], c = LET.indexOf(ok(p)), acerto = sel === c, why = $('#pWhy').value.trim();
    res[i] = acerto;
    document.querySelectorAll('.pop').forEach(b => { const j = +b.dataset.j; b.disabled = true; b.classList.remove('sel'); b.classList.add(j === c ? 'right' : j === sel ? 'wrong' : 'dim'); });
    $('#pWhy').disabled = true;
    $('#pRes').innerHTML = `<div class="pres"><b>${acerto ? '✓ ¡Pensaste como ingeniero/a!' : '✗ La ingeniería eligió la opción ' + LET[c]}</b>${esc(p.exp || '')}${why ? `<p class="mine">Tu razonamiento: “${esc(why)}”</p>` : ''}</div>`;
    const b = $('#pBtn'); b.textContent = i === P.length - 1 ? 'Ver mi resultado' : 'Siguiente posta ▸';
    b.onclick = () => { i++; render(); $('#juego').scrollIntoView({ behavior: 'smooth' }); };
    prog();
  }

  function fin() {
    const n = res.filter(Boolean).length;
    const msg = n >= 4 ? ['¡Sos ingeniero/a en potencia!', 'Resolviste los desafíos como lo haría un profesional de los materiales. ¿Y si lo hacés de verdad?']
      : n >= 2 ? ['¡Muy buen razonamiento!', 'Tenés intuición técnica. En la carrera vas a aprender el porqué de cada decisión.']
      : ['¡Ahora sabés mucho más!', 'Cada uno de estos problemas se estudia en Ingeniería Metalúrgica. ¿Te animás?'];
    $('#pGame').innerHTML = `<div class="pcard"><div class="pcard-b pend"><div class="score">${n}/${P.length}</div><h3>${msg[0]}</h3><p>${msg[1]}</p>
      <div class="btns"><a class="btn btn-pink" href="index.html#preinscripcion">Preinscribirme</a><button class="btn btn-ghost-dark" id="pAgain">Jugar de nuevo</button></div></div></div>`;
    $('#pAgain').onclick = () => { i = 0; res = []; render(); };
  }

  const bg = document.getElementById('burger');
  if (bg) bg.onclick = () => { const o = document.getElementById('links').classList.toggle('open'); bg.setAttribute('aria-expanded', o); };
  render();
})();
