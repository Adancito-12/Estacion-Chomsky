/* ============================================================
   Motor del autómata linealmente acotado (ALA / LBA) · Nivel 1
   Módulo puro: no toca el DOM, así se puede probar por separado.
   Un ALA es una máquina de Turing con la cinta ACOTADA a la entrada:
     M = (Q, Σ, Γ, δ, q0, ⊢, ⊣, F)
   La cinta es  ⊢ w ⊣  (mide |w| + 2 celdas). Los delimitadores ⊢ y ⊣:
     - no se pueden sobrescribir (se comprueba al crear la máquina),
     - no se pueden cruzar (si el cabezal intenta salir, la cadena se rechaza).
   Una regla de δ dice:  (estado, lee) → (nuevo estado, escribe, mueve)
     mueve = 'D' (derecha) o 'I' (izquierda).
   Se acepta al llegar a un estado de aceptación; se rechaza si no hay transición.
   ============================================================ */
(function (global) {
  'use strict';
  const IZQ = '⊢', DER = '⊣', LIMITE = 20000;

  class LBA {
    constructor({ estados, alfabeto, alfabetoCinta, inicial, aceptacion, reglas }) {
      this.estados = estados;                  // Q
      this.alfabeto = alfabeto;                // Σ (símbolos de entrada)
      this.alfabetoCinta = alfabetoCinta;      // Γ (incluye marcas y delimitadores)
      this.inicial = inicial;                  // q0
      this.aceptacion = new Set(aceptacion);   // F
      this.reglas = reglas;                    // [{ de, lee, a, escribe, mueve }]
      this.mapa = new Map();
      reglas.forEach((r, i) => {
        if ((r.lee === IZQ || r.lee === DER) && r.escribe !== r.lee)
          throw new Error(`Un ALA no puede sobrescribir el delimitador ${r.lee}`);
        this.mapa.set(`${r.de}|${r.lee}`, i);
      });
      this.reiniciar('');
    }

    /** Coloca la entrada entre los delimitadores y el cabezal sobre ⊢. */
    reiniciar(cadena) {
      this.cadena = cadena;
      this.cinta = [IZQ, ...cadena, DER];
      this.cabezal = 0;
      this.actual = this.inicial;
      this.pasos = [];
      this.fin = false; this.aceptada = false; this.motivo = '';
      const ajeno = [...cadena].find(c => !this.alfabeto.includes(c));
      if (ajeno !== undefined) {
        this.fin = true;
        this.motivo = `el símbolo «${ajeno}» no pertenece al alfabeto de entrada Σ`;
      }
    }

    /** Cinta en texto, con el cabezal entre corchetes: ⊢ A [a] b ⊣ */
    textoCinta() { return this.cinta.map((s, i) => (i === this.cabezal ? `[${s}]` : s)).join(' '); }

    /** Aplica UNA transición. Devuelve el registro del paso (o null si ya terminó). */
    paso() {
      if (this.fin) return null;
      const desde = this.actual, lee = this.cinta[this.cabezal];
      const i = this.mapa.get(`${desde}|${lee}`);
      const reg = { n: this.pasos.length + 1, desde, lee, pos: this.cabezal, escribe: lee, mueve: null, hasta: null, regla: null };
      const cerrar = (aceptada, motivo) => { this.fin = true; this.aceptada = aceptada; this.motivo = motivo; };

      if (i === undefined) {                   // ninguna regla aplica: la máquina se bloquea
        reg.cinta = this.textoCinta(); this.pasos.push(reg);
        cerrar(false, `no existe transición para (${desde}, ${lee}): la máquina se bloquea`);
        return reg;
      }
      const r = this.reglas[i], nuevo = this.cabezal + (r.mueve === 'D' ? 1 : -1);
      this.cinta[this.cabezal] = r.escribe;    // escribe primero, luego se mueve
      Object.assign(reg, { escribe: r.escribe, mueve: r.mueve, regla: i });
      if (nuevo < 0 || nuevo >= this.cinta.length) {   // intenta cruzar un delimitador
        reg.cinta = this.textoCinta(); this.pasos.push(reg);
        cerrar(false, 'el cabezal intentó salirse de la cinta: un ALA no puede cruzar los delimitadores ⊢ y ⊣');
        return reg;
      }
      this.cabezal = nuevo; this.actual = r.a; reg.hasta = r.a; reg.cinta = this.textoCinta();
      this.pasos.push(reg);
      if (this.aceptacion.has(this.actual)) cerrar(true, `la máquina llegó al estado de aceptación ${this.actual}`);
      else if (this.pasos.length >= LIMITE) cerrar(false, `se superó el límite de ${LIMITE} pasos`);
      return reg;
    }

    /** Evaluación directa (sin animación): sirve para pruebas. */
    acepta(cadena) {
      if ([...cadena].some(c => !this.alfabeto.includes(c))) return false;
      const cinta = [IZQ, ...cadena, DER];
      let q = this.inicial, h = 0;
      for (let g = 0; g < LIMITE; g++) {
        const i = this.mapa.get(`${q}|${cinta[h]}`);
        if (i === undefined) return false;
        const r = this.reglas[i];
        cinta[h] = r.escribe; h += r.mueve === 'D' ? 1 : -1;
        if (h < 0 || h >= cinta.length) return false;
        q = r.a;
        if (this.aceptacion.has(q)) return true;
      }
      return false;
    }
  }

  /* ---------- aⁿbⁿcⁿ (y generalizaciones aⁿbⁿcⁿdⁿ, aⁿbⁿcⁿdⁿeⁿ) ----------
     Estrategia por marcado: en cada vuelta se marca (con mayúscula) UNA letra de cada tipo,
     se regresa al borde izquierdo y se repite. Al final se comprueba que todo quedó marcado. */
  function iguales(m) {
    const L = 'abcde'.slice(0, m).split(''), M = L.map(x => x.toUpperCase());
    const volver = 'q' + (m + 1), verificar = 'q' + (m + 2);
    const estados = ['q0', 'q1', ...L.slice(1).map((_, i) => 'q' + (i + 2)), volver, verificar, 'qa'];
    const R = (de, lee, a, escribe, mueve) => ({ de, lee, a, escribe, mueve });
    const reglas = [
      R('q0', IZQ, 'q1', IZQ, 'D'),                       // arranca sobre ⊢ y avanza
      R('q1', M[0], 'q1', M[0], 'D'),                     // salta las a ya marcadas
      R('q1', L[0], 'q2', M[0], 'D'),                     // marca una a y va a buscar una b
      R('q1', M[1], verificar, M[1], 'D')                 // ya no hay a sin marcar: a verificar
    ];
    for (let i = 2; i <= m; i++) {                        // buscadores: q2 busca b, q3 busca c, ...
      const q = 'q' + i, j = i - 1, ultimo = i === m;
      reglas.push(R(q, L[j - 1], q, L[j - 1], 'D'),       // salta letras anteriores sin marcar
                  R(q, M[j], q, M[j], 'D'),               // salta las ya marcadas de su tipo
                  R(q, L[j], ultimo ? volver : 'q' + (i + 1), M[j], ultimo ? 'I' : 'D'));   // marca la suya
    }
    for (const s of [...L, ...M]) reglas.push(R(volver, s, volver, s, 'I'));      // regresa a la izquierda
    reglas.push(R(volver, IZQ, 'q1', IZQ, 'D'));
    for (let j = 1; j < m; j++) reglas.push(R(verificar, M[j], verificar, M[j], 'D'));   // solo debe haber marcas
    reglas.push(R(verificar, DER, 'qa', DER, 'I'));       // llegó al final sin letras sueltas: acepta

    const notas = { q0: 'Inicio: está sobre ⊢ y empieza a recorrer la cinta hacia la derecha.', q1: `Busca la primera «${L[0]}» sin marcar (salta las ya marcadas ${M[0]}).` };
    for (let i = 2; i <= m; i++) notas['q' + i] = `Busca la primera «${L[i - 1]}» sin marcar y la marca como ${M[i - 1]}.`;
    notas[volver] = 'Regresa hasta el borde izquierdo ⊢ para empezar otra vuelta.';
    notas[verificar] = 'Comprueba que no quedó ninguna letra sin marcar.';
    notas.qa = 'Aceptación: todas las letras quedaron emparejadas.';

    const n = k => L.map(x => x.repeat(k)).join('');
    const aceptadas = [n(1), n(2), n(3)];
    const intercambio = L.slice(); [intercambio[m - 2], intercambio[m - 1]] = [intercambio[m - 1], intercambio[m - 2]];
    return {
      maquina: new LBA({ estados, alfabeto: L, alfabetoCinta: [...L, ...M, IZQ, DER], inicial: 'q0', aceptacion: ['qa'], reglas }),
      descripcion: `L = { ${L.map(x => x + 'ⁿ').join('')} | n ≥ 1 }: n veces cada letra, en orden. Mayúsculas = letras ya marcadas.`,
      notas, aceptadas,
      rechazadas: [n(2).slice(0, -1), 'a' + n(1), intercambio.join(''), n(1).repeat(2)],
      cadenaInicial: aceptadas[1]
    };
  }

  const LENGUAJES_LBA = [
    { id: 'iguales', nombre: 'aⁿbⁿcⁿ (n letras de cada tipo)', tipo: 'acepta',
      param: { etiqueta: 'letras', defecto: '3', ayuda: '3 a 5 tipos: aⁿbⁿcⁿ, aⁿbⁿcⁿdⁿ, ...' },
      crear(p) {
        const m = Number(p);
        if (!Number.isInteger(m) || m < 3 || m > 5) throw new Error('letras debe ser 3, 4 o 5.');
        return Object.assign({ tipo: 'acepta' }, iguales(m));
      } }
  ];

  const api = { LBA, iguales, LENGUAJES_LBA };
  global.Chomsky = Object.assign(global.Chomsky || {}, api);
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
