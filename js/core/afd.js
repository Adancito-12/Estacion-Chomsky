/* ============================================================
   Motor del AFD (Autómata Finito Determinista) · Nivel 3
   Módulo puro: no toca el DOM, así se puede probar por separado.
   Un AFD es la 5-tupla M = (Q, Σ, δ, q0, F):
     Q = estados, Σ = alfabeto, δ = función de transición,
     q0 = estado inicial, F = estados finales (de aceptación).
   ============================================================ */
(function (global) {
  'use strict';

  class AFD {
    constructor({ estados, alfabeto, inicial, finales, delta }) {
      this.estados = estados;            // Q
      this.alfabeto = alfabeto;          // Σ
      this.inicial = inicial;            // q0
      this.finales = new Set(finales);   // F
      this.delta = delta;                // δ: delta[q][a] = q'
      this.reiniciar('');
    }

    /** Prepara una nueva simulación con la cadena dada. */
    reiniciar(cadena) {
      this.cadena = cadena;
      this.pos = 0;                      // cuántos símbolos se han consumido
      this.actual = this.inicial;        // estado actual
      this.pasos = [];                   // historial para la traza
      this.fin = false; this.aceptada = false; this.motivo = '';
      this._cerrarSiTermino();
    }

    /** Lee UN símbolo y aplica δ. Devuelve el registro del paso (o null si ya terminó). */
    paso() {
      if (this.fin) return null;
      const simbolo = this.cadena[this.pos], desde = this.actual;
      const hasta = (this.delta[desde] || {})[simbolo];
      const registro = { n: this.pasos.length + 1, desde, simbolo, hasta: hasta === undefined ? null : hasta };
      this.pasos.push(registro);
      if (hasta === undefined) {         // símbolo fuera de Σ: no hay transición
        this.fin = true; this.aceptada = false;
        this.motivo = `el símbolo «${simbolo}» no pertenece al alfabeto Σ`;
        return registro;
      }
      this.actual = hasta; this.pos++;
      this._cerrarSiTermino();
      return registro;
    }

    /** Al agotar la cadena: se acepta si el estado actual está en F. */
    _cerrarSiTermino() {
      if (this.pos < this.cadena.length) return;
      this.fin = true;
      this.aceptada = this.finales.has(this.actual);
      this.motivo = this.aceptada
        ? `la cadena terminó en ${this.actual}, que es un estado final (∈ F)`
        : `la cadena terminó en ${this.actual}, que no es un estado final (∉ F)`;
    }

    /** Evaluación directa (sin animación). Sirve para generar ejemplos y para pruebas. */
    acepta(cadena) {
      let q = this.inicial;
      for (const c of cadena) { q = (this.delta[q] || {})[c]; if (q === undefined) return false; }
      return this.finales.has(q);
    }
  }

  /* ---------- Constructores de autómatas ---------- */

  /** Cantidad de 1s múltiplo de k: los estados cuentan los 1s módulo k. */
  function cuentaMultiplo(k) {
    const estados = Array.from({ length: k }, (_, i) => 'q' + i), delta = {};
    estados.forEach((q, i) => { delta[q] = { '0': q, '1': estados[(i + 1) % k] }; });
    return new AFD({ estados, alfabeto: ['0', '1'], inicial: 'q0', finales: ['q0'], delta });
  }

  /** Contiene la subcadena w: el estado j = "ya vi los primeros j símbolos de w" (idea de KMP). */
  function contiene(w) {
    const alfabeto = [...new Set(w)].sort(), m = w.length, fallo = [0];
    for (let i = 1; i < m; i++) {                       // función de fallo
      let k = fallo[i - 1];
      while (k > 0 && w[i] !== w[k]) k = fallo[k - 1];
      if (w[i] === w[k]) k++;
      fallo[i] = k;
    }
    const estados = Array.from({ length: m + 1 }, (_, i) => 'q' + i), delta = {};
    for (let j = 0; j <= m; j++) {
      delta['q' + j] = {};
      for (const c of alfabeto) {
        if (j === m) { delta['q' + j][c] = 'q' + m; continue; }   // ya encontrada: se queda
        let k = j;
        while (k > 0 && w[k] !== c) k = fallo[k - 1];
        if (w[k] === c) k++;
        delta['q' + j][c] = 'q' + k;
      }
    }
    return new AFD({ estados, alfabeto, inicial: 'q0', finales: ['q' + m], delta });
  }

  /** Termina en 01: q0 = nada útil, q1 = el último símbolo fue 0, q2 = terminó en 01. */
  function terminaEn01() {
    return new AFD({
      estados: ['q0', 'q1', 'q2'], alfabeto: ['0', '1'], inicial: 'q0', finales: ['q2'],
      delta: { q0: { '0': 'q1', '1': 'q0' }, q1: { '0': 'q1', '1': 'q2' }, q2: { '0': 'q1', '1': 'q0' } }
    });
  }

  /** Número binario múltiplo de 3: el estado guarda el residuo mod 3 (leer b: r' = (2r + b) mod 3). */
  function binarioMultiplo3() {
    const delta = {};
    for (let r = 0; r < 3; r++) delta['q' + r] = { '0': 'q' + ((2 * r) % 3), '1': 'q' + ((2 * r + 1) % 3) };
    return new AFD({ estados: ['q0', 'q1', 'q2'], alfabeto: ['0', '1'], inicial: 'q0', finales: ['q0'], delta });
  }

  /* ---------- Lenguajes disponibles en la interfaz ---------- */
  const LENGUAJES = [
    { id: 'cuenta', nombre: 'Cantidad de 1s múltiplo de k',
      param: { etiqueta: 'k', defecto: '2', ayuda: 'entero de 2 a 6' },
      crear(p) {
        const k = Number(p);
        if (!Number.isInteger(k) || k < 2 || k > 6) throw new Error('k debe ser un entero entre 2 y 6.');
        return { afd: cuentaMultiplo(k), descripcion: `L = { w ∈ {0,1}* | la cantidad de 1s en w es múltiplo de ${k} }` };
      } },
    { id: 'contiene', nombre: 'Contiene la subcadena w',
      param: { etiqueta: 'w', defecto: 'aba', ayuda: '1 a 5 símbolos, sin espacios' },
      crear(p) {
        if (!/^\S{1,5}$/.test(p)) throw new Error('w debe tener de 1 a 5 símbolos, sin espacios.');
        return { afd: contiene(p), descripcion: `L = { x ∈ Σ* | «${p}» es subcadena de x }, con Σ = { ${[...new Set(p)].sort().join(', ')} }` };
      } },
    { id: 'termina01', nombre: 'Termina en 01', param: null,
      crear() { return { afd: terminaEn01(), descripcion: 'L = { w ∈ {0,1}* | w termina en 01 }' }; } },
    { id: 'mult3', nombre: 'Binario múltiplo de 3', param: null,
      crear() { return { afd: binarioMultiplo3(), descripcion: 'L = { w ∈ {0,1}* | w, leído como número binario, es múltiplo de 3 }' }; } }
  ];

  /** Cadenas de prueba: recorre las cadenas cortas y toma algunas aceptadas y algunas rechazadas.
      Sirve para cualquier modelo que tenga .alfabeto y .acepta(cadena) (AFD, autómata de pila...). */
  function ejemplos(modelo, cuantas = 4) {
    const k = modelo.alfabeto.length;
    let maxLong = 8;                                   // se acorta si hay demasiadas combinaciones
    while (maxLong > 4 && Math.pow(k, maxLong) > 30000) maxLong--;
    let nivel = [''], ok = [], no = [];
    for (let l = 1; l <= maxLong; l++) {
      nivel = nivel.flatMap(s => modelo.alfabeto.map(c => s + c));
      if (l < 2) continue;
      for (const s of nivel) (modelo.acepta(s) ? ok : no).push(s);
    }
    // Se prefieren cadenas que usen todos los símbolos y se reparten entre cortas y largas.
    const tomar = (lista) => {
      const completas = lista.filter(s => new Set(s).size === k);
      const base = completas.length >= cuantas ? completas : lista;
      if (base.length <= cuantas) return base;
      const largos = [...new Set(base.map(s => s.length))];
      const elegidas = [];
      for (let i = 0; i < cuantas; i++) {
        const grupo = base.filter(s => s.length === largos[Math.floor(i * largos.length / cuantas)]);
        const s = grupo[Math.floor(grupo.length * (i % 2 ? 0.7 : 0.3))];
        if (!elegidas.includes(s)) elegidas.push(s);
      }
      return elegidas;
    };
    return { aceptadas: tomar(ok), rechazadas: tomar(no) };
  }

  const api = { AFD, cuentaMultiplo, contiene, terminaEn01, binarioMultiplo3, LENGUAJES, ejemplos };
  global.Chomsky = Object.assign(global.Chomsky || {}, api);
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
