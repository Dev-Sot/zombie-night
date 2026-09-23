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

# accesorios dibujados cuadro por cuadro sobre la cabeza/cara del personaje base
EXTRA = {
    'tomas': ['scarf'], 'vera': ['cap'], 'hugo': ['beard'], 'nina': ['longhair'], 'bruno': ['beard'],
    'lucia': ['longhair'], 'ramiro': ['beard'],
}
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


OL = rgb('2c1d35')
HAIR, SKIN, JACKET = {rgb(BASE['H']), rgb(BASE['h'])}, {rgb(BASE['S']), rgb(BASE['s'])}, {rgb(BASE['P'])}


def accessories(im, base, name, extras, pal):
    """Pinta gorra, pelo largo, barba o bufanda en cada cuadro, ubicándolos
    con las máscaras de pelo y piel del personaje base."""
    n = 6
    fw = im.width // n
    d = name.split('_', 1)[1]
    px, bp = im.load(), base.load()
    hair_d, hair_l = rgb(pal.get('H', BASE['H'])), rgb(pal.get('h', BASE['h']))

    def put(x, y, c, only_empty=False):
        if 0 <= x < im.width and 0 <= y < im.height:
            if only_empty and px[x, y][3] > 0:
                return
            px[x, y] = c + (255,)

    for f in range(n):
        x0 = f * fw
        cells = [(x, y) for x in range(x0, x0 + fw) for y in range(im.height)]
        hair = [(x, y) for x, y in cells if bp[x, y][3] and bp[x, y][:3] in HAIR]
        skin = [(x, y) for x, y in cells if bp[x, y][3] and bp[x, y][:3] in SKIN]
        if not hair:
            continue
        hy0, hy1 = min(y for _, y in hair), max(y for _, y in hair)
        low = [(x, y) for x, y in hair if y >= hy1 - 1]
        hxl, hxr = min(x for x, _ in low), max(x for x, _ in low)
        if 'cap' in extras:
            for x, y in hair:
                if y <= hy0 + 1:
                    put(x, y, rgb('2f3f66') if y == hy0 else rgb('1f2a47'))
                elif y == hy0 + 2 and d != 'up':
                    put(x, y, rgb('141a2c'))
            xs = [x for x, y in hair if y == hy0 + 1]
            if d == 'down' and xs:
                put((min(xs) + max(xs)) // 2, hy0 + 1, rgb('e8c64a'))
            if d == 'side':
                put(max(x for x, y in hair if y == hy0 + 2) + 1, hy0 + 2, rgb('141a2c'))
            if d == 'sideleft':
                put(min(x for x, y in hair if y == hy0 + 2) - 1, hy0 + 2, rgb('141a2c'))
        if 'longhair' in extras:
            cols = {'down': [hxl, hxr], 'up': list(range(hxl + 1, hxr)), 'side': [hxl, hxl + 1], 'sideleft': [hxr - 1, hxr]}.get(d, [])
            for x in cols:
                for yy in range(hy1 + 1, hy1 + (4 if d != 'up' else 3)):
                    put(x, yy, hair_l if (yy + x) % 3 == 0 else hair_d)
            if d in ('down', 'side'):
                for yy in range(hy1 + 1, hy1 + 4):
                    put(hxl - 1, yy, OL, True)
            if d in ('down', 'sideleft'):
                for yy in range(hy1 + 1, hy1 + 4):
                    put(hxr + 1, yy, OL, True)
        if 'beard' in extras and skin and d != 'up':
            sy1 = max(y for _, y in skin)
            for x, y in skin:
                if y >= sy1 - 1:
                    put(x, y, rgb('3b2419') if bp[x, y][:3] == rgb(BASE['s']) else rgb('5a3a28'))
        if 'scarf' in extras and skin:
            sy1 = max(y for _, y in skin)
            for x, y in cells:
                if sy1 < y <= sy1 + 2 and bp[x, y][3] and bp[x, y][:3] in JACKET:
                    put(x, y, rgb('a3382c'))


for cid, (pal, hat) in CAST.items():
    os.makedirs(os.path.join(ROOT, cid), exist_ok=True)
    for name in SHEETS:
        base = Image.open(os.path.join(ROOT, name + '.png')).convert('RGBA')
        im = swap(base, pal)
        if EXTRA.get(cid):
            accessories(im, base, name, EXTRA[cid], pal)
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
