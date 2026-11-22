/* ============================================================
   Interfaz común de los niveles con cinta (Nivel 1: ALA, Nivel 0: Turing)
   Chomsky.iniciarMaquina({ lenguajes, tipo }) con tipo = 'lba' (cinta acotada) o 'mt' (cinta infinita).
   Se encarga solo de DIBUJAR: cinta, estados, tabla δ, traza y controles.
   Toda la lógica de la máquina vive en js/core/lba.js y js/core/turing.js.
   ============================================================ */
(function (global) {
  'use strict';
  const $ = id => document.getElementById(id);
  const MOV = { D: 'D →', I: '← I', N: 'N' };
  const ANCHO = 7;                               // celdas visibles a cada lado del cabezal (cinta infinita)
  const CELDA = 50;                              // ancho de una celda + separación, en píxeles

  function iniciarMaquina(cfg) {
    const infinita = cfg.tipo === 'mt';
    let m, info, temporizador = null;            // m = máquina; info = lo que devolvió crear()

    /* ---------- Elección del lenguaje o función ---------- */
    const sel = $('lenguaje');
    cfg.lenguajes.forEach((l, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = l.nombre; sel.appendChild(o);
    });
    function mostrarParametro() {
      const l = cfg.lenguajes[sel.value];
      $('param-caja').hidden = !l.param;
      if (l.param) {
        $('param-etq').textContent = l.param.etiqueta + ' =';
        $('param').value = l.param.defecto;
        $('param-ayuda').textContent = '(' + l.param.ayuda + ')';
      }
    }
    function aplicarLenguaje() {
      detener();
      const l = cfg.lenguajes[sel.value];
      try { info = l.crear(l.param ? $('param').value.trim() : ''); }
      catch (e) { $('aviso').textContent = '⚠ ' + e.message; return; }
      $('aviso').textContent = '';
      m = info.maquina;
      $('descripcion').textContent = info.descripcion;
      dibujarDefinicion(); dibujarEstados(); dibujarTablaDelta(); dibujarEjemplos();
      $('cadena').value = info.cadenaInicial;
      cargar();
    }

    /* ---------- Definición formal, alfabetos y qué hace cada estado ---------- */
    function dibujarDefinicion() {
      const Q = m.estados.join(', '), S = m.alfabeto.join(', '), G = m.alfabetoCinta.join(', '), F = [...m.aceptacion].join(', ');
      $('tupla').textContent = infinita
        ? `M = (Q, Σ, Γ, δ, q₀, ␣, F)\nQ  = { ${Q} }\nΣ  = { ${S} }\nΓ  = { ${G} }\nq₀ = ${m.inicial}\n␣  = símbolo blanco\nF  = { ${F} }\nδ  : ver la tabla de transiciones`
        : `M = (Q, Σ, Γ, δ, q₀, ⊢, ⊣, F)\nQ  = { ${Q} }\nΣ  = { ${S} }\nΓ  = { ${G} }\nq₀ = ${m.inicial}\n⊢, ⊣ = delimitadores de la cinta\nF  = { ${F} }\nδ  : ver la tabla de transiciones`;
      $('notas').innerHTML = Object.entries(info.notas).map(([q, t]) => `<li><b>${q}</b> ${t}</li>`).join('');
      const chips = lista => lista.map(s => `<span class="g">${s}</span>`).join('');
      $('alfabetos').innerHTML = `<span class="ayuda">Entrada Σ:</span>${chips(m.alfabeto)}<span class="ayuda">Cinta Γ:</span>${chips(m.alfabetoCinta)}`;
    }
    function dibujarEstados() {
      $('estados').innerHTML = m.estados.map(q => `<span class="est${m.aceptacion.has(q) ? ' acepta' : ''}" data-q="${q}">${q}</span>`).join('');
    }
    function dibujarTablaDelta() {
      let h = '<thead><tr><th>Estado</th><th>Lee</th><th>Escribe</th><th>Mueve</th><th>Pasa a</th></tr></thead><tbody>';
      m.reglas.forEach((r, i) => { h += `<tr data-i="${i}"><td>${r.de}</td><td>${r.lee}</td><td>${r.escribe}</td><td>${MOV[r.mueve]}</td><td>${r.a}</td></tr>`; });
      $('delta').innerHTML = h + '</tbody>';
    }

    /* ---------- Cadenas de prueba ---------- */
    function dibujarEjemplos() {
      const funcion = info.tipo === 'funcion';
      $('ej-ok-etq').textContent = funcion ? 'Entradas válidas:' : 'Aceptadas:';
      $('ej-no-etq').textContent = funcion ? 'No válidas:' : 'Rechazadas:';
      const llenar = (id, lista, clase) => {
        const caja = $(id); caja.innerHTML = '';
        lista.forEach(s => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip ' + clase; b.textContent = s;
          b.addEventListener('click', () => { $('cadena').value = s; cargar(); });
          caja.appendChild(b);
        });
      };
      llenar('ej-ok', info.aceptadas, 'ok'); llenar('ej-no', info.rechazadas, 'no');
    }

    /* ---------- Simulación ---------- */
    function cargar() {
      detener();
      m.reiniciar($('cadena').value.trim());
      $('traza').innerHTML = '';
      pintar(false);
    }
    function agregarFila(p) {
      const fila = document.createElement('tr');
      fila.innerHTML = `<td>${p.n}</td><td>${p.desde} → ${p.hasta === null ? '✘' : p.hasta}</td><td>${p.lee}</td><td>${p.escribe}</td><td>${p.mueve ? MOV[p.mueve] : '—'}</td><td class="cinta-txt">${p.cinta}</td>`;
      $('traza').appendChild(fila);
    }
    function dar() {                             // un paso
      const p = m.paso();
      if (!p) return false;
      agregarFila(p);
      $('traza-caja').scrollTop = $('traza-caja').scrollHeight;
      pintar(true);
      return !m.fin;
    }
    function terminar() {                        // ejecutar hasta el final sin animar cada paso
      detener();
      for (let g = 0; !m.fin && g < 6000; g++) agregarFila(m.paso());
      $('traza-caja').scrollTop = $('traza-caja').scrollHeight;
      pintar(false);
    }
    const intervalo = () => 1600 - Number($('vel').value) * 140;
    function alternarAuto() {
      if (temporizador) { detener(); return; }
      if (m.fin) return;
      $('auto').textContent = '⏸ Pausa';
      temporizador = setInterval(() => { if (!dar()) detener(); }, intervalo());
    }
    function detener() { clearInterval(temporizador); temporizador = null; $('auto').textContent = '▶▶ Auto'; }

    /* ---------- Dibujo de la cinta ---------- */
    const celda = (t, clase) => { const s = document.createElement('span'); s.className = 'celda ' + clase; s.textContent = t; return s; };

    function pintarCintaAcotada(ult) {           // todas las celdas a la vista, con los muros ⊢ y ⊣
      const c = $('cinta'); c.innerHTML = '';
      let activa = null;
      m.cinta.forEach((s, i) => {
        let clase = (s === '⊢' || s === '⊣') ? 'muro' : (m.alfabeto.includes(s) ? '' : 'marca');
        if (i === m.cabezal) clase += (m.fin && !m.aceptada) ? ' error' : ' actual';
        if (ult && ult.pos === i && ult.escribe !== ult.lee) clase += ' escribe';      // celda recién reescrita
        const e = celda(s, clase); c.appendChild(e);
        if (i === m.cabezal) activa = e;
      });
      if (activa) c.scrollLeft = activa.offsetLeft - c.clientWidth / 2;
    }

    function pintarCintaInfinita(ult, animar) {  // ventana centrada en el cabezal; la cinta se desliza
      const c = $('cinta'); c.innerHTML = '';
      const fila = document.createElement('div'); fila.className = 'fila-cinta';
      const quedoEscrita = ult && ult.escribe !== ult.lee ? ult.pos : null;
      for (let d = -ANCHO; d <= ANCHO; d++) {
        const pos = m.cabezal + d, s = m.leer(pos);
        let clase = d === 0 ? ((m.fin && !m.aceptada) ? 'error actual' : 'actual') : '';
        if (s === m.blanco && (pos < m.min || pos > m.max)) clase += ' fuera';         // blanco nunca visitado
        if (pos === quedoEscrita) clase += ' escribe';
        fila.appendChild(celda(s, clase));
      }
      c.appendChild(fila);
      if (animar && ult && (ult.mueve === 'D' || ult.mueve === 'I')) {                  // desliza una celda
        fila.style.transform = `translateX(${ult.mueve === 'D' ? CELDA : -CELDA}px)`;
        void fila.offsetWidth;
        fila.style.transition = 'transform .25s ease-out'; fila.style.transform = 'none';
      }
    }

    function pintar(animar) {
      const ult = m.pasos[m.pasos.length - 1];
      document.querySelectorAll('#estados .est').forEach(e => e.classList.toggle('activo', e.dataset.q === m.actual));
      document.querySelectorAll('#delta tbody tr').forEach(tr =>
        tr.classList.toggle('act', !!ult && ult.regla !== null && Number(tr.dataset.i) === ult.regla));
      const fila = document.querySelector('#delta tr.act');
      if (fila) { const c = $('delta-caja'); c.scrollTop = fila.offsetTop - c.clientHeight / 2; }
      infinita ? pintarCintaInfinita(ult, animar) : pintarCintaAcotada(ult);

      const lee = infinita ? m.leer(m.cabezal) : m.cinta[m.cabezal];
      $('info').innerHTML = infinita
        ? `Estado activo: <b>${m.actual}</b> · Cabezal en la posición <b>${m.cabezal}</b> · Lee: <b>${lee}</b> · Pasos: <b>${m.pasos.length}</b>`
        : `Estado activo: <b>${m.actual}</b> · Celda <b>${m.cabezal}</b> de <b>${m.cinta.length - 1}</b> · Lee: <b>${lee}</b> · Pasos: <b>${m.pasos.length}</b>`;

      const r = $('resultado'), funcion = info.tipo === 'funcion';
      if (!m.fin) { r.className = 'resultado espera'; r.textContent = m.pasos.length === 0 ? 'Listo. Pulsa «Paso», «Auto» o «Hasta el final».' : 'Procesando…'; }
      else if (m.aceptada) {
        r.className = 'resultado ok';
        if (funcion) { const s = m.resultado(); r.textContent = `✔ MÁQUINA DETENIDA: ${m.motivo}. Resultado en la cinta: «${s || '(vacía)'}»${info.interpretar ? ' (' + info.interpretar(s) + ')' : ''}.`; }
        else r.textContent = '✔ CADENA ACEPTADA: ' + m.motivo + '.';
      } else { r.className = 'resultado no'; r.textContent = (funcion ? '✘ ENTRADA NO VÁLIDA: ' : '✘ CADENA RECHAZADA: ') + m.motivo + '.'; }
      $('paso').disabled = m.fin; $('auto').disabled = m.fin; $('fin').disabled = m.fin;
    }

    /* ---------- Eventos ---------- */
    sel.addEventListener('change', () => { mostrarParametro(); aplicarLenguaje(); });
    $('aplicar').addEventListener('click', aplicarLenguaje);
    $('param').addEventListener('keydown', e => { if (e.key === 'Enter') aplicarLenguaje(); });
    $('cargar').addEventListener('click', cargar);
    $('cadena').addEventListener('keydown', e => { if (e.key === 'Enter') cargar(); });
    $('paso').addEventListener('click', () => { detener(); dar(); });
    $('auto').addEventListener('click', alternarAuto);
    $('fin').addEventListener('click', terminar);
    $('reiniciar').addEventListener('click', cargar);
    $('vel').addEventListener('input', () => { if (temporizador) { detener(); alternarAuto(); } });

    mostrarParametro();
    aplicarLenguaje();
  }

  global.Chomsky = Object.assign(global.Chomsky || {}, { iniciarMaquina });
})(window);
