/* ============================================================
   Motor de la máquina de Turing (MT) · Nivel 0
   Módulo puro: no toca el DOM, así se puede probar por separado.
     M = (Q, Σ, Γ, δ, q0, ␣, F)
     Σ = alfabeto de entrada, Γ = alfabeto de la cinta (Σ ⊂ Γ, incluye el blanco ␣),
     F = estados de aceptación (la máquina se detiene al llegar a uno).
   La cinta es INFINITA hacia ambos lados: las celdas que nadie escribió valen ␣.
   Se guarda como un diccionario posición → símbolo (solo las celdas escritas).
   Una regla de δ dice:  (estado, lee) → (nuevo estado, escribe, mueve)
     mueve = 'D' (derecha), 'I' (izquierda) o 'N' (no se mueve).
   La MT puede no detenerse nunca; por eso se limita a 5000 pasos.
   ============================================================ */
(function (global) {
  'use strict';
  const BLANCO = '␣', LIMITE = 5000;
  const DESPL = { D: 1, I: -1, N: 0 };

  class Turing {
    constructor({ estados, alfabeto, alfabetoCinta, inicial, aceptacion, reglas }) {
      this.estados = estados;                  // Q
      this.alfabeto = alfabeto;                // Σ
      this.alfabetoCinta = alfabetoCinta;      // Γ
      this.blanco = BLANCO;
      this.inicial = inicial;                  // q0
      this.aceptacion = new Set(aceptacion);   // F
      this.reglas = reglas;                    // [{ de, lee, a, escribe, mueve }]
      this.mapa = new Map();
      reglas.forEach((r, i) => this.mapa.set(`${r.de}|${r.lee}`, i));
      this.reiniciar('');
    }

    /** Escribe la entrada desde la posición 0; el cabezal empieza sobre su primer símbolo. */
    reiniciar(cadena) {
      this.cadena = cadena;
      this.cinta = {};
      [...cadena].forEach((c, i) => { this.cinta[i] = c; });
      this.cabezal = 0;
      this.min = 0; this.max = Math.max(0, cadena.length - 1);      // rango de celdas visitadas
      this.actual = this.inicial;
      this.pasos = [];
      this.fin = false; this.aceptada = false; this.motivo = '';
      const ajeno = [...cadena].find(c => !this.alfabeto.includes(c));
      if (ajeno !== undefined) {
        this.fin = true;
        this.motivo = `el símbolo «${ajeno}» no pertenece al alfabeto de entrada Σ`;
      }
    }

    leer(pos) { return this.cinta[pos] === undefined ? BLANCO : this.cinta[pos]; }

    /** Cinta visitada en texto, con el cabezal entre corchetes: 1 1 [+] 1 */
    textoCinta() {
      const celdas = [];
      for (let p = this.min - 1; p <= this.max + 1; p++) celdas.push(p === this.cabezal ? `[${this.leer(p)}]` : this.leer(p));
      return celdas.join(' ');
    }

    /** Lo escrito en la cinta, desde el primer hasta el último símbolo que no es blanco. */
    resultado() {
      const pos = Object.keys(this.cinta).map(Number).filter(p => this.cinta[p] !== BLANCO).sort((a, b) => a - b);
      if (!pos.length) return '';
      let s = '';
      for (let p = pos[0]; p <= pos[pos.length - 1]; p++) s += this.leer(p);
      return s;
    }

    /** Aplica UNA transición. Devuelve el registro del paso (o null si ya terminó). */
    paso() {
      if (this.fin) return null;
      const desde = this.actual, lee = this.leer(this.cabezal);
      const i = this.mapa.get(`${desde}|${lee}`);
      const reg = { n: this.pasos.length + 1, desde, lee, pos: this.cabezal, escribe: lee, mueve: null, hasta: null, regla: null };
      const cerrar = (aceptada, motivo) => { this.fin = true; this.aceptada = aceptada; this.motivo = motivo; };

      if (i === undefined) {                   // ninguna regla aplica: la máquina se detiene rechazando
        reg.cinta = this.textoCinta(); this.pasos.push(reg);
        cerrar(false, `no existe transición para (${desde}, ${lee}): la máquina se detiene sin aceptar`);
        return reg;
      }
      const r = this.reglas[i];
      if (r.escribe === BLANCO) delete this.cinta[this.cabezal]; else this.cinta[this.cabezal] = r.escribe;
      this.cabezal += DESPL[r.mueve];
      this.min = Math.min(this.min, this.cabezal); this.max = Math.max(this.max, this.cabezal);   // la cinta "crece"
      this.actual = r.a;
      Object.assign(reg, { escribe: r.escribe, mueve: r.mueve, hasta: r.a, regla: i, cinta: this.textoCinta() });
      this.pasos.push(reg);
      if (this.aceptacion.has(this.actual)) cerrar(true, `la máquina se detuvo en el estado de aceptación ${this.actual}`);
      else if (this.pasos.length >= LIMITE) cerrar(false, `se alcanzó el límite de ${LIMITE} pasos: posible bucle infinito`);
      return reg;
    }

    /** Evaluación directa (sin animación): sirve para pruebas. Devuelve { acepta, salida }. */
    ejecutar(cadena) {
      const m = new Turing({ estados: this.estados, alfabeto: this.alfabeto, alfabetoCinta: this.alfabetoCinta, inicial: this.inicial, aceptacion: [...this.aceptacion], reglas: this.reglas });
      m.reiniciar(cadena);
      while (!m.fin) m.paso();
      return { acepta: m.aceptada, salida: m.resultado() };
    }
    acepta(cadena) { return this.ejecutar(cadena).acepta; }
  }

  /* ---------- Máquinas disponibles ---------- */
  const R = (de, lee, a, escribe, mueve) => ({ de, lee, a, escribe, mueve });
  const B = BLANCO;

  /** Palíndromos sobre {a, b}: borra la primera letra, la busca al final, la borra y repite. */
  function palindromos() {
    const reglas = [
      R('q0', B, 'qa', B, 'N'), R('q0', 'a', 'q1', B, 'D'), R('q0', 'b', 'q2', B, 'D'),   // toma la primera letra
      R('q1', 'a', 'q1', 'a', 'D'), R('q1', 'b', 'q1', 'b', 'D'), R('q1', B, 'q3', B, 'I'),   // recuerda "a", va al final
      R('q2', 'a', 'q2', 'a', 'D'), R('q2', 'b', 'q2', 'b', 'D'), R('q2', B, 'q4', B, 'I'),   // recuerda "b", va al final
      R('q3', 'a', 'q5', B, 'I'), R('q3', B, 'qa', B, 'N'),                                  // la última debe ser a
      R('q4', 'b', 'q5', B, 'I'), R('q4', B, 'qa', B, 'N'),                                  // la última debe ser b
      R('q5', 'a', 'q5', 'a', 'I'), R('q5', 'b', 'q5', 'b', 'I'), R('q5', B, 'q0', B, 'D')    // vuelve al inicio
    ];
    return {
      tipo: 'acepta',
      maquina: new Turing({ estados: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'qa'], alfabeto: ['a', 'b'], alfabetoCinta: ['a', 'b', B], inicial: 'q0', aceptacion: ['qa'], reglas }),
      descripcion: 'L = { w ∈ {a, b}* | w es igual a su reverso }. Ejemplos: aba, abba. Se acepta también la cadena vacía.',
      notas: { q0: 'Toma (y borra) la primera letra. Si ya no hay letras, acepta.', q1: 'Recuerda que la primera era «a» y va hasta el final de la cadena.',
               q2: 'Recuerda que la primera era «b» y va hasta el final de la cadena.', q3: 'Mira la última letra: debe ser «a» (la borra) o no quedar nada.',
               q4: 'Mira la última letra: debe ser «b» (la borra) o no quedar nada.', q5: 'Regresa hasta el borde izquierdo para repetir con lo que queda.', qa: 'Aceptación: la cadena era palíndroma.' },
      aceptadas: ['aba', 'abba', 'aabaa', 'babab'], rechazadas: ['ab', 'abb', 'aabb', 'abab'], cadenaInicial: 'abba'
    };
  }

  /** Suma unaria 1ᵃ+1ᵇ → 1ᵃ⁺ᵇ: cambia el + por un 1 y borra el último 1. */
  function sumaUnaria() {
    const reglas = [
      R('q0', '1', 'q0', '1', 'D'), R('q0', '+', 'q1', '1', 'D'),      // recorre el primer sumando; el + pasa a ser 1
      R('q1', '1', 'q1', '1', 'D'), R('q1', B, 'q2', B, 'I'),          // recorre el segundo sumando hasta el final
      R('q2', '1', 'qa', B, 'N')                                       // borra el último 1 (sobraba uno)
    ];
    return {
      tipo: 'funcion',
      maquina: new Turing({ estados: ['q0', 'q1', 'q2', 'qa'], alfabeto: ['1', '+'], alfabetoCinta: ['1', '+', B], inicial: 'q0', aceptacion: ['qa'], reglas }),
      descripcion: 'Función: suma en unario. El número n se escribe como n unos. Entrada «11+111» (2 + 3) → salida «11111» (5).',
      notas: { q0: 'Recorre el primer sumando. Al encontrar «+», lo reemplaza por un 1.', q1: 'Recorre el segundo sumando hasta llegar al blanco final.',
               q2: 'Retrocede una celda y borra un 1 (al unir los sumandos sobraba uno).', qa: 'Fin: la cinta contiene el resultado.' },
      aceptadas: ['11+111', '1+1', '111+', '+11'], rechazadas: ['111', '1++1'], cadenaInicial: '11+111',
      interpretar: s => '= ' + [...s].filter(c => c === '1').length
    };
  }

  /** Incremento binario: suma 1 a un número en binario, propagando el acarreo hacia la izquierda. */
  function incrementoBinario() {
    const reglas = [
      R('q0', '0', 'q0', '0', 'D'), R('q0', '1', 'q0', '1', 'D'), R('q0', B, 'q1', B, 'I'),   // va al último bit
      R('q1', '1', 'q1', '0', 'I'),                                                          // 1 + 1 = 0, acarreo 1
      R('q1', '0', 'qa', '1', 'N'), R('q1', B, 'qa', '1', 'N')                                // 0 + 1 = 1 (o nuevo bit): fin
    ];
    return {
      tipo: 'funcion',
      maquina: new Turing({ estados: ['q0', 'q1', 'qa'], alfabeto: ['0', '1'], alfabetoCinta: ['0', '1', B], inicial: 'q0', aceptacion: ['qa'], reglas }),
      descripcion: 'Función: suma 1 a un número binario. Entrada «1011» (11) → salida «1100» (12). Con «111» se añade un bit: «1000».',
      notas: { q0: 'Recorre el número hasta pasar el último bit.', q1: 'Suma 1 desde el último bit: cada 1 pasa a 0 y el acarreo avanza a la izquierda; el primer 0 (o blanco) pasa a 1.', qa: 'Fin: la cinta contiene el número incrementado.' },
      aceptadas: ['1011', '111', '0', '1001'], rechazadas: ['102', 'abc'], cadenaInicial: '1011',
      interpretar: s => '= ' + parseInt(s || '0', 2)
    };
  }

  const LENGUAJES_MT = [
    { id: 'pal', nombre: 'Aceptar: palíndromos sobre {a, b}', tipo: 'acepta', param: null, crear: palindromos },
    { id: 'suma', nombre: 'Función: suma unaria 1ᵃ+1ᵇ', tipo: 'funcion', param: null, crear: sumaUnaria },
    { id: 'inc', nombre: 'Función: incremento binario (+1)', tipo: 'funcion', param: null, crear: incrementoBinario }
  ];

  const api = { Turing, LENGUAJES_MT };
  global.Chomsky = Object.assign(global.Chomsky || {}, api);
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
