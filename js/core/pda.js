/* ============================================================
   Motor del autómata de pila (AP / PDA) · Nivel 2
   Módulo puro: no toca el DOM, así se puede probar por separado.
   Un AP es la 7-tupla M = (Q, Σ, Γ, δ, q0, Z0, F):
     Q = estados, Σ = alfabeto de entrada, Γ = alfabeto de la pila,
     δ = transiciones, q0 = estado inicial,
     Z0 = símbolo de fondo de la pila, F = estados finales.
   Una regla de δ dice:  (estado, lee, tope) → (nuevo estado, apila)
     - "lee" es un símbolo de la entrada o ε (no consume entrada).
     - "apila" reemplaza al tope; se escribe con el tope a la IZQUIERDA.
       '' (vacío) significa desapilar; 'AZ' significa poner A encima de Z.
   Regla del motor: si hay transición con el símbolo actual se usa esa;
   si no, se prueba la transición ε. Se acepta por ESTADO FINAL, con toda
   la entrada consumida (el lenguaje de ejemplo se diseñó para que sea determinista).
   ============================================================ */
(function (global) {
  'use strict';
  const EPS = 'ε';

  class PDA {
    constructor({ estados, alfabeto, alfabetoPila, inicial, fondo, finales, reglas }) {
      this.estados = estados;                 // Q
      this.alfabeto = alfabeto;               // Σ
      this.alfabetoPila = alfabetoPila;       // Γ
      this.inicial = inicial;                 // q0
      this.fondo = fondo;                     // Z0 (se escribe 'Z' internamente)
      this.finales = new Set(finales);        // F
      this.reglas = reglas;                   // [{ de, lee, tope, a, apila, etq }]
      this.mapa = new Map();                  // búsqueda rápida: "q|lee|tope" -> índice de regla
      reglas.forEach((r, i) => this.mapa.set(`${r.de}|${r.lee}|${r.tope}`, i));
      this.reiniciar('');
    }

    _buscar(q, lee, tope) { return this.mapa.get(`${q}|${lee}|${tope}`); }

    /** Prepara una nueva simulación: estado inicial y pila con solo Z0. */
    reiniciar(cadena) {
      this.cadena = cadena;
      this.pos = 0;
      this.actual = this.inicial;
      this.pila = [this.fondo];               // de abajo hacia arriba: el último elemento es el tope
      this.pasos = [];
      this.fin = false; this.aceptada = false; this.motivo = '';
      this._cerrarSiTermino();
    }

    /** Aplica UNA transición. Devuelve el registro del paso (o null si ya terminó). */
    paso() {
      if (this.fin) return null;
      const sim = this.cadena[this.pos], tope = this.pila[this.pila.length - 1];
      let i = sim === undefined ? undefined : this._buscar(this.actual, sim, tope), consume = true;
      if (i === undefined) { i = this._buscar(this.actual, EPS, tope); consume = false; }

      const registro = { n: this.pasos.length + 1, desde: this.actual, simbolo: consume ? sim : EPS, tope };
      if (i === undefined) {                  // ninguna regla aplica: el autómata se bloquea
        Object.assign(registro, { simbolo: sim === undefined ? EPS : sim, hasta: null, regla: null, apila: null,
          pila: this.pila.slice(), restante: this.cadena.slice(this.pos) });
        this.pasos.push(registro);
        this.fin = true; this.aceptada = false;
        this.motivo = `no existe transición para (${this.actual}, ${registro.simbolo}, ${tope === 'Z' ? 'Z₀' : tope}): el autómata se bloquea`;
        return registro;
      }
      const r = this.reglas[i];
      this.pila.pop();                                           // se quita el tope...
      for (let k = r.apila.length - 1; k >= 0; k--) this.pila.push(r.apila[k]);   // ...y se pone la cadena (su primer símbolo queda arriba)
      this.actual = r.a;
      if (consume) this.pos++;
      Object.assign(registro, { hasta: r.a, regla: i, apila: r.apila, pila: this.pila.slice(), restante: this.cadena.slice(this.pos) });
      this.pasos.push(registro);
      this._cerrarSiTermino();
      return registro;
    }

    /** Termina cuando se agotó la entrada y ya no quedan movimientos ε. */
    _cerrarSiTermino() {
      if (this.pasos.length > 5000) {
        this.fin = true; this.aceptada = false; this.motivo = 'se superó el límite de 5000 pasos'; return;
      }
      if (this.pos < this.cadena.length) return;
      if (this._buscar(this.actual, EPS, this.pila[this.pila.length - 1]) !== undefined) return;   // aún hay un movimiento ε
      this.fin = true;
      this.aceptada = this.finales.has(this.actual);
      const extra = this.pila.length > 1 ? ' y en la pila quedan símbolos sin desapilar' : '';
      this.motivo = this.aceptada
        ? `se consumió toda la entrada y ${this.actual} es un estado final (∈ F)`
        : `se consumió la entrada pero ${this.actual} no es un estado final (∉ F)${extra}`;
    }

    /** Evaluación directa (sin animación): sirve para generar ejemplos y para pruebas. */
    acepta(cadena) {
      let q = this.inicial, pila = [this.fondo], pos = 0;
      for (let guardia = 0; guardia < 5000; guardia++) {
        const sim = cadena[pos], tope = pila[pila.length - 1];
        let i = sim === undefined ? undefined : this._buscar(q, sim, tope), consume = true;
        if (i === undefined) { i = this._buscar(q, EPS, tope); consume = false; }
        if (i === undefined) return pos >= cadena.length && this.finales.has(q);
        const r = this.reglas[i];
        pila.pop();
        for (let k = r.apila.length - 1; k >= 0; k--) pila.push(r.apila[k]);
        q = r.a; if (consume) pos++;
      }
      return false;
    }
  }

  /* ---------- Constructores de autómatas ---------- */

  /** aⁿbⁿ (n ≥ 1): apila una A por cada a; desapila una por cada b; al quedar solo Z0, acepta. */
  function anbn() {
    return new PDA({
      estados: ['q0', 'q1', 'q2'], alfabeto: ['a', 'b'], alfabetoPila: ['Z', 'A'], inicial: 'q0', fondo: 'Z', finales: ['q2'],
      reglas: [
        { de: 'q0', lee: 'a', tope: 'Z', a: 'q0', apila: 'AZ', etq: 'a, Z₀ / A Z₀' },   // primera a
        { de: 'q0', lee: 'a', tope: 'A', a: 'q0', apila: 'AA', etq: 'a, A / A A' },      // más a
        { de: 'q0', lee: 'b', tope: 'A', a: 'q1', apila: '',   etq: 'b, A / ε' },        // primera b
        { de: 'q1', lee: 'b', tope: 'A', a: 'q1', apila: '',   etq: 'b, A / ε' },        // más b
        { de: 'q1', lee: 'ε', tope: 'Z', a: 'q2', apila: 'Z',  etq: 'ε, Z₀ / Z₀' }       // solo queda el fondo: acepta
      ]
    });
  }

  /** Paréntesis balanceados con 1 a 3 clases: ( ) [ ] { }. Cada abierto se apila; cada cierre debe coincidir con el tope. */
  function parentesis(clases) {
    const pares = ['()', '[]', '{}'].slice(0, clases);
    const abre = pares.map(p => p[0]), cierra = pares.map(p => p[1]);
    const reglas = [], pilaSim = ['Z', ...abre];
    for (const [o, c] of pares) {
      for (const X of pilaSim) reglas.push({ de: 'q0', lee: o, tope: X, a: 'q0', apila: o + X, etq: `${o}, * / ${o} *` });
      reglas.push({ de: 'q0', lee: c, tope: o, a: 'q0', apila: '', etq: `${c}, ${o} / ε` });
    }
    reglas.push({ de: 'q0', lee: 'ε', tope: 'Z', a: 'q1', apila: 'Z', etq: 'ε, Z₀ / Z₀' });
    return new PDA({ estados: ['q0', 'q1'], alfabeto: [...abre, ...cierra], alfabetoPila: pilaSim, inicial: 'q0', fondo: 'Z', finales: ['q1'], reglas });
  }

  /** w c wᴿ: se apila w, al ver el marcador c se pasa a comparar, y cada símbolo debe coincidir con el tope (w al revés). */
  function palindromoMarcador(letras) {
    const reglas = [], pilaSim = ['Z', ...letras];
    for (const l of letras) for (const X of pilaSim) reglas.push({ de: 'q0', lee: l, tope: X, a: 'q0', apila: l + X, etq: `${l}, * / ${l} *` });
    for (const X of pilaSim) reglas.push({ de: 'q0', lee: 'c', tope: X, a: 'q1', apila: X, etq: 'c, * / *' });
    for (const l of letras) reglas.push({ de: 'q1', lee: l, tope: l, a: 'q1', apila: '', etq: `${l}, ${l} / ε` });
    reglas.push({ de: 'q1', lee: 'ε', tope: 'Z', a: 'q2', apila: 'Z', etq: 'ε, Z₀ / Z₀' });
    return new PDA({ estados: ['q0', 'q1', 'q2'], alfabeto: [...letras, 'c'], alfabetoPila: pilaSim, inicial: 'q0', fondo: 'Z', finales: ['q2'], reglas });
  }

  /* ---------- Lenguajes disponibles en la interfaz ---------- */
  const LENGUAJES_PDA = [
    { id: 'anbn', nombre: 'aⁿbⁿ (n ≥ 1)', param: null,
      crear() { return { pda: anbn(), descripcion: 'L = { aⁿbⁿ | n ≥ 1 }: tantas a seguidas de exactamente tantas b.' }; } },
    { id: 'parentesis', nombre: 'Paréntesis balanceados',
      param: { etiqueta: 'clases', defecto: '1', ayuda: '1 a 3 clases: ( ) [ ] { }' },
      crear(p) {
        const k = Number(p);
        if (!Number.isInteger(k) || k < 1 || k > 3) throw new Error('clases debe ser 1, 2 o 3.');
        const pares = ['()', '[]', '{}'].slice(0, k).join('  ');
        return { pda: parentesis(k), descripcion: `L = { cadenas bien balanceadas con los pares ${pares} }. En las reglas, * = cualquier símbolo de la pila.` };
      } },
    { id: 'palindromo', nombre: 'w c wᴿ (palíndromo con marcador)',
      param: { etiqueta: 'letras', defecto: 'ab', ayuda: '1 a 3 letras distintas, sin c ni Z' },
      crear(p) {
        const letras = [...p];
        if (letras.length < 1 || letras.length > 3 || new Set(letras).size !== letras.length || letras.some(l => l === 'c' || l === 'Z' || /\s/.test(l)))
          throw new Error('Escribe de 1 a 3 letras distintas, sin espacios, sin «c» (marcador) ni «Z» (fondo).');
        return { pda: palindromoMarcador(letras), descripcion: `L = { w c wᴿ | w ∈ { ${letras.join(', ')} }* }: w, el marcador c y w al revés. * = cualquier símbolo de la pila.` };
      } }
  ];

  const api = { PDA, anbn, parentesis, palindromoMarcador, LENGUAJES_PDA };
  global.Chomsky = Object.assign(global.Chomsky || {}, api);
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
