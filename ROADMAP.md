# Roadmap

Plan de desarrollo por fases. Cada fase se cierra con un release desplegado
en Vercel antes de pasar a la siguiente.

## Fase 0 — Base (completa)
- [x] Prototipo jugable: movimiento, disparo, oleadas, linterna, HUD.
- [x] Despliegue en Vercel.

## Fase 1 — Nivel 1 pulido (completa)
- [x] Historia y sistema de objetivos (no solo sobrevivir oleadas infinitas).
- [x] Nivel 1 "El Apagón": buscar 3 bidones de combustible y encender el
      generador para atraer la oleada final.
- [x] Selección de nivel (Nivel 1 jugable, 2-4 "próximamente").
- [x] Música de fondo procedural (capa adicional sobre el drone ambiental).
- [x] Sprites reales (jugador, 3 tipos de zombie, arma, auto, pickups) del
      *Zombie Apocalypse Tileset* — reemplazan el dibujo por rectángulos.
- [x] Pulido: vida en corazones, HUD de arma/objetivo con íconos de
      inventario, suelo con textura real, más props (conos, cercas, arbustos,
      señales), sonido de disparo mejorado, se quitaron todos los emojis de
      la interfaz.

## Fase 1.5 — Rediseño de arte y ambiente (en curso)
Objetivo: que se sienta una experiencia dirigida (juego + película), no un
mapa vacío con props sueltos.
- [x] Linterna con on/off (tecla F) — apagada deja solo un radio de visión
      mínimo, mucho más tenso.
- [x] Parche temporal del arma en la mano (visible de perfil) mientras se
      decide el cambio de pack de personajes.
- [ ] Cambiar personaje/zombies/armas a un pack con animaciones de
      apuntado/disparo reales (ver decisión de assets abajo).
- [ ] Mapa real con calles/edificios en vez de props sueltos sobre una
      arena vacía.
- [ ] Música ambiental (evaluar opciones con licencia clara, no de YouTube
      directo — ver notas de assets).

### Decisión de assets (para no perder coherencia visual mezclando packs)
El usuario compartió varios packs de itch.io para evaluar. Veredicto:
- **thelazystone "Post-Apocalypse Pixel Art Asset Pack"** — SÍ, es el
  principal candidato: +3300 sprites, top-down, incluye personaje y 3
  zombies con animaciones de disparo/ataque/recarga reales, +550 edificios,
  UI de vida/munición/inventario ya hecha. Gratis para uso no comercial,
  USD 2 sugerido para uso comercial (barato, vale la pena pagarlo dado que
  sería la base visual de todo el juego).
- **domin-dev "Free Pixel Survival Items Pack"** — opcional, de apoyo:
  100 ítems (comida, munición, ropa) a 32x32, gratis, buena licencia.
- **maxparata "Isometric Zombie Apocalypse"** — NO: es isométrico, no
  top-down; mezclarlo se vería roto. Tampoco es gratis (mínimo sugerido
  €9.95).
- **toffeecraft "Zombie Dead Cats"** — NO: tono cómico/tierno, rompe la
  atmósfera de terror que se busca. Tampoco es gratis.
- **terry-caster "Z Pixel Pack"** y **fkgcluster "Survival Buildings"** —
  se dejan de lado por ahora: info de perspectiva/licencia ambigua y el
  pack de thelazystone ya cubre lo mismo con más contenido y consistencia.

## Fase 2 — Nivel 2: "La Señal" (bloqueado, próximamente)
- [ ] Objetivo: encontrar la radio de la policía y pedir ayuda.

## Fase 3 — Nivel 3: "El Rescate" (bloqueado, próximamente)
- [ ] Objetivo: llegar al punto de extracción final.

## Fase 4 — Nivel 4 / Multijugador (bloqueado, próximamente)
- [ ] Definir arquitectura para hasta 4 jugadores (co-op local primero,
      online después si aplica).

## Mecánicas adicionales (se evalúan según cómo evolucione el nivel 1)
- [ ] Colisión con props (cobertura táctica).
- [ ] Segunda arma (escopeta / cuchillo) — el asset pack ya trae los sprites,
      falta la lógica de cambio de arma (teclas 1/2/3).
- [ ] Perks entre oleadas.
- [ ] Controles táctiles para móvil.
- [ ] Usar el resto del tileset sin explotar todavía (calles, edificios,
      gasolinera, granja) para darle más variedad al mapa — pendiente para
      cuando se trabaje el Nivel 2.

---

Las referencias visuales (Pinterest, otros juegos, etc.) se agregan como
issues o se discuten antes de empezar cada fase, para no romper el estilo ya
definido en el juego.
