/* Respuesta de baja del aspirante (link de un solo uso enviado por email) */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const MOTIVOS = ['No aprobé el ingreso', 'Elegí otra carrera', 'Elegí otra universidad', 'Motivos laborales', 'Motivos económicos',
    'Distancia / traslado', 'Horario de cursado', 'Motivos personales o familiares', 'Me cambié de especialidad', 'Otro'];
  const q = new URLSearchParams(location.search), id = q.get('id') || '', t = q.get('t') || '';
  $('#opts').innerHTML = MOTIVOS.map((m, i) => `<label class="opt"><input type="radio" name="m" value="${i}"> ${m}</label>`).join('');
  if (!id || t.length < 20) { $('#msg').style.color = 'var(--pink)'; $('#msg').textContent = 'El link está incompleto. Abrilo desde el email que te enviamos.'; $('#send').disabled = true; }
  $('#send').onclick = async () => {
    const el = document.querySelector('input[name=m]:checked');
    if (!el) { $('#msg').style.color = 'var(--pink)'; $('#msg').textContent = 'Elegí una opción.'; return; }
    $('#send').disabled = true; $('#msg').style.color = 'var(--muted)'; $('#msg').textContent = 'Enviando…';
    try {
      const d = await imApi({ action: 'motivo', id, t, motivo: MOTIVOS[+el.value], detalle: $('#det').value.trim() });
      if (!d.ok) throw new Error(d.error);
      $('#card').innerHTML = '<img src="assets/img/logo.jpg" alt=""><h1>¡Gracias!</h1><p>Recibimos tu respuesta. Si algún día querés retomar, escribinos a ingenieriametalurgicafrc@gmail.com: las puertas están abiertas.</p><a class="btn btn-pink" style="margin-top:16px" href="index.html">Ir a la web</a>';
    } catch (e) {
      $('#msg').style.color = 'var(--pink)'; $('#msg').textContent = e.message || 'No se pudo enviar. Probá de nuevo.'; $('#send').disabled = false;
    }
  };
})();
