# Noche Sin Luna

Supervivencia zombie top-down en pixel art. Tres noches, una ciudad sin luz:
devolvé la electricidad al barrio, pedí ayuda por radio desde la comisaría y
resistí en la granja hasta que llegue el helicóptero.

**Jugar:** https://zombie-night.vercel.app

## Características

- **3 niveles con historia** y objetivos por pasos (juntar, llevar, activar,
  defender una zona, sobrevivir, jefe final), cada uno con su clima: lluvia,
  niebla y tormenta eléctrica.
- **Cinemáticas**: franjas de cine, travelling de cámara hacia el objetivo,
  subtítulos, cámara lenta y resultados con rango (C / B / A / S).
- **Arsenal e inventario**: bate, pistola, escopeta y rifle automático con el
  arma visible en la mano; vendas y botiquines; tienda con monedas (tecla E).
- **6 tipos de zombie**: caminante, corredor, lanzador de hachas, bruto,
  tóxico y el Gigante. Rodean edificios con pathfinding (campo de flujo).
- **Mapas de barrio en perspectiva 3/4**: calles, veredas, cruces peatonales,
  edificios con techo y fachada, autos y props con colisión, barriles que
  explotan en cadena.
- **Iluminación dinámica**: linterna (F), faroles que titilan, fogonazos,
  bengalas y relámpagos.
- **Audio 100% procedural**: efectos sintetizados y música adaptativa que se
  intensifica cuando la horda se acerca.

## Controles

| Tecla | Acción |
|---|---|
| WASD | moverse |
| Mouse / clic | apuntar / disparar |
| Espacio | esquivar |
| R | recargar |
| 1-4 / rueda | cambiar arma |
| Q | curarse |
| E | interactuar / tienda |
| F | linterna |
| ESC | pausa |

## Ejecutarlo localmente

El juego usa módulos ES nativos, así que necesita un servidor local (abrir
`index.html` directo no funciona):

```bash
npm run dev          # npx serve .
# o
python -m http.server 8080
```

`npm run check` verifica la sintaxis de todos los módulos.

## Estructura

```
index.html, styles.css     interfaz (menús, HUD) en DOM
src/main.js                arranque: carga, UI, bucle
src/core/                  motor: render, input, audio, assets, guardado
src/game/                  juego: mundo, jugador, armas, zombies, objetivos, niveles
src/ui/ui.js               menús, HUD, tienda, subtítulos
assets/                    sprites (ver créditos) y audio opcional
tools/                     importador de assets y chequeo de sintaxis
```

Los niveles son datos puros en `src/game/levels.js`: agregar uno nuevo es
describir calles, edificios, props, spawns y la lista de objetivos.

## Despliegue

Cada push a `main` se despliega automáticamente en Vercel (sitio estático,
sin build).

## Roadmap

Ver [ROADMAP.md](ROADMAP.md).

## Créditos

- Personajes, zombies, armas y escenarios: *Post-Apocalypse Pixel Art Asset
  Pack* por [TheLazyStone](https://thelazystone.itch.io/post-apocalypse-pixel-art-asset-pack).
- Objetos recogibles: *Zombie Apocalypse Tileset* por
  [Ittai Manero](https://ittaimanero.itch.io/zombie-apocalypse-tileset).
- Fuente: *Press Start 2P* por CodeMan38 (SIL Open Font License).
