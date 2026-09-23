<div align="center">

![Noche Sin Luna](docs/social-preview.png)

# Noche Sin Luna

**Supervivencia zombie top-down en pixel art, para jugar solo o con hasta 3 amigos online.**

[![Jugar ahora](https://img.shields.io/badge/JUGAR_AHORA-zombie--night.vercel.app-e8483f?style=for-the-badge)](https://zombie-night.vercel.app)

![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?style=flat-square)
![Web Audio](https://img.shields.io/badge/Audio-Web_Audio_API-7cc4ff?style=flat-square)
![WebRTC](https://img.shields.io/badge/Online-WebRTC_P2P-7cff8f?style=flat-square)
![Sin build](https://img.shields.io/badge/build-ninguno-8a8699?style=flat-square)

</div>

---

Tres noches, una ciudad sin luz. Devolvé la electricidad al barrio, pedí
ayuda por radio desde la comisaría y resistí en la granja hasta que llegue el
helicóptero. Cada noche tiene su clima, su historia y su forma de terminar.

<table>
  <tr>
    <td><img src="docs/screenshots/noche1.png" alt="Noche 1: El Apagón"></td>
    <td><img src="docs/screenshots/noche2.png" alt="Noche 2: La Señal"></td>
  </tr>
  <tr>
    <td align="center"><b>Noche 1 · El Apagón</b><br>Barrio bajo la lluvia</td>
    <td align="center"><b>Noche 2 · La Señal</b><br>El centro, cubierto de niebla</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/noche3.png" alt="Noche 3: El Rescate"></td>
    <td><img src="docs/screenshots/coop.png" alt="Cooperativo online"></td>
  </tr>
  <tr>
    <td align="center"><b>Noche 3 · El Rescate</b><br>Tormenta, el Gigante y el helicóptero</td>
    <td align="center"><b>Juntos</b><br>Cooperativo online de 2 a 4 jugadores</td>
  </tr>
</table>

## Características

- **Tres niveles con historia**: objetivos por pasos (juntar, llevar, activar,
  defender una zona, sobrevivir, jefe final) en vez de oleadas infinitas.
- **Cooperativo online de 2 a 4 jugadores**: uno crea una sala, comparte un
  código de 5 letras (o un enlace) y el resto se une desde el navegador. Si
  un compañero cae, se lo revive manteniendo **E** a su lado.
- **Presentación cinematográfica**: franjas de cine, travelling de cámara al
  objetivo, subtítulos, cámara lenta, viñeta y grano de película, y
  resultados con rango C / B / A / S.
- **Arsenal e inventario**: bate, pistola, escopeta y rifle automático con el
  arma visible en la mano, vendas y botiquines, y una tienda con monedas.
- **Seis tipos de zombie**: caminante, corredor, lanzador de hachas, bruto,
  tóxico y el Gigante. Rodean los edificios buscando el camino más corto.
- **Mapas en perspectiva 3/4**: calles, veredas, cruces peatonales, edificios
  con techo y fachada, autos como cobertura y barriles que explotan en cadena.
- **Iluminación dinámica**: linterna, faroles que titilan, fogonazos, bengalas
  y relámpagos.
- **Sonido real**: disparos grabados de armas reales, zombies, recargas y
  música que cambia entre exploración, combate y jefe (todo CC0), con
  síntesis procedural de respaldo.

## Cómo jugar

| Tecla | Acción |
|---|---|
| **WASD** | moverse |
| **Mouse / clic** | apuntar / disparar |
| **Espacio** | esquivar |
| **R** | recargar |
| **1-4 / rueda** | cambiar arma |
| **Q** | curarse |
| **E** | interactuar / tienda |
| **Mantener E** | revivir a un compañero |
| **F** | linterna |
| **ESC** | pausa |

### Jugar con amigos

1. En el menú principal, entrá a **JUNTOS** y tocá **CREAR SALA**.
2. Pasale el código (o el botón **COPIAR ENLACE**) a tus amigos.
3. Ellos entran a **JUNTOS**, escriben el código y tocan **UNIRSE**.
4. El anfitrión elige la noche y toca **EMPEZAR**.

No hace falta cuenta ni instalar nada. La conexión es directa entre
navegadores (WebRTC); el anfitrión simula la partida y los demás reciben el
estado unas 20 veces por segundo, con predicción local del movimiento.

## Desarrollo

El juego no tiene build ni dependencias: son módulos ES nativos servidos como
archivos estáticos. Hace falta un servidor local (abrir `index.html` directo no
funciona por los módulos):

```bash
npm run dev          # npx serve .
# o
python -m http.server 8080
```

`npm run check` verifica la sintaxis de todos los módulos.

### Estructura

```
index.html, styles.css   interfaz (menús, HUD, sala) en DOM
src/main.js              arranque: carga de sprites, UI y bucle
src/core/                motor: render, input, audio, assets, guardado
src/game/                juego: mundo, jugador, armas, zombies, objetivos, niveles
src/net/                 multijugador: salas (net.js) y snapshots (sync.js)
src/ui/ui.js             menús, HUD, tienda, subtítulos, sala
assets/                  sprites y audio opcional
docs/                    capturas
tools/                   importador de assets y chequeo de sintaxis
```

Los niveles son datos en [`src/game/levels.js`](src/game/levels.js): un nivel
nuevo se arma describiendo calles, edificios, props, spawns y su lista de
objetivos.

### Arquitectura en breve

- **Bucle de paso fijo a 60 Hz** con acumulador, cámara lenta (`timeScale`) y
  hitstop.
- **Resolución interna de 384×216** escalada sin suavizado; HUD y menús en DOM
  encima del canvas.
- **Orden por profundidad** (painter's algorithm por la línea de los pies) y
  colisión por hash espacial.
- **Pathfinding por campo de flujo**: un BFS desde todos los jugadores cada
  1/3 de segundo, que los zombies siguen cuesta abajo.
- **Red autoritativa del anfitrión**: los clientes mandan input; el anfitrión
  manda snapshots compactos y los efectos (sangre, explosiones, sonidos) como
  eventos que cada cliente reproduce.

## Despliegue

Cada push a `main` se despliega automáticamente en Vercel como sitio estático.

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) y el historial en [CHANGELOG.md](CHANGELOG.md).

## Créditos

- Personajes, zombies, armas y escenarios: *Post-Apocalypse Pixel Art Asset
  Pack* por [TheLazyStone](https://thelazystone.itch.io/post-apocalypse-pixel-art-asset-pack).
- Objetos recogibles: *Zombie Apocalypse Tileset* por
  [Ittai Manero](https://ittaimanero.itch.io/zombie-apocalypse-tileset).
- Disparos: *The Free Firearm Sound Library* (Jaszczak, Nelson, Heras, Nanney) · CC0.
- Zombies: *Zombies Sound Pack* (Summoning Wars) · CC0. Recargas: *Gun Reload Sounds* · CC0.
- Música (CC0): *Chill Main Menu Music* de Augmentality, *Post Apocalyptic
  Wastelands* de Juhani Junkala, *Determined Pursuit* de Emma_MA y *Dramatic
  Boss Encounter* de cynicmusic, todas vía [OpenGameArt](https://opengameart.org).
- Fuente: *Press Start 2P* por CodeMan38 (SIL Open Font License).
- Conexiones en red: [PeerJS](https://peerjs.com) (MIT).

## Licencia

El código es [MIT](LICENSE). Los sprites pertenecen a sus autores y se usan
según las licencias de sus packs; no están cubiertos por la licencia MIT.
