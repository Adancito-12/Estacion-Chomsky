/* ============================================================
   Interfaz del Nivel 3 (CAM 3): autómata finito
   Usa el motor de js/core/afd.js y se encarga solo de dibujar:
   diagrama de estados, cinta, tabla δ, traza y controles.
   ============================================================ */
(() => {
  'use strict';
  const { LENGUAJES, ejemplos, dibujarDiagrama: dibujarSVG } = window.Chomsky;
  const $ = id => document.getElementById(id);
  let afd, temporizador = null;

  /* ---------- Elección del lenguaje (predeterminado o parametrizable) ---------- */
  const sel = $('lenguaje');
  LENGUAJES.forEach((l, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = l.nombre; sel.appendChild(o);
  });

  function mostrarParametro() {
    const l = LENGUAJES[sel.value];
    $('param-caja').hidden = !l.param;
    if (l.param) {
      $('param-etq').textContent = l.param.etiqueta + ' =';
      $('param').value = l.param.defecto;
      $('param-ayuda').textContent = '(' + l.param.ayuda + ')';
    }
  }

  function aplicarLenguaje() {
    detener();
    const l = LENGUAJES[sel.value];
    let creado;
    try { creado = l.crear(l.param ? $('param').value.trim() : ''); }
    catch (e) { $('aviso').textContent = '⚠ ' + e.message; return; }
    $('aviso').textContent = '';
    afd = creado.afd;
    $('descripcion').textContent = creado.descripcion;
    dibujarDefinicion(); dibujarDiagrama(); dibujarTablaDelta(); dibujarEjemplos();
    $('cadena').value = ejemplos(afd).aceptadas[0] || '';
    cargar();
  }

  /* ---------- Definición formal que cambia con el lenguaje ---------- */
  function dibujarDefinicion() {
    $('tupla').textContent =
      'M = (Q, Σ, δ, q₀, F)\n' +
      'Q  = { ' + afd.estados.join(', ') + ' }\n' +
      'Σ  = { ' + afd.alfabeto.join(', ') + ' }\n' +
      'q₀ = ' + afd.inicial + '\n' +
      'F  = { ' + [...afd.finales].join(', ') + ' }\n' +
      'δ  : ver la tabla de transiciones';
  }

  /* ---------- Diagrama de estados (lo dibuja js/ui/diagrama.js) ---------- */
  function dibujarDiagrama() {
    // Los símbolos que comparten origen y destino se unen en una sola flecha ("0, 1").
    const grupos = {};
    for (const q of afd.estados) for (const a of afd.alfabeto) {
      const t = afd.delta[q][a], k = q + '|' + t;
      (grupos[k] = grupos[k] || { de: q, a: t, simbolos: [] }).simbolos.push(a);
    }
    const aristas = Object.values(grupos).map(g => ({ de: g.de, a: g.a, lineas: [g.simbolos.join(', ')] }));
    dibujarSVG($('diagrama'), afd.estados, afd.inicial, afd.finales, aristas);
  }

  /* ---------- Tabla de transiciones δ ---------- */
  function dibujarTablaDelta() {
    let h = '<tr><th>δ</th>' + afd.alfabeto.map(a => `<th>${a}</th>`).join('') + '</tr>';
    for (const q of afd.estados) {
      const marca = (q === afd.inicial ? '→' : '') + (afd.finales.has(q) ? '*' : '');
      h += `<tr><th>${marca}${q}</th>` + afd.alfabeto.map(a => `<td data-q="${q}" data-a="${a}">${afd.delta[q][a]}</td>`).join('') + '</tr>';
    }
    $('delta').innerHTML = h;
  }

  /* ---------- Cadenas de prueba (chips) ---------- */
  function dibujarEjemplos() {
    const ej = ejemplos(afd);
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
    afd.reiniciar($('cadena').value.trim());
    $('traza').innerHTML = '';
    pintar();
  }

  function dar() {                                          // un paso de la simulación
    const p = afd.paso();
    if (!p) return false;
    const fila = document.createElement('tr');
    fila.innerHTML = `<td>${p.n}</td><td>${p.desde}</td><td>${p.simbolo}</td><td>${p.hasta === null ? '— sin transición —' : p.hasta}</td>`;
    $('traza').appendChild(fila);
    $('traza-caja').scrollTop = $('traza-caja').scrollHeight;
    pintar();
    return !afd.fin;
  }

  const intervalo = () => 1600 - Number($('vel').value) * 140;
  function alternarAuto() {
    if (temporizador) { detener(); return; }
    if (afd.fin) return;
    $('auto').textContent = '⏸ Pausa';
    temporizador = setInterval(() => { if (!dar()) detener(); }, intervalo());
  }
  function detener() {
    clearInterval(temporizador); temporizador = null;
    $('auto').textContent = '▶▶ Auto';
  }

  function pintar() {
    const ult = afd.pasos[afd.pasos.length - 1];
    // Diagrama: estado actual y última transición usada
    document.querySelectorAll('.nodo').forEach(n => n.classList.toggle('activo', n.dataset.q === afd.actual));
    document.querySelectorAll('.arista').forEach(a => a.classList.remove('activa'));
    if (ult && ult.hasta) { const a = $(`ar-${ult.desde}-${ult.hasta}`); if (a) a.classList.add('activa'); }
    // Tabla δ: celda aplicada
    document.querySelectorAll('#delta td').forEach(td =>
      td.classList.toggle('act', !!ult && td.dataset.q === ult.desde && td.dataset.a === ult.simbolo));
    // Cinta con la cadena
    const cinta = $('cinta'), cad = afd.cadena, errorSim = !!ult && ult.hasta === null;
    cinta.innerHTML = '';
    const celda = (t, clase) => { const s = document.createElement('span'); s.className = 'celda ' + clase; s.textContent = t; cinta.appendChild(s); };
    if (cad.length === 0) celda('ε', 'hecho');
    [...cad].forEach((ch, i) => celda(ch, i < afd.pos ? 'hecho' : i === afd.pos ? (errorSim ? 'error' : 'actual') : 'futuro'));
    celda('fin', 'fin ' + (afd.pos === cad.length ? 'actual' : 'futuro'));
    // Estado e información
    $('info').innerHTML = `Estado actual: <b>${afd.actual}</b> · Siguiente símbolo: <b>${cad[afd.pos] === undefined ? 'fin' : cad[afd.pos]}</b> · Leídos: <b>${afd.pos}</b> de <b>${cad.length}</b>`;
    // Resultado
    const r = $('resultado');
    if (!afd.fin) { r.className = 'resultado espera'; r.textContent = afd.pos === 0 ? 'Listo. Pulsa «Paso» o «Auto» para leer el primer símbolo.' : 'Leyendo la cadena…'; }
    else if (afd.aceptada) { r.className = 'resultado ok'; r.textContent = '✔ CADENA ACEPTADA: ' + afd.motivo + '.'; }
    else { r.className = 'resultado no'; r.textContent = '✘ CADENA RECHAZADA: ' + afd.motivo + '.'; }
    $('paso').disabled = afd.fin; $('auto').disabled = afd.fin;
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
