/* Estación Chomsky · Paso 1 (v3): portada "turno de noche"
   - Arranque tipo consola, título con letras que caen y la O que suena
   - Reloj de la noche, estática en los monitores (canvas)
   - Botones de nivel (aviso por ahora; se conectan en los pasos 2 a 5) */
(() => {
  'use strict';
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Sonido de la O (sintetizado, sin archivos) ----------
  let audio;
  function bocina() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(260, t + 0.18);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.3);
    } catch (e) { /* sin audio disponible */ }
  }

  // ---------- Título: una letra por elemento; la O (posición 1) es un botón ----------
  const titulo = document.querySelector('.title__big');
  const letras = [...titulo.textContent.trim()];
  const posO = letras.indexOf('O');                     // la O de CHOMSKY es el botón de la bocina
  titulo.textContent = '';
  letras.forEach((l, i) => {
    const el = document.createElement(i === posO ? 'button' : 'span');
    el.textContent = l; el.dataset.l = l;
    el.style.animationDelay = `${i * 0.1}s, ${1.4 + i * 0.12}s`;
    if (i === posO) {
      el.type = 'button'; el.setAttribute('aria-label', 'Tocar la bocina');
      el.addEventListener('click', () => {
        bocina(); el.classList.remove('toca'); void el.offsetWidth; el.classList.add('toca');
      });
    } else el.setAttribute('aria-hidden', 'true');
    titulo.appendChild(el);
  });
  titulo.style.visibility = 'hidden';

  // ---------- Arranque ----------
  const boot = document.getElementById('boot'), salida = document.getElementById('boot-text');
  const lineas = ['> SISTEMA DE VIGILANCIA v1.0', '> TURNO DE NOCHE: 12:00 AM', '> CAM 3 ........ EN LÍNEA', '> CAM 2 ........ EN LÍNEA',
                  '> CAM 1 ........ EN LÍNEA', '> CAM 0 ........ EN LÍNEA', '> PRESIONA CUALQUIER TECLA'];
  let terminado = false;
  function mostrarPortada() {
    if (terminado) return; terminado = true;
    try { sessionStorage.setItem('chomsky-boot', '1'); } catch (e) {}
    boot.classList.add('off'); titulo.style.visibility = 'visible';
  }
  let visto = false;
  try { visto = sessionStorage.getItem('chomsky-boot') === '1'; } catch (e) {}
  if (reducir || visto) { boot.classList.add('off'); titulo.style.visibility = 'visible'; terminado = true; }
  else {
    let i = 0;
    const tick = setInterval(() => {
      if (i < lineas.length) salida.textContent += lineas[i++] + '\n';
      else { clearInterval(tick); setTimeout(mostrarPortada, 500); }
    }, 380);
    boot.addEventListener('click', mostrarPortada);
    addEventListener('keydown', mostrarPortada, { once: true });
  }

  // ---------- Reloj de la noche: 12 AM a 6 AM, una hora cada 20 s ----------
  const reloj = document.getElementById('reloj');
  const horas = ['12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM', '6:00 AM'];
  let h = 0;
  if (!reducir) setInterval(() => { if (h < horas.length - 1) reloj.textContent = horas[++h]; }, 20000);

  // ---------- Estática de los monitores ----------
  const pantallas = [...document.querySelectorAll('.cam canvas')].map(c => {
    c.width = 96; c.height = 72;
    const x = c.getContext('2d');
    return { x, img: x.createImageData(96, 72) };
  });
  function estatica() {
    const rafaga = Math.random() < 0.04;           // de vez en cuando, interferencia fuerte
    for (const { x, img } of pantallas) {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i + 1] = d[i + 2] = Math.random() * 255;
        d[i + 3] = rafaga ? 150 : Math.random() * 50;
      }
      x.putImageData(img, 0, 0);
    }
  }
  estatica();
  if (!reducir) setInterval(estatica, 90);

  // ---------- Cinta de la CAM 0 (celdas repetidas) ----------
  const cinta = document.getElementById('cinta0');
  for (let i = 0; i < 13; i++) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', -14 + 14 * i); r.setAttribute('y', 20);
    r.setAttribute('width', 14); r.setAttribute('height', 16);
    cinta.appendChild(r);
  }

  // ---------- Datos de cada modelo (alimentan la ficha de cada cámara) ----------
  const datos = {
    3: { color: '#4de8ff', paso: 2, nombre: 'Autómata finito', tipo: 'Tipo 3 · Lenguajes regulares',
         como: 'Lee la cadena de izquierda a derecha, un símbolo a la vez. Solo recuerda en qué estado está.',
         memoria: 'Ninguna: apenas el estado actual.',
         lenguaje: 'L = cadenas binarias con número par de 1s',
         ejemplos: [['1010', 1], ['11', 1], ['0', 1], ['111', 0], ['10', 0]] },
    2: { color: '#9b7bff', paso: 3, nombre: 'Autómata de pila', tipo: 'Tipo 2 · Lenguajes libres de contexto',
         como: 'Además del estado tiene una pila: apila una marca por cada a y desapila una por cada b.',
         memoria: 'Una pila (último en entrar, primero en salir). Solo se toca la cima.',
         lenguaje: 'L = { aⁿbⁿ | n ≥ 1 }',
         ejemplos: [['ab', 1], ['aabb', 1], ['aaabbb', 1], ['aab', 0], ['ba', 0]] },
    1: { color: '#ffc247', paso: 4, nombre: 'Autómata linealmente acotado', tipo: 'Tipo 1 · Lenguajes sensibles al contexto',
         como: 'Trabaja en una cinta que mide justo lo que la entrada, con marcas de borde ⊢ y ⊣. El cabezal va y viene y puede reescribir.',
         memoria: 'La cinta de la entrada, ni una celda más.',
         lenguaje: 'L = { aⁿbⁿcⁿ | n ≥ 1 }',
         ejemplos: [['abc', 1], ['aabbcc', 1], ['aabbc', 0], ['abcc', 0], ['acb', 0]] },
    0: { color: '#ff5c8a', paso: 5, nombre: 'Máquina de Turing', tipo: 'Tipo 0 · Lenguajes recursivamente enumerables',
         como: 'Cinta infinita hacia ambos lados, un cabezal que lee, escribe y se mueve, y un conjunto de estados. Acepta cadenas o calcula funciones.',
         memoria: 'Cinta ilimitada que se puede leer y reescribir.',
         lenguaje: 'Suma unaria: 1ᵃ+1ᵇ → 1ᵃ⁺ᵇ',
         ejemplos: [['11+111', 1, '→ 11111'], ['1+1', 1, '→ 11'], ['111+', 1, '→ 111'], ['1++1', 0, 'formato inválido']] }
  };
  const $ = id => document.getElementById(id);

  // ---------- Ficha de la cámara (mini interfaz con ejemplos) ----------
  const ficha = $('ficha');
  let actual = 3;
  function abrirFicha(n) {
    const d = datos[n]; actual = n;
    ficha.style.setProperty('--c', d.color);
    $('f-tag').textContent = 'CAM ' + n;
    $('f-nombre').textContent = d.nombre;
    $('f-tipo').textContent = d.tipo;
    $('f-como').textContent = d.como;
    $('f-mem').textContent = d.memoria;
    $('f-leng').textContent = d.lenguaje;
    $('f-ej').innerHTML = d.ejemplos.map(([t, ok, nota]) =>
      '<li class="' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✔' : '✘') + '</b><code>' + t + '</code>' + (nota ? ' <span>' + nota + '</span>' : '') + '</li>').join('');
    ficha.showModal();
  }
  $('f-x').addEventListener('click', () => ficha.close());
  ficha.addEventListener('click', e => {          // clic fuera del recuadro cierra
    const r = ficha.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ficha.close();
  });

  // ---------- Nivel (definición y simulación; se construye en los pasos 2 a 5) ----------
  const dlg = $('dlg');
  function abrirNivel(n) {
    location.href = 'nivel-' + n + '.html'; return;   // los 4 niveles ya están disponibles
    $('dlg-title').textContent = 'Nivel ' + n + ': ' + datos[n].nombre;
    $('dlg-text').textContent = 'La definición y la simulación de este nivel se activan en el paso ' + datos[n].paso + ' del proyecto.';
    dlg.showModal();
  }
  $('dlg-close').addEventListener('click', () => dlg.close());
  $('f-ir').addEventListener('click', () => { ficha.close(); abrirNivel(actual); });

  document.querySelectorAll('.cam').forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.cam)));
  document.querySelectorAll('.btn[data-level]').forEach(b =>
    b.addEventListener('click', e => { e.preventDefault(); abrirNivel(b.dataset.level); }));
  addEventListener('keydown', e => { if (terminado && !dlg.open && !ficha.open && datos[e.key]) abrirFicha(e.key); });
})();
