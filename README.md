# Noche Sin Luna

Top-down zombie survival en pixel art. Un solo archivo (`index.html`), sin
build ni dependencias: canvas 2D, cono de linterna dinámico, oleadas
progresivas, y sonido sintetizado con Web Audio API.

**Jugar:** https://zombie-night.vercel.app

## Ejecutarlo localmente

```bash
npx serve .
# o
python3 -m http.server 8080
```

## Desplegarlo en Vercel

**Dashboard:** vercel.com → New Project → importa el repo → Framework Preset:
**Other** → Deploy.

**CLI:**
```bash
npm i -g vercel
vercel login
vercel        # preview
vercel --prod # producción
```

Cada `git push` a `main` redespliega solo.

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) para las fases planeadas (mecánicas, niveles,
multijugador, arte).

## Créditos

Sprites de personaje, zombies y objetos: *Zombie Apocalypse Tileset* por
[Ittai Manero](https://ittaimanero.itch.io/zombie-apocalypse-tileset).
