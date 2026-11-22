# Estación Chomsky · Documento de implementación y conceptos aplicados

## 1. Objetivo

Diseñar e implementar una aplicación con interfaz gráfica que permita **visualizar, simular y validar** el comportamiento de un modelo computacional representativo de cada nivel de la Jerarquía de Chomsky, con un panel principal que permita escoger entre cuatro módulos interactivos:

| Módulo | Requisito del enunciado | Cómo se cumple |
|---|---|---|
| Nivel 3 | Reconocer cadenas de un lenguaje regular predeterminado o parametrizable, mostrando los estados y el estado actual símbolo a símbolo | AFD con 4 lenguajes (2 parametrizables), diagrama de estados con el estado activo resaltado, cinta de entrada y traza |
| Nivel 2 | Lenguajes con memoria LIFO, con animación de la pila | Autómata de pila con pila animada (apilar/desapilar), 3 lenguajes (2 parametrizables) |
| Nivel 1 | Lenguajes no libres de contexto con memoria acotada a la entrada; cinta con delimitadores y cabezal bidireccional | ALA para aⁿbⁿcⁿ (parametrizable hasta 5 letras), cinta `⊢ … ⊣` y cabezal que va y viene |
| Nivel 0 | Máquina de Turing que acepte una cadena o ejecute una función aritmética, con cinta extendible, alfabeto de cinta, cabezal y estado activo | MT con palíndromos, suma unaria e incremento binario; cinta infinita |

## 2. Marco teórico

### 2.1 Jerarquía de Chomsky

Noam Chomsky clasificó las gramáticas formales en cuatro tipos según la forma de sus producciones. Cada tipo genera una familia de lenguajes y cada familia se reconoce con un modelo de cómputo distinto. Las familias están **contenidas una dentro de otra**:

> Regulares (3) ⊂ Libres de contexto (2) ⊂ Sensibles al contexto (1) ⊂ Recursivamente enumerables (0)

(La portada lo dibuja con cuatro cajas anidadas.) Cada inclusión es propia: existen lenguajes de cada familia que no están en la anterior.

| Tipo | Producciones (α → β) | Lenguajes | Modelo | Memoria | Ejemplo |
|---|---|---|---|---|---|
| 3 | A → aB, A → a (lineales por la derecha) | Regulares | AFD / AFN | Finita: solo el estado | Cantidad par de 1s |
| 2 | A → γ (un solo no terminal a la izquierda) | Libres de contexto | Autómata de pila | Pila (LIFO) | aⁿbⁿ |
| 1 | αAβ → αγβ, con γ ≠ ε (nunca acortan) | Sensibles al contexto | Autómata linealmente acotado | Cinta de tamaño lineal en la entrada | aⁿbⁿcⁿ |
| 0 | α → β sin restricciones | Recursivamente enumerables | Máquina de Turing | Cinta infinita | Cualquier cómputo |

Gramáticas de ejemplo:

- **Tipo 3** (número par de 1s sobre {0,1}): `S → 0S | 1T | ε` y `T → 0T | 1S`.
- **Tipo 2** (aⁿbⁿ, n ≥ 1): `S → aSb | ab`.
- **Tipo 1** (aⁿbⁿcⁿ, n ≥ 1): `S → aSBC | aBC`, `CB → BC`, `aB → ab`, `bB → bb`, `bC → bc`, `cC → cc`.

### 2.2 Por qué cada lenguaje «necesita» su modelo

- **aⁿbⁿ no es regular.** Un AFD tiene una cantidad finita de estados. Al leer aⁱ para i = 0, 1, 2, …, dos valores distintos i ≠ j terminan en el mismo estado (principio del palomar), y entonces el autómata no puede distinguir aⁱbⁱ de aʲbⁱ. Formalmente se demuestra con el **lema de bombeo** de los lenguajes regulares. La pila sí lo resuelve: apila una marca por cada *a* y desapila una por cada *b*.
- **aⁿbⁿcⁿ no es libre de contexto.** Con una pila, al desapilar las *a* contra las *b* se pierde la cuenta que haría falta para las *c*. Se demuestra con el lema de bombeo de los libres de contexto: la parte «bombeable» no puede abarcar a la vez las tres letras. El ALA lo resuelve **marcando** una letra de cada tipo por vuelta, usando la propia cinta como memoria.
- **Los palíndromos sin marcador** son libres de contexto, pero un autómata de pila los necesita **no determinista** (debe «adivinar» dónde está la mitad). Por eso el Nivel 2 usa **w c wᴿ**, con un marcador *c* en el centro, que sí se reconoce de forma determinista. En el Nivel 0 la máquina de Turing los resuelve sin marcador porque puede ir y venir en la cinta.

### 2.3 Equivalencias, decidibilidad y límites

- AFD ↔ gramáticas regulares; AP ↔ gramáticas libres de contexto; ALA (no determinista) ↔ gramáticas sensibles al contexto; MT ↔ gramáticas sin restricciones. Si los ALA deterministas reconocen exactamente los mismos lenguajes que los no deterministas es un problema abierto.
- **Pertenencia** (¿w ∈ L?): decidible para tipos 3, 2 y 1. Para el tipo 0 solo es **semidecidible**: una MT puede no detenerse nunca (relacionado con el *problema de la parada*, indecidible). Por eso el simulador del Nivel 0 corta a los **5000 pasos** y avisa de un «posible bucle infinito».
- Una **MT con la cinta acotada a la entrada** es justamente un ALA; en el código la diferencia es solo la cinta: acotada con muros (`lba.js`) frente a infinita (`turing.js`).

## 3. Arquitectura

### 3.1 Principio: separar el motor de la interfaz

```
        ┌────────────────────────┐          ┌──────────────────────────┐
        │  MOTOR (js/core/*.js)  │          │  INTERFAZ (js/ui/*.js)   │
        │  lógica pura, sin DOM  │ ◄──────  │  solo lee y dibuja       │
        │  reiniciar(cadena)     │  estado  │  cinta, pila, diagrama,  │
        │  paso()  acepta(c)     │          │  tablas, traza, botones  │
        └────────────────────────┘          └──────────────────────────┘
               ▲ se prueba con Node
               tests/motores.test.js
```

Ventajas: los motores se **prueban sin navegador**; la interfaz de los niveles 1 y 0 es la misma (`maquina.js`) porque ambos motores exponen los mismos campos; y cada parte es fácil de explicar en la defensa.

### 3.2 Contrato común de los motores

| Miembro | Significado |
|---|---|
| `reiniciar(cadena)` | Prepara una simulación nueva (estado inicial, memoria inicial) |
| `paso()` | Aplica **una** transición y devuelve un registro `{n, desde, lee, hasta, ...}`; `null` si ya terminó |
| `acepta(cadena)` | Evaluación directa, sin animación (se usa para generar ejemplos y para pruebas) |
| `fin`, `aceptada`, `motivo` | Si terminó, el veredicto y su explicación en texto |
| `pasos` | Historial, de donde sale la **traza** |

### 3.3 Módulos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `js/core/afd.js` | Clase `AFD`, constructores de autómatas y `ejemplos()` (genera cadenas aceptadas y rechazadas) |
| `js/core/pda.js` | Clase `PDA` y lenguajes aⁿbⁿ, paréntesis, w c wᴿ |
| `js/core/lba.js` | Clase `LBA` y aⁿbⁿcⁿ generalizado |
| `js/core/turing.js` | Clase `Turing` y las tres máquinas |
| `js/ui/diagrama.js` | Dibuja el diagrama de estados en SVG (niveles 3 y 2) |
| `js/ui/maquina.js` | Interfaz común de los niveles 1 y 0 |
| `js/ui/nivel3.js`, `nivel2.js` | Interfaz propia de los niveles 3 y 2 |
| `js/main.js`, `js/tema.js` | Portada (arranque, fichas, sonido) y tema claro/oscuro |

## 4. Implementación por nivel

### 4.1 Nivel 3 · AFD (`afd.js`)

Un AFD es la 5-tupla **M = (Q, Σ, δ, q₀, F)**. La simulación consume un símbolo por paso: `q ← δ(q, a)`. Al terminar la cadena se acepta si `q ∈ F`; si aparece un símbolo fuera de Σ no hay transición y se rechaza.

Autómatas construidos:

| Lenguaje | Idea | Estados |
|---|---|---|
| Cantidad de 1s múltiplo de *k* | El estado `qᵢ` cuenta los 1s módulo *k*: δ(qᵢ,1) = q₍ᵢ₊₁₎ mod k, δ(qᵢ,0) = qᵢ; F = {q₀} | *k* (2 a 6) |
| Contiene la subcadena *w* | Idea del algoritmo **KMP**: `qⱼ` = «ya vi los primeros j símbolos de *w*». Se calcula la función de fallo y, al leer un símbolo, se retrocede por ella hasta encontrar el prefijo más largo que sigue siendo válido. `q_m` (m = \|w\|) es final y absorbente | \|w\| + 1 |
| Termina en 01 | q0 = nada útil, q1 = el último símbolo fue 0, q2 = terminó en 01; F = {q2} | 3 |
| Binario múltiplo de 3 | El estado guarda el **residuo** módulo 3. Al leer el bit *b*: r' = (2r + b) mod 3; F = {q0} | 3 |

El diagrama agrupa los símbolos que comparten origen y destino en una sola flecha (`0, 1`).

### 4.2 Nivel 2 · Autómata de pila (`pda.js`)

Un AP es **M = (Q, Σ, Γ, δ, q₀, Z₀, F)**. Una regla dice `(estado, lee, tope) → (nuevo estado, apila)`:

- *lee* es un símbolo de la entrada o **ε** (no consume entrada);
- *apila* **reemplaza al tope**, escrito con el tope a la izquierda: `''` = desapilar, `AZ` = poner *A* encima de *Z*.

Reglas del motor: (1) si hay transición con el símbolo actual, se usa; si no, se prueba la transición ε. (2) Se acepta **por estado final**, con toda la entrada consumida y sin movimientos ε pendientes. Los lenguajes se diseñaron deterministas.

**Autómata de aⁿbⁿ (n ≥ 1)** (Z₀ es el fondo; *A* cuenta las *a*):

| Estado | Lee | Tope | Pasa a | Apila | Significado |
|---|---|---|---|---|---|
| q0 | a | Z₀ | q0 | A Z₀ | primera *a* |
| q0 | a | A | q0 | A A | más *a* |
| q0 | b | A | q1 | ε | primera *b*: desapila |
| q1 | b | A | q1 | ε | más *b*: desapila |
| q1 | ε | Z₀ | q2 | Z₀ | solo queda el fondo: acepta |

**Paréntesis balanceados** (1 a 3 clases): cada abierto se apila (para cualquier tope, `*`) y cada cierre debe coincidir con el tope; al agotar la entrada con solo Z₀ en la pila, una transición ε lleva al estado final.
**w c wᴿ**: en q0 se apila cada letra; el marcador *c* pasa a q1 sin tocar la pila; en q1 cada letra debe coincidir con el tope (así se compara *w* al revés); al quedar Z₀, una transición ε acepta.

Los mensajes de rechazo son específicos: «el autómata se bloquea en (q, símbolo, tope)» o «terminó en q1, que no es final, y en la pila quedan símbolos sin desapilar».

### 4.3 Nivel 1 · ALA (`lba.js`)

Un ALA es **M = (Q, Σ, Γ, δ, q₀, ⊢, ⊣, F)** con la cinta `⊢ w ⊣`, de **|w| + 2** celdas. Dos reglas lo distinguen de una MT:

1. **No se sobrescriben** ⊢ ni ⊣ (el constructor lanza un error si una regla lo intenta).
2. **No se cruzan**: si el cabezal intenta salir de la cinta, la cadena se **rechaza** con un mensaje.

Una regla es `(estado, lee) → (nuevo estado, escribe, mueve)` con mueve ∈ {D, I}.

**Algoritmo de aⁿbⁿcⁿ por marcado** (las mayúsculas son letras ya marcadas; con *m* = 3 letras):

| Estado | Qué hace |
|---|---|
| q0 | Está sobre ⊢; avanza a la derecha |
| q1 | Salta las A; busca la primera `a` sin marcar, la marca como A y va a q2. Si en lugar de una `a` encuentra una B, ya no hay *a* sin marcar: pasa a verificar |
| q2 | Salta `a` y B; marca la primera `b` como B y va a q3 |
| q3 | Salta `b` y C; marca la primera `c` como C, retrocede y va a q4 |
| q4 | Regresa a la izquierda hasta ⊢ y vuelve a q1 |
| q5 | Verifica que solo queden marcas hasta ⊣; entonces pasa a **qa** (acepta) |

Para *m* = 4 o 5 se añaden estados «buscadores» análogos (el código los genera con un bucle). Cada vuelta empareja una letra de cada tipo, así que la simulación toma del orden de n² pasos.

### 4.4 Nivel 0 · Máquina de Turing (`turing.js`)

Una MT es **M = (Q, Σ, Γ, δ, q₀, ␣, F)**. La cinta se guarda como un **diccionario posición → símbolo** (solo se almacenan las celdas escritas; las demás valen ␣), así que crece hacia ambos lados sin esfuerzo. Las reglas pueden mover el cabezal a la derecha (D), a la izquierda (I) o dejarlo quieto (N). Se detiene al llegar a un estado de aceptación o cuando no hay transición; con tope de 5000 pasos.

**Palíndromos sobre {a, b}** (borra la primera letra, la busca al final y repite):

| Estado | Lee | Escribe | Mueve | Pasa a | Idea |
|---|---|---|---|---|---|
| q0 | ␣ | ␣ | N | qa | no quedan letras: acepta |
| q0 | a / b | ␣ | D | q1 / q2 | toma la primera y recuerda cuál era |
| q1, q2 | a, b | igual | D | igual | va hasta el final |
| q1 / q2 | ␣ | ␣ | I | q3 / q4 | retrocede a la última letra |
| q3 | a | ␣ | I | q5 | coincide con la primera (*a*) |
| q3 | ␣ | ␣ | N | qa | solo había una letra: acepta |
| q4 | b | ␣ | I | q5 | coincide con la primera (*b*) |
| q4 | ␣ | ␣ | N | qa | solo había una letra: acepta |
| q5 | a, b | igual | I | q5 | regresa al inicio |
| q5 | ␣ | ␣ | D | q0 | repite con lo que queda |

(Si en q3 aparece una *b* —o en q4 una *a*— no hay transición y se rechaza.)

**Suma unaria** `1ᵃ+1ᵇ → 1ᵃ⁺ᵇ`: recorre el primer sumando, cambia el `+` por un `1`, va al final del segundo, retrocede y **borra el último 1** (sobraba uno). Estados q0, q1, q2, qa. La interfaz decodifica el resultado («11111 = 5»).

**Incremento binario**: va al último bit y suma 1 con acarreo hacia la izquierda: cada `1` pasa a `0` y el acarreo avanza; el primer `0` (o el blanco, si todo eran unos) pasa a `1`. Con `111` la cinta crece a la izquierda y queda `1000`.

## 5. Interfaz y diseño

- **Estilo:** videojuego retro con ambientación de sala de vigilancia nocturna: cada nivel es una cámara (CAM 3, 2, 1, 0). Los monitores muestran una mini animación propia de cada modelo (estados que se encienden, pila que sube y baja, cinta con cabezal, cinta infinita). Cada nivel tiene su color (cian, violeta, ámbar y rosa).
- **Portada:** título con letras que caen, arranque tipo consola (una vez por sesión), reloj de la «noche», estática animada con `canvas`, fichas con ejemplos, y mapa de cajas anidadas de la jerarquía. La O del título suena (Web Audio, sin archivos).
- **Tema claro y oscuro:** todos los colores salen de variables CSS; `js/tema.js` pone `data-tema` en `<html>`, lo guarda en `localStorage` (con `try/catch`) y por defecto sigue la preferencia del sistema.
- **Pila animada:** cada vez se **compara** la pila nueva con la anterior; los bloques que cambiaron «caen» al apilarse y los desapilados salen volando por arriba (se dibujan como «fantasmas» durante 0,45 s).
- **Cinta:** en el Nivel 1 se ven todas las celdas, con muros ⊢ ⊣, marcas punteadas y la celda recién reescrita destellando; en el Nivel 0 se muestra una ventana de 15 celdas centrada en el cabezal que se desliza al moverse.
- **Diagrama de estados (niveles 3 y 2):** los estados se reparten en círculo; las flechas con vuelta se curvan y las demás son rectas; los bucles salen hacia afuera; los estados finales llevan doble círculo; el estado activo y la última transición se resaltan. En los niveles 1 y 0 no se dibuja (7 a 9 estados quedaban ilegibles): se usan una fila de estados y la tabla δ.
- **Accesibilidad:** foco visible, `aria-label` en los elementos gráficos, `role="status"` en el resultado y respeto de `prefers-reduced-motion` (se desactivan animaciones).
- **Responsive:** las rejillas pasan a una columna en pantallas estrechas.

## 6. Pruebas y verificación

`tests/motores.test.js` (114 pruebas, `node tests/motores.test.js`) comprueba:

- cadenas **aceptadas y rechazadas** de cada lenguaje (las mismas del README);
- que la simulación **paso a paso** da el mismo veredicto que la evaluación directa;
- reglas especiales: la pila de aⁿbⁿ queda solo con Z₀ al aceptar; el ALA nunca agranda la cinta, no puede sobrescribir los delimitadores y rechaza si intenta salir; la MT crece a la izquierda y se corta a los 5000 pasos en un bucle infinito.

Además se probó la interfaz completa en un navegador automatizado (cargar cadenas, paso, auto, hasta el final, parámetros inválidos, tema claro/oscuro, enlaces entre páginas).

## 7. Decisiones y limitaciones

- Los autómatas son **deterministas**: es más claro para animar. Por eso se usa *w c wᴿ* en lugar de palíndromos sin marcador en el Nivel 2.
- Las entradas se limitan a **24 caracteres**, y las máquinas de los niveles 1 y 0 se cortan a 20000 y 5000 pasos respectivamente.
- La aplicación **no permite editar autómatas libremente**: los lenguajes están predefinidos (algunos parametrizables). Ampliarlo sería el siguiente paso natural, junto con importar/exportar la definición en JSON y simular modelos no deterministas.
- Las tipografías vienen de Google Fonts; sin internet se usan fuentes de respaldo.

## 8. Referencias

- Chomsky, N. (1956). *Three models for the description of language*. IRE Transactions on Information Theory.
- Chomsky, N. (1959). *On certain formal properties of grammars*. Information and Control.
- Hopcroft, J., Motwani, R. y Ullman, J. *Introduction to Automata Theory, Languages, and Computation*.
- Sipser, M. *Introduction to the Theory of Computation*.
- Kuroda, S.-Y. (1964). *Classes of languages and linear-bounded automata*. Information and Control.
- Knuth, D., Morris, J. y Pratt, V. (1977). *Fast pattern matching in strings*. SIAM Journal on Computing.
- Turing, A. (1936). *On computable numbers, with an application to the Entscheidungsproblem*.
