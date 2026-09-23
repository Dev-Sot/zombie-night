"""Genera los sobrevivientes jugables a partir del personaje base.

Cada sobreviviente es el mismo esqueleto de animación con otra paleta
(pelo, piel, campera, remera, cierre) y, en algunos, el casco del pack
dibujado encima cuadro por cuadro. Uso:

    python tools/make_characters.py <carpeta_del_pack>

Lee assets/char/*.png (el personaje base) y escribe assets/char/<id>/*.png.
"""
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'char')
SRC = sys.argv[1] if len(sys.argv) > 1 else None
SHEETS = ['run_down', 'run_up', 'run_side', 'run_sideleft', 'idle_down', 'idle_up', 'idle_side', 'idle_sideleft', 'death_side', 'death_sideleft']
BASE = {'H': '452c34', 'h': '704f48', 'S': 'e6c2b0', 's': 'ba868f', 'P': '404351', 'G': '43735b', 'w': '9eafad', 'v': '728591'}

# id: (paleta, casco)  — casco: None | 'hard' (obrero, amarillo) | 'army' (militar, verde)
CAST = {
    'tomas': ({}, None),
    'vera': ({'H': '1c1824', 'h': '3a3048', 'S': 'b07a5e', 's': '86574c', 'P': '2a3558', 'G': '3e5a8c', 'w': 'd9c35a', 'v': '8a7a3a'}, None),
    'hugo': ({'H': '3b2a22', 'h': '5a4030', 'S': 'd9a886', 's': 'a87466', 'P': 'b8612a', 'G': 'd9c24a', 'w': 'eee6c4', 'v': 'a09060'}, 'hard'),
    'nina': ({'H': '7a2a22', 'h': 'b2522e', 'S': 'f0d2c2', 's': 'c79a92', 'P': 'c9ccd2', 'G': 'b33a3a', 'w': 'f2f2f2', 'v': '9a9aa0'}, None),
    'bruno': ({'H': '2c2420', 'h': '4a3a30', 'S': 'c89478', 's': '9a6858', 'P': '4a5236', 'G': '6b7440', 'w': '8a8a6a', 'v': '5a5a44'}, 'army'),
    # personajes de la historia (no jugables)
    'lucia': ({'H': '2a1e24', 'h': '4a3440', 'S': 'e8c0a8', 's': 'b88a86', 'P': '5f9ea0', 'G': '7fbfbf', 'w': 'e8f0f0', 'v': '9aabab'}, None),
    'ramiro': ({'H': '6b6a70', 'h': '9a99a0', 'S': 'd8ac92', 's': 'a87c70', 'P': '5a6040', 'G': '7a8050', 'w': 'b0a060', 'v': '707040'}, None),
}
HELMET_COLORS = {'hard': {'43735b': 'c98f1e', '769462': 'f2c94c'}, 'army': {}}
HELMET_SHEET = {'down': 'Helmet_Up-and-Down_Idle-and-Run-Sheet6.png', 'up': 'Helmet_Up-and-Down_Idle-and-Run-Sheet6.png',
                'side': 'Helmet_side_Idle-and-Run-Sheet6.png', 'sideleft': 'Helmet_side-left_Idle-and-Run-Sheet6.png'}


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def swap(im, mapping):
    table = {rgb(BASE[k]): rgb(v) for k, v in mapping.items()}
    out = im.copy()
    px = out.load()
    for x in range(out.width):
        for y in range(out.height):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return out


def helmet(kind, direction):
    im = Image.open(os.path.join(SRC, 'Character', 'Helmet', HELMET_SHEET[direction])).convert('RGBA')
    table = {rgb(k): rgb(v) for k, v in HELMET_COLORS[kind].items()}
    px = im.load()
    for x in range(im.width):
        for y in range(im.height):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return im


for cid, (pal, hat) in CAST.items():
    os.makedirs(os.path.join(ROOT, cid), exist_ok=True)
    for name in SHEETS:
        im = swap(Image.open(os.path.join(ROOT, name + '.png')).convert('RGBA'), pal)
        if hat and SRC and not name.startswith('death'):
            d = name.split('_', 1)[1]
            h = helmet(hat, d)
            fw, hw = im.width // 6, h.width // 6
            for i in range(6):
                im.alpha_composite(h.crop((i * hw, 0, i * hw + hw, h.height)), (i * fw, 0), (0, 1, hw, h.height))
        im.save(os.path.join(ROOT, cid, name + '.png'))
    # retrato: primer cuadro mirando al frente
    idle = Image.open(os.path.join(ROOT, cid, 'idle_down.png'))
    idle.crop((0, 0, idle.width // 6, idle.height)).save(os.path.join(ROOT, cid, 'portrait.png'))
    print(cid)
