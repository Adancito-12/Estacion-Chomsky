/* ============================================================
   Interfaz del Nivel 2 (CAM 2): autómata de pila
   Usa el motor de js/core/pda.js y el diagrama de js/ui/diagrama.js.
   Aquí solo se dibuja: pila animada, cinta, diagrama, tabla δ, traza y controles.
   ============================================================ */
(() => {
  'use strict';
  const { LENGUAJES_PDA, ejemplos, dibujarDiagrama: dibujarSVG } = window.Chomsky;
  const $ = id => document.getElementById(id);
  const mostrar = s => (s === 'Z' ? 'Z₀' : s);              // el fondo se escribe Z₀
  let pda, temporizador = null, pilaPrev = [];

  /* ---------- Elección del lenguaje ---------- */
  const sel = $('lenguaje');
  LENGUAJES_PDA.forEach((l, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = l.nombre; sel.appendChild(o);
  });

  function mostrarParametro() {
    const l = LENGUAJES_PDA[sel.value];
    $('param-caja').hidden = !l.param;
    if (l.param) {
      $('param-etq').textContent = l.param.etiqueta + ' =';
      $('param').value = l.param.defecto;
      $('param-ayuda').textContent = '(' + l.param.ayuda + ')';
    }
  }

  function aplicarLenguaje() {
    detener();
    const l = LENGUAJES_PDA[sel.value];
    let creado;
    try { creado = l.crear(l.param ? $('param').value.trim() : ''); }
    catch (e) { $('aviso').textContent = '⚠ ' + e.message; return; }
    $('aviso').textContent = '';
    pda = creado.pda;
    $('descripcion').textContent = creado.descripcion;
    dibujarDefinicion(); dibujarDiagrama(); dibujarTablaDelta(); dibujarEjemplos();
    const ok = ejemplos(pda).aceptadas;
    $('cadena').value = ok[Math.min(2, ok.length - 1)] || '';     // un ejemplo con pila que crece
    cargar();
  }

  /* ---------- Definición formal ---------- */
  function dibujarDefinicion() {
    $('tupla').textContent =
      'M = (Q, Σ, Γ, δ, q₀, Z₀, F)\n' +
      'Q  = { ' + pda.estados.join(', ') + ' }\n' +
      'Σ  = { ' + pda.alfabeto.join(', ') + ' }\n' +
      'Γ  = { ' + pda.alfabetoPila.map(mostrar).join(', ') + ' }\n' +
      'q₀ = ' + pda.inicial + '\n' +
      'Z₀ = Z₀   (símbolo de fondo de la pila)\n' +
      'F  = { ' + [...pda.finales].join(', ') + ' }\n' +
      'δ  : ver la tabla de transiciones';
  }

  /* ---------- Diagrama: cada flecha lleva las etiquetas "lee, tope / apila" ---------- */
  function dibujarDiagrama() {
    const grupos = {};
    for (const r of pda.reglas) {
      const g = (grupos[r.de + '|' + r.a] = grupos[r.de + '|' + r.a] || { de: r.de, a: r.a, lineas: [] });
      if (!g.lineas.includes(r.etq)) g.lineas.push(r.etq);        // reglas parecidas comparten etiqueta
    }
    dibujarSVG($('diagrama'), pda.estados, pda.inicial, pda.finales, Object.values(grupos));
  }

  /* ---------- Tabla de transiciones δ ---------- */
  function dibujarTablaDelta() {
    let h = '<thead><tr><th>Estado</th><th>Lee</th><th>Tope</th><th>Pasa a</th><th>Apila</th></tr></thead><tbody>';
    pda.reglas.forEach((r, i) => {
      h += `<tr data-i="${i}"><td>${r.de}</td><td>${r.lee}</td><td>${mostrar(r.tope)}</td><td>${r.a}</td><td>${r.apila ? [...r.apila].map(mostrar).join(' ') : 'ε'}</td></tr>`;
    });
    $('delta').innerHTML = h + '</tbody>';
  }

  /* ---------- Cadenas de prueba ---------- */
  function dibujarEjemplos() {
    const ej = ejemplos(pda);
    const llenar = (id, lista, clase) => {
      const caja = $(id); caja.innerHTML = '';
      lista.forEach(s => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip ' + clase; b.textContent = s;
        b.addEventListener('click', () => { $('cadena').value = s; cargar(); });
        caja.appendChild(b);
      });
    };
    llenar('ej-ok', ej.aceptadas, 'ok'); llenar('ej-no', ej.rechazadas, 'no');
  }

  /* ---------- Simulación ---------- */
  function cargar() {
    detener();
    pda.reiniciar($('cadena').value.trim());
    $('traza').innerHTML = '';
    pilaPrev = pda.pila.slice();                  // sin animación al cargar
    pintar(false);
  }

  function dar() {                                // un paso de la simulación
    const p = pda.paso();
    if (!p) return false;
    const pilaTxt = p.pila.slice().reverse().map(mostrar).join(' ');        // tope → fondo
    const fila = document.createElement('tr');
    fila.innerHTML = `<td>${p.n}</td><td>${p.desde} → ${p.hasta === null ? '✘' : p.hasta}</td><td>${p.simbolo}</td><td>${mostrar(p.tope)}</td>` +
                     `<td>${pilaTxt}</td><td>${p.restante || 'ε'}</td>`;
    $('traza').appendChild(fila);
    $('traza-caja').scrollTop = $('traza-caja').scrollHeight;
    pintar(true);
    return !pda.fin;
  }

  const intervalo = () => 1600 - Number($('vel').value) * 140;
  function alternarAuto() {
    if (temporizador) { detener(); return; }
    if (pda.fin) return;
    $('auto').textContent = '⏸ Pausa';
    temporizador = setInterval(() => { if (!dar()) detener(); }, intervalo());
  }
  function detener() {
    clearInterval(temporizador); temporizador = null;
    $('auto').textContent = '▶▶ Auto';
  }

  /* ---------- Pila: se compara con la anterior para animar solo lo que cambia ---------- */
  function bloque(s) {
    const b = document.createElement('div');
    b.className = 'bloque'; b.textContent = mostrar(s);
    return b;
  }
  function pintarPila(animar) {
    const caja = $('pila'), act = pda.pila.slice(), prev = pilaPrev;
    let k = 0;                                    // k = cuántos bloques de abajo no cambiaron
    while (k < prev.length && k < act.length && prev[k] === act[k]) k++;
    caja.innerHTML = '';
    act.forEach((s, i) => {
      const b = bloque(s);
      if (i === 0) b.classList.add('fondo');
      if (i === act.length - 1) b.classList.add('tope');
      if (animar && i >= k) b.classList.add('entra');                       // apilado: cae desde arriba
      caja.appendChild(b);
    });
    if (animar) for (let i = k; i < prev.length; i++) {                     // desapilado: sale por arriba
      const g = bloque(prev[i]);
      g.classList.add('sale'); g.style.setProperty('--i', i);
      caja.appendChild(g);
      setTimeout(() => g.remove(), 460);
    }
    pilaPrev = act;
  }

  function pintar(animar) {
    const ult = pda.pasos[pda.pasos.length - 1];
    // Diagrama: estado actual y última flecha usada
    document.querySelectorAll('.nodo').forEach(n => n.classList.toggle('activo', n.dataset.q === pda.actual));
    document.querySelectorAll('.arista').forEach(a => a.classList.remove('activa'));
    if (ult && ult.hasta) { const a = $(`ar-${ult.desde}-${ult.hasta}`); if (a) a.classList.add('activa'); }
    // Tabla δ: regla aplicada
    document.querySelectorAll('#delta tbody tr').forEach(tr =>
      tr.classList.toggle('act', !!ult && ult.regla !== null && Number(tr.dataset.i) === ult.regla));
    const fila = document.querySelector('#delta tr.act');
    if (fila) { const c = $('delta-caja'); c.scrollTop = fila.offsetTop - c.clientHeight / 2; }
    pintarPila(animar);
    // Cinta de entrada
    const cinta = $('cinta'), cad = pda.cadena, errorSim = !!ult && ult.hasta === null;
    cinta.innerHTML = '';
    const celda = (t, clase) => { const s = document.createElement('span'); s.className = 'celda ' + clase; s.textContent = t; cinta.appendChild(s); };
    if (cad.length === 0) celda('ε', 'hecho');
    [...cad].forEach((ch, i) => celda(ch, i < pda.pos ? 'hecho' : i === pda.pos ? (errorSim ? 'error' : 'actual') : 'futuro'));
    celda('fin', 'fin ' + (pda.pos === cad.length ? 'actual' : 'futuro'));
    // Información y resultado
    const tope = pda.pila[pda.pila.length - 1];
    $('info').innerHTML = `Estado: <b>${pda.actual}</b> · Siguiente símbolo: <b>${cad[pda.pos] === undefined ? 'fin' : cad[pda.pos]}</b> · Tope: <b>${mostrar(tope)}</b> · Leídos: <b>${pda.pos}</b> de <b>${cad.length}</b>`;
    const r = $('resultado');
    if (!pda.fin) { r.className = 'resultado espera'; r.textContent = pda.pasos.length === 0 ? 'Listo. Pulsa «Paso» o «Auto» para empezar.' : 'Procesando…'; }
    else if (pda.aceptada) { r.className = 'resultado ok'; r.textContent = '✔ CADENA ACEPTADA: ' + pda.motivo + '.'; }
    else { r.className = 'resultado no'; r.textContent = '✘ CADENA RECHAZADA: ' + pda.motivo + '.'; }
    $('paso').disabled = pda.fin; $('auto').disabled = pda.fin;
  }

  /* ---------- Eventos ---------- */
  sel.addEventListener('change', () => { mostrarParametro(); aplicarLenguaje(); });
  $('aplicar').addEventListener('click', aplicarLenguaje);
  $('param').addEventListener('keydown', e => { if (e.key === 'Enter') aplicarLenguaje(); });
  $('cargar').addEventListener('click', cargar);
  $('cadena').addEventListener('keydown', e => { if (e.key === 'Enter') cargar(); });
  $('paso').addEventListener('click', () => { detener(); dar(); });
  $('auto').addEventListener('click', alternarAuto);
  $('reiniciar').addEventListener('click', cargar);
  $('vel').addEventListener('input', () => { if (temporizador) { detener(); alternarAuto(); } });

  mostrarParametro();
  aplicarLenguaje();
})();
