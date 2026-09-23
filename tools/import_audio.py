"""Prepara el audio del juego a partir de packs CC0 descargados.

Uso:  python tools/import_audio.py <carpeta de origen>
Necesita: numpy, scipy, soundfile, py7zr  (pip install numpy scipy soundfile py7zr)

La carpeta de origen debe tener:
  firearms.7z                 The Free Firearm Sound Library (CC0)
  zombies/zombies/*.wav       Zombies Sound Pack (CC0)
  gunreload1.wav, assaultriflereload1.wav, shotguncock.wav   Gun Reload Sounds (CC0)
  music/menu.ogg              "Chill Main Menu Music" - Augmentality (CC0)
  music/explore.ogg           "Post Apocalyptic Wastelands" - Juhani Junkala (CC0)
  music/combat.wav            "Determined Pursuit" - Emma_MA (CC0)
  music/final.wav             "Dramatic Boss Encounter" - cynicmusic (CC0)

Escribe assets/audio/*.ogg (mono, normalizados) y assets/audio/manifest.json.
"""
import json
import os
import sys

import numpy as np
import py7zr
import soundfile as sf
from scipy.signal import resample_poly

SRC = sys.argv[1]
DST = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
SR = 44100
os.makedirs(DST, exist_ok=True)
written = []


def load(path):
    d, sr = sf.read(path, always_2d=True)
    d = d.mean(axis=1)
    if sr != SR:
        g = np.gcd(sr, SR)
        d = resample_poly(d, SR // g, sr // g)
    return d


def shape(d, fade_in=0.003, tail=0.35, peak=0.9):
    d = d.copy()
    n = int(len(d) * tail)
    if n:
        d[-n:] *= np.linspace(1, 0, n) ** 2
    k = int(SR * fade_in)
    if k:
        d[:k] *= np.linspace(0, 1, k)
    m = np.abs(d).max() or 1
    return d / m * peak


def trim_silence(d, thr=0.02):
    idx = np.where(np.abs(d) > thr * np.abs(d).max())[0]
    return d[max(0, idx[0] - 200):idx[-1] + 400] if len(idx) else d


def write(name, d, q=0.5):
    # por bloques: libsndfile en Windows desborda la pila si se le pasa todo junto
    with sf.SoundFile(os.path.join(DST, name + '.ogg'), 'w', SR, 1, format='OGG', subtype='VORBIS', compression_level=q) as fh:
        for i in range(0, len(d), 4096):
            fh.write(d[i:i + 4096].astype(np.float32))
    written.append(name)
    print(' ', name, f'{len(d) / SR:.1f}s')


def onset_slice(d, at, length):
    a = max(0, int((at - 0.02) * SR))
    return d[a:a + int(length * SR)]


# ---------------- disparos ----------------
lib = os.path.join(SRC, 'fire')
shots = {
    'pistol': ('1911/A_34P.wav', 1.54, 0.6), 'pistol_2': ('1911/A_42P.wav', None, 0.6),
    'shotgun': ('Mossberg/N_26P.wav', 0.78, 1.0), 'shotgun_2': ('Nova/O_17P.wav', 0.69, 1.0),
    'rifle': ('AR-15/D_24P.wav', 0.54, 0.45), 'rifle_2': ('AR-15/D_24P.wav', 4.02, 0.45),
}
with py7zr.SevenZipFile(os.path.join(SRC, 'firearms.7z')) as z:
    z.extract(path=lib, targets=list({'Prepared SFX Library/' + f for f, _, _ in shots.values()}))
for name, (f, at, length) in shots.items():
    d = load(os.path.join(lib, 'Prepared SFX Library', f))
    if at is None:  # primer disparo del archivo
        env = np.abs(d)
        at = np.argmax(env > 0.5 * env.max()) / SR
    write(name, shape(onset_slice(d, at, length)))

# ---------------- recargas ----------------
for src, name in [('gunreload1.wav', 'reload'), ('assaultriflereload1.wav', 'reloadRifle'), ('shotguncock.wav', 'pump')]:
    write(name, shape(trim_silence(load(os.path.join(SRC, src))), tail=0.1, peak=0.8))

# ---------------- zombies: por duración, gruñidos largos, muertes medias, ataques cortos ----------------
zdir = os.path.join(SRC, 'zombies', 'zombies')
clips = []
for f in sorted(os.listdir(zdir)):
    if f.endswith('.wav'):
        d = trim_silence(load(os.path.join(zdir, f)))
        clips.append((len(d) / SR, d))
clips.sort(key=lambda c: c[0])
n = len(clips)
groups = {'zattack': clips[: n // 3], 'zdie': clips[n // 3: 2 * n // 3], 'groan': clips[2 * n // 3:]}
for base, cs in groups.items():
    for i, (_, d) in enumerate(cs):
        write(base if i == 0 else f'{base}_{i + 1}', shape(d, tail=0.2, peak=0.85))

# ---------------- música ----------------
for name in ['menu', 'explore', 'combat', 'final']:
    f = next(os.path.join(SRC, 'music', name + ext) for ext in ('.ogg', '.wav') if os.path.exists(os.path.join(SRC, 'music', name + ext)))
    d = load(f)
    d = d / (np.abs(d).max() or 1) * 0.9
    write('music_' + name, d, q=0.7)

with open(os.path.join(DST, 'manifest.json'), 'w') as fh:
    json.dump(sorted(written), fh, indent=0)
print('ok:', len(written), 'archivos')
