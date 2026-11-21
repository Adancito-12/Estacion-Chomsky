/* Estación Chomsky · Paso 1: portada
   - Cielo de estrellas parpadeantes (canvas)
   - Letras del título con salto escalonado
   - Botones de nivel (por ahora muestran un aviso; se conectan en los pasos 2 a 5) */
(() => {
  'use strict';

  // ---------- Estrellas ----------
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colores = ['#ffffff', '#4de8ff', '#ffc247'];
  let estrellas = [];

  function crearEstrellas() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const cantidad = Math.floor((canvas.width * canvas.height) / 6000);
    estrellas = Array.from({ length: cantidad }, () => ({
      x: Math.floor(Math.random() * canvas.width),
      y: Math.floor(Math.random() * canvas.height),
      t: Math.random() < 0.15 ? 4 : 2,          // tamaño en píxeles
      fase: Math.random() * Math.PI * 2,
      vel: 0.5 + Math.random() * 1.5,
      color: colores[Math.floor(Math.random() * colores.length)]
    }));
  }

  function dibujar(ms) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const e of estrellas) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin((ms / 1000) * e.vel + e.fase));
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.t, e.t);
    }
    if (!reducir) requestAnimationFrame(dibujar);
  }

  addEventListener('resize', () => { crearEstrellas(); if (reducir) dibujar(0); });
  crearEstrellas();
  dibujar(0);

  // ---------- Título: una letra por <span> ----------
  const titulo = document.querySelector('.title__big');
  const texto = titulo.textContent.trim();
  titulo.textContent = '';
  [...texto].forEach((letra, i) => {
    const s = document.createElement('span');
    s.textContent = letra;
    s.setAttribute('aria-hidden', 'true');
    s.style.animationDelay = `${i * 0.12}s`;
    titulo.appendChild(s);
  });

  // ---------- Niveles ----------
  const niveles = {
    3: { nombre: 'Nivel 3: Autómata finito', paso: 2 },
    2: { nombre: 'Nivel 2: Autómata de pila', paso: 3 },
    1: { nombre: 'Nivel 1: Autómata linealmente acotado', paso: 4 },
    0: { nombre: 'Nivel 0: Máquina de Turing', paso: 5 }
  };
  const dlg = document.getElementById('dlg');

  function abrirNivel(n) {
    const info = niveles[n];
    document.getElementById('dlg-title').textContent = info.nombre;
    document.getElementById('dlg-text').textContent =
      `Este nivel está en construcción. Se desbloquea en el paso ${info.paso} del proyecto.`;
    dlg.showModal();
  }

  document.querySelectorAll('[data-level]').forEach(btn =>
    btn.addEventListener('click', e => { e.preventDefault(); abrirNivel(btn.dataset.level); })
  );
  document.getElementById('dlg-close').addEventListener('click', () => dlg.close());

  addEventListener('keydown', e => {
    if (!dlg.open && niveles[e.key]) abrirNivel(e.key);
  });
})();
