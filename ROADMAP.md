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

## Fase 3 — Multijugador (completa)
- [x] Salas por código de 5 letras y enlace de invitación, hasta 4 jugadores (WebRTC con PeerJS).
- [x] Anfitrión autoritativo: los clientes mandan input, reciben snapshots a
      20 Hz y predicen su propio movimiento.
- [x] Revivir compañeros, colores y nombres por jugador, dificultad escalada por equipo.

## Fase 4 — Pesadilla (completa)
- [x] Dificultad Pesadilla y progresión de armas.
- [x] Modo supervivencia con récords.
- [x] Chat de sala y marcas en el mapa.
- [x] Joystick y controles táctiles.
- [x] Sonido real CC0 (disparos, zombies, recargas, música).
- [x] Hacha, zombie gritón y zombie hinchado.

## Fase 5 — Mundo 2: El Hospital (siguiente)
El helicóptero no llega lejos: se queda sin combustible y cae en el distrito
del hospital. Por la radio se escucha a Lucía, una enfermera atrapada en la
sala de cuarentena del Hospital San Rafael.

**Noche 4 · Aterrizaje forzoso.** Parque destruido junto al hospital. El
piloto quedó herido: hay que conseguirle un botiquín en la farmacia de la
esquina (primer interior con puertas) y defender el helicóptero caído.

**Noche 5 · San Rafael.** El hospital por dentro: pasillos, habitaciones con
puertas que se abren con E, armarios para revisar, y la tarjeta de acceso a
cuarentena. Hay que restablecer el generador de emergencia para abrir las
puertas eléctricas. Luces que parpadean y zombies con uniforme de enfermero.

**Noche 6 · La salida.** Escoltar a Lucía (un personaje que te sigue y al que
los zombies pueden atrapar) hasta la ambulancia del estacionamiento. Jefe:
el Paciente Cero.

Mecánicas nuevas que trae:
- [ ] Interiores: techos que desaparecen al entrar y puertas que se abren con E.
- [ ] Contenedores para revisar (armarios, cajones) con botín al azar.
- [ ] Puertas cerradas con llave o tarjeta.
- [ ] Personajes a rescatar y escoltar (NPC con su propia IA).
- [ ] Jefe nuevo: el Paciente Cero.
- [ ] Selector de mundos en el menú.

## Más adelante
- [ ] Servidor TURN propio para redes muy restrictivas (hoy se usan los STUN públicos).
- [ ] Balance fino de dificultad con partidas reales.
- [ ] Logros y estadísticas globales.
