# Estación Chomsky · Guion de defensa y preguntas probables

## 1. Antes de empezar (checklist de 2 minutos)

- [ ] Abrir la página **antes** de exponer (idealmente la versión publicada en GitHub Pages **y** una copia local, por si falla internet).
- [ ] Probar el audio (la O del título) y elegir la vista (clara u oscura) según el proyector: **la clara se lee mejor con mucha luz**.
- [ ] Tener a mano el README (tabla de cadenas de prueba) y este documento.
- [ ] Si no hay internet, las tipografías cambian pero **todo funciona igual**.

## 2. Guion de demostración (≈ 6 minutos)

| Tiempo | Qué mostrar | Qué decir (idea clave) |
|---|---|---|
| 0:00 | **Portada.** Pulsar una tecla en el arranque. Dejar caer el título y tocar la **O** | «Cada nivel de la jerarquía es una *cámara*. Abajo, las cajas anidadas muestran que cada familia contiene a la anterior.» |
| 0:40 | Tocar la **CAM 2** (ficha) | «Antes de entrar, cada ficha explica cómo es el modelo, qué memoria tiene y da ejemplos de cadenas aceptadas y rechazadas.» |
| 1:10 | **Nivel 3.** Lenguaje *Contiene la subcadena w* con `w = aba`; cargar `aababa`; **Auto** | «El autómata solo recuerda su estado. Mire cómo se enciende el estado actual y se resalta la transición usada.» |
| 2:00 | Cargar `abba` (rechazada) y mostrar el **motivo** | «Termina en q2, que no es final. Su memoria finita no le permite “contar” más allá de sus estados.» |
| 2:20 | **Nivel 2.** `aaabbb`, **Paso** 3–4 veces, luego Auto | «Cada *a* apila una A; cada *b* desapila una. Si solo queda Z₀, hubo la misma cantidad.» |
| 3:10 | Cargar `aab` (rechazada) | «La pila no quedó vacía: sobran A. Por eso se rechaza.» |
| 3:30 | **Nivel 1.** `aabbcc`, **Paso** unas 8 veces, luego **Hasta el final** | «Aquí la cinta mide exactamente la entrada y está encerrada por ⊢ y ⊣. Marca una a, una b y una c por vuelta y regresa. Esto no lo puede hacer una pila.» |
| 4:30 | **Nivel 0.** Suma unaria `11+111`, **Auto** | «La cinta es infinita: se desliza bajo el cabezal. La máquina cambia el + por un 1 y borra el último 1. Resultado: 11111 = 5.» |
| 5:20 | Incremento binario con `111` | «Mire cómo la cinta crece a la izquierda para añadir un bit: `1000`.» |
| 5:40 | Volver a la portada y cerrar | «Cuatro modelos, cuatro memorias: ninguna, pila, cinta acotada, cinta infinita. Cada uno reconoce lenguajes que el anterior no puede.» |

**Si hay poco tiempo:** haz solo CAM 3, CAM 2 y CAM 0 y menciona CAM 1 en una frase.
**Si algo falla:** recarga la página; si persiste, usa las capturas de `docs/img/` y explica el modelo con la tabla de transiciones.

## 3. Preguntas probables y respuestas cortas

**1. ¿Qué es la Jerarquía de Chomsky?**
Una clasificación de las gramáticas formales en cuatro tipos según sus producciones. Cada tipo genera una familia de lenguajes que se reconoce con un modelo distinto, y cada familia contiene a la anterior: regulares ⊂ libres de contexto ⊂ sensibles al contexto ⊂ recursivamente enumerables.

**2. ¿Qué memoria tiene cada modelo?**
AFD: ninguna aparte del estado. Autómata de pila: una pila (LIFO). ALA: la cinta, pero limitada al tamaño de la entrada. Máquina de Turing: cinta infinita.

**3. ¿Por qué aⁿbⁿ no es regular?**
Un AFD tiene un número finito de estados, pero n puede ser tan grande como se quiera. Por el principio del palomar, dos cadenas aⁱ y aʲ (i ≠ j) llegan al mismo estado y no se pueden distinguir. Se demuestra formalmente con el lema de bombeo.

**4. ¿Y por qué aⁿbⁿcⁿ no es libre de contexto?**
Con una pila se puede comparar una cantidad con otra, pero al desapilar las *a* contra las *b* se pierde la información para comparar con las *c*. Formalmente, el lema de bombeo de los libres de contexto muestra que no se pueden bombear las tres letras a la vez.

**5. ¿Qué diferencia hay entre un ALA y una máquina de Turing?**
Es lo mismo salvo la cinta: el ALA solo puede usar las celdas de la entrada, con delimitadores ⊢ y ⊣ que no se sobrescriben ni se cruzan. En mi código, `lba.js` rechaza si el cabezal intenta salir; `turing.js` simplemente agrega celdas en blanco.

**6. ¿Por qué en el Nivel 2 usas w c wᴿ y no palíndromos normales?**
Porque un autómata de pila **determinista** no puede reconocer palíndromos sin marcador: tiene que «adivinar» dónde está la mitad, y eso requiere no determinismo. Con el marcador *c*, sabe cuándo empezar a desapilar. (En el Nivel 0 la máquina de Turing sí resuelve palíndromos sin marcador porque puede ir y volver.)

**7. ¿Cómo aceptan las cadenas los autómatas?**
AFD y autómata de pila: por **estado final** al terminar la entrada. ALA y máquina de Turing: al llegar al estado de aceptación **qa**. Si no existe una transición, se rechaza.

**8. ¿Qué pasa si una máquina de Turing nunca se detiene?**
Puede ocurrir: aceptar es semidecidible, y el problema de la parada es indecidible. Por eso el simulador corta a los 5000 pasos y avisa de un «posible bucle infinito». Lo probé con una máquina que se mueve siempre a la derecha.

**9. ¿Cómo funciona el lenguaje «contiene la subcadena w»?**
Construyo el autómata con la idea del algoritmo KMP: el estado *j* significa «ya vi los primeros *j* símbolos de *w*». Con la función de fallo calculo, para cada símbolo, a qué estado ir sin perder el progreso. El último estado es final y absorbente.

**10. ¿Cómo comprobaste que tu implementación es correcta?**
Con `tests/motores.test.js` (114 pruebas): cadenas aceptadas y rechazadas de cada lenguaje, y que la simulación paso a paso da el **mismo** resultado que la evaluación directa. Además probé la interfaz completa en un navegador automatizado.

**11. ¿Cómo animaste la pila?**
En cada paso comparo la pila nueva con la anterior: los bloques de abajo que no cambiaron se quedan; los nuevos «caen» y los que se quitaron se dibujan un instante como fantasmas que suben y desaparecen.

**12. ¿Por qué separaste el motor de la interfaz?**
Para poder probar la lógica sin navegador, reutilizar la misma interfaz en los niveles 1 y 0 y poder explicar cada parte por separado. Cada motor expone `reiniciar`, `paso` y `acepta`.

**13. ¿Qué significa el estado «activo» y la traza?**
El estado activo es el estado actual del autómata en ese paso. La traza es el historial: en cada paso muestra de qué estado a cuál se pasó, qué leyó y, según el modelo, qué escribió, cómo quedó la pila o la cinta.

**14. ¿Qué es decidible en cada nivel?**
Para tipos 3, 2 y 1, saber si una cadena pertenece al lenguaje es decidible (hay un algoritmo que siempre termina). Para el tipo 0 solo es semidecidible.

**15. ¿Qué mejorarías?**
Un editor para que el usuario defina sus propios autómatas, exportar/importar en JSON, soportar autómatas no deterministas y añadir más lenguajes.

**16. ¿Por qué esa ambientación?**
Para hacer más atractivo un tema abstracto: cada modelo es una «cámara» y los niveles se recorren como en un videojuego. Es una ambientación inspirada, con diseño y sonido propios (el sonido se genera en el navegador).

## 4. Mapa de la rúbrica

| Criterio | Puntos | Qué mostrar o decir |
|---|---|---|
| **Funcionalidad** | 1.5 | Los 4 módulos funcionando; lenguaje parametrizable (Nivel 3, y también en 2 y 1); pila animada; cinta acotada con ⊢ ⊣ y cabezal bidireccional; MT con cinta infinita, alfabeto, cabezal y estado activo; cadenas de prueba dentro de la interfaz |
| **Diseño e interfaz gráfica** | 1 | Estilo coherente (videojuego + cámaras), fichas con ejemplos, vista clara/oscura, animaciones, responsive y accesible |
| **Defensa y sustentación** | 1.5 | Guion de la sección 2; dominar las preguntas 2 a 8; saber explicar una transición concreta de cada nivel |
| **Documentación y código explicado** | 1 | `README.md` (cómo ejecutar y cadenas de prueba), `docs/implementacion.md` (conceptos), comentarios en español en cada motor, pruebas automáticas |

## 5. Para repasar antes de la sustentación

- Escribe de memoria la 5-tupla del AFD y las 7-tuplas del autómata de pila y la MT.
- Sigue **a mano** `aabb` en el autómata de pila (5 pasos) y `abc` en el ALA.
- Explica con tus palabras la diferencia entre *determinista* y *no determinista*.
- Prepara un ejemplo de lenguaje de cada familia que **no** pertenezca a la anterior (aⁿbⁿ, aⁿbⁿcⁿ, y uno recursivamente enumerable que no sea sensible al contexto, como el lenguaje de la parada).
