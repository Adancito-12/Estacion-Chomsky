/* ============================================================
   Pruebas de los 4 motores (sin navegador). Ejecutar con:
       node tests/motores.test.js        (o:  npm test)
   Las cadenas de prueba de aquí son las mismas que aparecen en el README.
   ============================================================ */
'use strict';
const A = require('../js/core/afd.js');
const P = require('../js/core/pda.js');
const L = require('../js/core/lba.js');
const T = require('../js/core/turing.js');

let total = 0, fallas = 0;
const prueba = (condicion, descripcion) => { total++; if (!condicion) { fallas++; console.error('  ✘ FALLA:', descripcion); } };
const acepta = (maquina, lista, nombre) => lista.forEach(s => prueba(maquina.acepta(s), `${nombre} debe ACEPTAR «${s}»`));
const rechaza = (maquina, lista, nombre) => lista.forEach(s => prueba(!maquina.acepta(s), `${nombre} debe RECHAZAR «${s}»`));
/** La simulación paso a paso debe dar el mismo veredicto que la evaluación directa. */
const coherente = (maquina, lista, nombre) => lista.forEach(s => {
  maquina.reiniciar(s); let g = 0; while (!maquina.fin && g++ < 20000) maquina.paso();
  prueba(maquina.aceptada === maquina.acepta(s), `${nombre}: paso a paso = evaluación directa para «${s}»`);
});

console.log('Nivel 3 · AFD');
{
  const k2 = A.cuentaMultiplo(2), k3 = A.cuentaMultiplo(3), aba = A.contiene('aba'), t01 = A.terminaEn01(), m3 = A.binarioMultiplo3();
  acepta(k2, ['0', '11', '1010', '0110'], 'k=2'); rechaza(k2, ['1', '111', '10'], 'k=2');
  acepta(k3, ['111', '10101'], 'k=3'); rechaza(k3, ['11', '1111'], 'k=3');
  acepta(aba, ['aba', 'aababa', 'baaaba'], 'contiene aba'); rechaza(aba, ['aa', 'abba', 'bbab'], 'contiene aba');
  acepta(t01, ['01', '1101', '00001'], 'termina en 01'); rechaza(t01, ['10', '0', '011'], 'termina en 01');
  acepta(m3, ['0', '11', '110', '1001'], 'múltiplo de 3'); rechaza(m3, ['1', '10', '101', '111'], 'múltiplo de 3');
  prueba(!k2.acepta('12'), 'un símbolo fuera de Σ se rechaza');
  coherente(k2, ['1010', '111', '1x'], 'AFD'); coherente(aba, ['aababa', 'abba'], 'AFD');
}

console.log('Nivel 2 · Autómata de pila');
{
  const anbn = P.anbn(), p1 = P.parentesis(1), p3 = P.parentesis(3), pal = P.palindromoMarcador(['a', 'b']);
  acepta(anbn, ['ab', 'aabb', 'aaabbb'], 'aⁿbⁿ'); rechaza(anbn, ['aab', 'abb', 'ba', ''], 'aⁿbⁿ');
  acepta(p1, ['', '()', '(())', '()()'], 'paréntesis (1)'); rechaza(p1, [')(', '(()', '())'], 'paréntesis (1)');
  acepta(p3, ['([{}])', '{[()]}', '([])()'], 'paréntesis (3)'); rechaza(p3, ['([)]', '{(}'], 'paréntesis (3)');
  acepta(pal, ['c', 'aca', 'abcba', 'aabcbaa'], 'w c wᴿ'); rechaza(pal, ['abcab', 'ac', 'abcb'], 'w c wᴿ');
  coherente(anbn, ['aabb', 'aab', 'abb'], 'AP'); coherente(p3, ['([{}])', '([)]'], 'AP'); coherente(pal, ['abcba', 'abcab'], 'AP');
  anbn.reiniciar('aabb'); while (!anbn.fin) anbn.paso();
  prueba(anbn.pila.join('') === 'Z', 'al aceptar aabb la pila queda solo con el fondo Z₀');
}

console.log('Nivel 1 · Autómata linealmente acotado');
{
  const m3 = L.iguales(3).maquina, m4 = L.iguales(4).maquina;
  acepta(m3, ['abc', 'aabbcc', 'aaabbbccc'], 'aⁿbⁿcⁿ'); rechaza(m3, ['aabbc', 'abcc', 'acb', 'abcabc', ''], 'aⁿbⁿcⁿ');
  acepta(m4, ['abcd', 'aabbccdd'], 'aⁿbⁿcⁿdⁿ'); rechaza(m4, ['aabbccd', 'abdc'], 'aⁿbⁿcⁿdⁿ');
  coherente(m3, ['aabbcc', 'aabbc', 'abcabc'], 'ALA');
  for (const s of ['aabbcc', 'aabbc']) { m3.reiniciar(s); while (!m3.fin) m3.paso(); prueba(m3.cinta.length === s.length + 2, `la cinta no crece: mide ${s.length + 2} celdas`); }
  let error = null;
  try { new L.LBA({ estados: ['q'], alfabeto: ['a'], alfabetoCinta: ['a'], inicial: 'q', aceptacion: [], reglas: [{ de: 'q', lee: '⊢', a: 'q', escribe: 'a', mueve: 'D' }] }); } catch (e) { error = e; }
  prueba(error !== null, 'un ALA no puede sobrescribir el delimitador ⊢');
  const sale = new L.LBA({ estados: ['q'], alfabeto: ['a'], alfabetoCinta: ['a'], inicial: 'q', aceptacion: [], reglas: [{ de: 'q', lee: '⊢', a: 'q', escribe: '⊢', mueve: 'I' }] });
  sale.reiniciar('a'); sale.paso(); prueba(sale.fin && !sale.aceptada, 'si el cabezal intenta salir de la cinta, se rechaza');
}

console.log('Nivel 0 · Máquina de Turing');
{
  const por = id => T.LENGUAJES_MT.find(l => l.id === id).crear().maquina;
  const pal = por('pal'), suma = por('suma'), inc = por('inc');
  acepta(pal, ['', 'aba', 'abba', 'aabaa'], 'palíndromos'); rechaza(pal, ['ab', 'abb', 'abab'], 'palíndromos');
  [['11+111', '11111'], ['1+1', '11'], ['111+', '111'], ['+11', '11'], ['+', '']].forEach(([e, s]) => { const r = suma.ejecutar(e); prueba(r.acepta && r.salida === s, `suma ${e} → ${s} (dio «${r.salida}»)`); });
  rechaza(suma, ['111', '1++1'], 'suma unaria');
  [['1011', '1100'], ['111', '1000'], ['0', '1'], ['', '1'], ['1001', '1010']].forEach(([e, s]) => { const r = inc.ejecutar(e); prueba(r.acepta && r.salida === s, `incremento ${e} → ${s} (dio «${r.salida}»)`); });
  rechaza(inc, ['102'], 'incremento binario');
  coherente(pal, ['abba', 'abab'], 'MT');
  inc.reiniciar('111'); while (!inc.fin) inc.paso();
  prueba(inc.min < 0, 'la cinta crece hacia la izquierda cuando hace falta');
  const bucle = new T.Turing({ estados: ['q'], alfabeto: ['a'], alfabetoCinta: ['a', '␣'], inicial: 'q', aceptacion: [],
    reglas: [{ de: 'q', lee: 'a', a: 'q', escribe: 'a', mueve: 'D' }, { de: 'q', lee: '␣', a: 'q', escribe: '␣', mueve: 'D' }] });
  bucle.reiniciar('a'); while (!bucle.fin) bucle.paso();
  prueba(bucle.pasos.length === 5000 && !bucle.aceptada, 'una máquina que no se detiene se corta a los 5000 pasos');
}

console.log(fallas ? `\n✘ ${fallas} de ${total} pruebas fallaron` : `\n✔ ${total} pruebas pasaron`);
process.exit(fallas ? 1 : 0);
