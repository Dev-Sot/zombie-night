# Roadmap

Plan de desarrollo por fases. Cada fase termina desplegada en Vercel.

## Fase 0 — Base (completa)
- [x] Prototipo jugable: movimiento, disparo, oleadas, linterna, HUD.
- [x] Despliegue en Vercel.

## Fase 1 — Nivel 1 y arte (completa)
- [x] Historia y objetivos; nivel 1 "El Apagón".
- [x] Sprites del pack *Post-Apocalypse* con 4 direcciones.
- [x] Menú principal con panel lateral sobre escena animada, pausa, ajustes, créditos.
- [x] Barrio abierto con calles, edificios con colisión, tienda y monedas, lluvia.

## Fase 2 — Reescritura y tres noches (completa)
- [x] Arquitectura en módulos ES (`src/core`, `src/game`, `src/ui`), bucle de
      paso fijo a 60 Hz con cámara lenta y hitstop.
- [x] Edificios en perspectiva 3/4 (techo + fachada), orden por profundidad,
      colisión por "pie" de cada prop, pathfinding con campo de flujo.
- [x] Arma visible en la mano que rota con la mira; bate con golpe en arco.
- [x] Inventario: 4 armas (1-4 / rueda), munición por tipo, vendas y botiquines (Q).
- [x] 6 zombies: caminante, corredor, lanzador de hachas, bruto, tóxico, jefe.
- [x] Nivel 2 "La Señal" (niebla, defender la antena) y Nivel 3 "El Rescate"
      (tormenta, bengalas, jefe, helicóptero).
- [x] Cinemáticas de entrada/salida, subtítulos, resultados con rango y progreso guardado.
- [x] Música procedural adaptativa por nivel y ambiente (lluvia, viento, tormenta).
- [x] Barriles explosivos en cadena, faroles que titilan, relámpagos.

## Fase 3 — Pulido (siguiente)
- [ ] Audio grabado con licencia libre (CC0) como opción sobre la síntesis
      (`assets/audio/manifest.json`).
- [ ] Balance de dificultad con partidas reales.
- [ ] Controles táctiles / gamepad.
- [ ] Más variedad de props interiores y zonas por nivel.

## Fase 4 — Multijugador
- [ ] Salas por código para hasta 4 jugadores (WebRTC peer-to-peer).
- [ ] Sincronización: el anfitrión simula, los demás envían input. La
      arquitectura ya separa el `control` de cada jugador y guarda a todos en
      `S.players`.
- [ ] Nivel 4 "Juntos" y chat de sala.
