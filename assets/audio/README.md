# Audio

El juego usa estas grabaciones CC0 (generadas con `tools/import_audio.py`) y
sintetiza en tiempo real (`src/core/audio.js`) todo lo que no tenga archivo.
Para reemplazar un efecto o una pista por una grabación, poné el `.ogg` acá
y agregá su nombre (sin extensión) a `manifest.json`.

Efectos: `pistol`, `shotgun`, `rifle`, `explosion`, `thunder`, `groan`, `hurt`
Música: `music_menu`, `music_explore`, `music_combat`, `music_final`

Usá solo audio con licencia que permita redistribución (CC0 / CC-BY con crédito).
