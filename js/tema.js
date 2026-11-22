/* Tema claro / oscuro.
   Se recuerda con localStorage (dentro de try/catch por si el navegador lo bloquea)
   y, si no hay elección guardada, sigue la preferencia del sistema. */
(function () {
  'use strict';
  const raiz = document.documentElement;
  let tema = null;
  try { tema = localStorage.getItem('chomsky-tema'); } catch (e) { /* sin almacenamiento */ }
  if (tema !== 'claro' && tema !== 'oscuro') {
    tema = matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
  }
  raiz.dataset.tema = tema;                       // se aplica antes de pintar, sin parpadeo

  document.addEventListener('DOMContentLoaded', () => {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    const boton = document.createElement('button');
    boton.type = 'button'; boton.className = 'tema-btn';
    const etiqueta = () => {
      const claro = raiz.dataset.tema === 'claro';
      boton.textContent = claro ? '☾ VISTA OSCURA' : '☀ VISTA CLARA';
      boton.setAttribute('aria-label', claro ? 'Cambiar a vista oscura' : 'Cambiar a vista clara');
    };
    boton.addEventListener('click', () => {
      raiz.dataset.tema = raiz.dataset.tema === 'claro' ? 'oscuro' : 'claro';
      try { localStorage.setItem('chomsky-tema', raiz.dataset.tema); } catch (e) { /* ignorar */ }
      etiqueta();
    });
    etiqueta();
    hud.appendChild(boton);
  });
})();
