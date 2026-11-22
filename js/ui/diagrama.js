/* ============================================================
   Diagrama de estados (SVG) compartido por los niveles.
   Recibe los estados y una lista de aristas ya agrupadas:
     aristas = [{ de, a, lineas: ['a, Z₀ / A Z₀', ...] }]   (una por par origen→destino)
   y dibuja: estados en círculo, flechas, bucles, estado inicial y finales.
   ============================================================ */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, padre) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  };

  function dibujarDiagrama(svg, estados, inicial, finales, aristas) {
    // Puntas de flecha de tamaño fijo (normal y resaltada)
    svg.innerHTML =
      '<defs>' +
      '<marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a8a9c"/></marker>' +
      '<marker id="flechaAct" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffc247"/></marker>' +
      '</defs>';
    const cx = 350, cy = 220, n = estados.length, R = n === 2 ? 150 : 120, r = 28;

    // Los estados se reparten en círculo; q0 queda a la izquierda.
    const pos = {};
    estados.forEach((q, i) => {
      const ang = Math.PI + 2 * Math.PI * i / n;
      pos[q] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), ang };
    });
    const existe = new Set(aristas.map(a => a.de + '|' + a.a));

    // Escribe varias líneas de texto centradas verticalmente en (x, y)
    const texto = (grupo, x, y, lineas, ancla) => {
      const k = lineas.length;
      lineas.forEach((t, i) => {
        const e = el('text', { x, y: y + (i - (k - 1) / 2) * 20, class: k > 1 ? 'm' : '' }, grupo);
        e.style.textAnchor = ancla || 'middle';
        e.textContent = t;
      });
    };

    for (const g of aristas) {
      const grupo = el('g', { class: 'arista', id: `ar-${g.de}-${g.a}` }, svg);
      const p = pos[g.de];
      if (g.de === g.a) {                                   // bucle hacia afuera del círculo
        const f = (da, d) => [p.x + d * Math.cos(p.ang + da), p.y + d * Math.sin(p.ang + da)];
        const [sx, sy] = f(-0.45, r), [ex, ey] = f(0.45, r);
        const [c1x, c1y] = f(-0.55, r + 50), [c2x, c2y] = f(0.55, r + 50), [tx, ty] = f(0, r + 46);
        el('path', { d: `M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}` }, grupo);
        const ux = Math.cos(p.ang);
        texto(grupo, tx, ty, g.lineas, ux < -0.3 ? 'end' : ux > 0.3 ? 'start' : 'middle');
      } else {                                              // flecha entre dos estados distintos
        const q = pos[g.a], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
        const hayVuelta = existe.has(g.a + '|' + g.de);     // ¿existe la transición inversa?
        let nx = -dy / len, ny = dx / len;
        const c = hayVuelta ? 38 : 0;                       // con vuelta se curva; sin vuelta, recta
        if (!hayVuelta && nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }   // etiqueta hacia afuera
        const kx = mx + nx * 2 * c, ky = my + ny * 2 * c;
        const unit = (ax, ay) => { const l = Math.hypot(ax, ay); return [ax / l, ay / l]; };
        const [ux, uy] = unit(kx - p.x, ky - p.y), [vx, vy] = unit(kx - q.x, ky - q.y);
        el('path', { d: `M${p.x + ux * r} ${p.y + uy * r} Q${kx} ${ky} ${q.x + vx * (r + 4)} ${q.y + vy * (r + 4)}` }, grupo);
        const d = c + (hayVuelta ? 14 : 20) + (g.lineas.length > 1 ? 10 : 0);
        texto(grupo, mx + nx * d, my + ny * d, g.lineas);
      }
    }

    // Flecha de entrada al estado inicial
    const q0 = pos[inicial], v = q0.ang + Math.PI / 2;
    el('path', { class: 'ini', 'marker-end': 'url(#flecha)',
      d: `M${q0.x + Math.cos(v) * (r + 40)} ${q0.y + Math.sin(v) * (r + 40)} L${q0.x + Math.cos(v) * (r + 4)} ${q0.y + Math.sin(v) * (r + 4)}` }, svg);

    // Estados (doble círculo = estado final)
    for (const q of estados) {
      const g = el('g', { class: 'nodo', 'data-q': q }, svg), p = pos[q];
      el('circle', { cx: p.x, cy: p.y, r }, g);
      if (finales.has(q)) el('circle', { cx: p.x, cy: p.y, r: r - 6, class: 'anillo' }, g);
      el('text', { x: p.x, y: p.y }, g).textContent = q;
    }
  }

  global.Chomsky = Object.assign(global.Chomsky || {}, { dibujarDiagrama });
})(window);
