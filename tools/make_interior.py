"""Genera el mobiliario y los pisos del Mundo 2 (hospital) en pixel art.

El pack principal no trae interiores, así que se dibujan acá con su misma
paleta (contorno #2c1d35, grises fríos, blancos rosados) y perspectiva 3/4:
cara superior clara y frente más oscuro. Uso:

    python tools/make_interior.py [carpeta_del_pack]

Con la carpeta del pack además arma la ambulancia (a partir de la camioneta)
y la puerta entreabierta.
"""
import os
import random
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'env')
PICK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'pickups')
random.seed(7)

OL = '#2c1d35'
C = {
    'ol': OL, 'd1': '#474059', 'd2': '#5e5d6b', 'g1': '#7c7c87', 'g2': '#a39095', 'w1': '#cccacb', 'w2': '#e6e2dc',
    'b1': '#534d70', 'b2': '#6d7ba6', 'b3': '#9da8c6', 'sky': '#7898b3', 'teal': '#657d82', 'teal2': '#8fa7a6',
    'r1': '#33101c', 'r2': '#57263b', 'r3': '#7a2a3a', 'r4': '#964851', 'wd1': '#5c393d', 'wd2': '#704f48', 'wd3': '#8c6a5a',
    'gr1': '#3f5c46', 'gr2': '#4f7a4f', 'gr3': '#6f9a5a', 'y1': '#ffcf6b', 'cur': '#7f9f8a', 'cur2': '#6a8a76',
}


def img(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def hexc(c):
    c = C.get(c, c).lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def rect(im, x, y, w, h, c):
    col = hexc(c)
    for i in range(x, x + w):
        for j in range(y, y + h):
            if 0 <= i < im.width and 0 <= j < im.height:
                im.putpixel((i, j), col)


def box(im, x, y, w, h, top, front, fh, ol=True):
    """Caja en 3/4: tapa (alto h-fh) y frente (alto fh), con contorno."""
    if ol:
        rect(im, x, y, w, h, 'ol')
        x, y, w, h = x + 1, y + 1, w - 2, h - 2
    rect(im, x, y, w, h - fh, top)
    rect(im, x, y + h - fh, w, fh, front)


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), hexc(c))


def save(im, name, folder=OUT):
    im.save(os.path.join(folder, name + '.png'))
    print(f'{name:18s} {im.size}')


# ---------------- pisos 16x16 ----------------
def floor_tile(base, grout, speck, stain=False):
    im = img(16, 16)
    rect(im, 0, 0, 16, 16, base)
    rect(im, 0, 0, 16, 1, grout)
    rect(im, 0, 0, 1, 16, grout)
    rect(im, 8, 0, 1, 16, grout)
    rect(im, 0, 8, 16, 1, grout)
    for _ in range(4):
        px(im, random.randrange(1, 16), random.randrange(1, 16), speck)
    if stain:
        for _ in range(14):
            px(im, 9 + random.randrange(-3, 4), 11 + random.randrange(-2, 3), random.choice(['r2', 'r3']))
    return im


save(floor_tile('#8b9a9c', '#6f7d80', '#a3b0b0'), 'int_floor')
save(floor_tile('#8b9a9c', '#6f7d80', '#a3b0b0', stain=True), 'int_floor_blood')
lino = img(16, 16)
rect(lino, 0, 0, 16, 16, '#5d6778')
for y in (3, 11):
    rect(lino, 0, y, 16, 1, '#566072')
px(lino, 5, 7, '#6d788a'); px(lino, 12, 14, '#6d788a')
save(lino, 'int_lino')

# ---------------- muebles ----------------
bed = img(18, 30)
box(bed, 0, 0, 18, 30, 'g1', 'd1', 5)
rect(bed, 2, 2, 14, 21, 'w1')           # colchón
rect(bed, 3, 3, 12, 5, 'w2')            # almohada
rect(bed, 2, 12, 14, 11, 'teal')        # manta
rect(bed, 2, 12, 14, 1, 'teal2')
rect(bed, 2, 23, 14, 1, 'd2')
for x in (2, 15):
    rect(bed, x, 25, 1, 3, 'ol')
save(bed, 'int_bed')
bedb = bed.copy()
for _ in range(26):
    px(bedb, random.randrange(4, 14), random.randrange(9, 21), random.choice(['r2', 'r3', 'r4']))
save(bedb, 'int_bed_blood')

gur = img(14, 22)
box(gur, 1, 2, 12, 16, 'w1', 'g1', 3)
rect(gur, 3, 4, 8, 3, 'w2')
for x in (2, 11):
    rect(gur, x, 18, 1, 3, 'd2')
    px(gur, x, 21, 'ol')
save(gur, 'int_gurney')

lock = img(14, 24)
box(lock, 0, 0, 14, 24, 'b3', 'b2', 19)
rect(lock, 6, 6, 1, 16, 'b1')
for y in (8, 10, 12):
    rect(lock, 2, y, 3, 1, 'b1'); rect(lock, 8, y, 3, 1, 'b1')
px(lock, 5, 15, 'w1'); px(lock, 8, 15, 'w1')
save(lock, 'int_locker')
lopen = lock.copy()
rect(lopen, 7, 5, 6, 17, OL)
rect(lopen, 8, 6, 4, 15, 'd1')
save(lopen, 'int_locker_open')

med = img(22, 24)
box(med, 0, 0, 22, 24, 'w1', 'g2', 18)
rect(med, 2, 7, 18, 14, 'd1')
for y in (11, 16):
    rect(med, 2, y, 18, 1, 'g2')
for x, y, c in [(4, 9, 'r4'), (8, 9, 'w2'), (13, 9, 'b3'), (5, 14, 'y1'), (11, 14, 'r3'), (15, 19, 'w2')]:
    rect(med, x, y, 2, 2, c)
rect(med, 9, 2, 4, 1, 'r3'); rect(med, 10, 1, 2, 3, 'r3')
save(med, 'int_medcab')
medo = med.copy()
rect(medo, 2, 7, 18, 14, 'd1')
for y in (11, 16):
    rect(medo, 2, y, 18, 1, 'g2')
save(medo, 'int_medcab_open')

desk = img(30, 20)
box(desk, 0, 4, 30, 16, 'wd3', 'wd1', 6)
rect(desk, 4, 0, 10, 8, OL)
rect(desk, 5, 1, 8, 5, 'sky')
rect(desk, 8, 7, 2, 2, 'd1')
rect(desk, 17, 7, 8, 3, 'd2')
rect(desk, 17, 7, 8, 1, 'g1')
save(desk, 'int_desk')

cnt = img(48, 20)
box(cnt, 0, 0, 48, 20, 'g2', '#755861', 9)
rect(cnt, 1, 12, 46, 1, 'w1')
rect(cnt, 6, 2, 8, 5, OL); rect(cnt, 7, 3, 6, 3, 'sky')
rect(cnt, 30, 3, 6, 3, 'w2')
save(cnt, 'int_counter')

iv = img(9, 24)
rect(iv, 4, 4, 1, 18, 'g1')
rect(iv, 2, 2, 5, 1, 'g1')
rect(iv, 1, 3, 3, 6, OL); rect(iv, 2, 4, 1, 4, 'b3')
rect(iv, 1, 22, 7, 1, 'd2')
save(iv, 'int_iv')

cur = img(26, 24)
rect(cur, 0, 0, 26, 2, 'g1')
for x in range(1, 25):
    col = 'cur' if (x // 3) % 2 == 0 else 'cur2'
    rect(cur, x, 2, 1, 20, col)
rect(cur, 1, 21, 24, 1, 'gr1')
rect(cur, 0, 0, 26, 1, OL)
save(cur, 'int_curtain')

ch = img(32, 14)
for i in range(3):
    x = 1 + i * 10
    box(ch, x, 1, 10, 11, 'b2', 'b1', 4)
    rect(ch, x + 2, 2, 6, 3, 'b3')
rect(ch, 1, 12, 30, 1, 'd1')
save(ch, 'int_chairs')

wc = img(14, 16)
rect(wc, 1, 6, 12, 9, OL)
rect(wc, 2, 7, 10, 7, 'd1')
rect(wc, 3, 2, 8, 7, OL); rect(wc, 4, 3, 6, 5, 'b2')
rect(wc, 3, 9, 8, 3, 'b2')
px(wc, 2, 14, 'g1'); px(wc, 11, 14, 'g1')
save(wc, 'int_wheelchair')

pl = img(12, 18)
rect(pl, 3, 11, 6, 7, OL); rect(pl, 4, 12, 4, 5, 'wd2')
for _ in range(30):
    x, y = 6 + random.randint(-5, 5), 6 + random.randint(-5, 5)
    if (x - 6) ** 2 + (y - 6) ** 2 < 28:
        px(pl, x, y, random.choice(['gr1', 'gr2', 'gr3']))
save(pl, 'int_plant')

shelf = img(28, 26)
box(shelf, 0, 0, 28, 26, 'wd2', 'wd1', 20)
for y in (8, 14, 20):
    rect(shelf, 2, y, 24, 1, 'wd3')
for _ in range(14):
    x, y = random.randrange(3, 24), random.choice([5, 11, 17])
    rect(shelf, x, y, 2, 3, random.choice(['w1', 'r4', 'b3', 'y1', 'gr3']))
save(shelf, 'int_shelf')

# cartel de sala (se pega en la pared)
sign = img(20, 7)
rect(sign, 0, 0, 20, 7, OL); rect(sign, 1, 1, 18, 5, 'teal')
save(sign, 'int_sign')

# ---------------- objetos para agarrar ----------------
card = img(11, 8)
rect(card, 0, 0, 11, 8, OL); rect(card, 1, 1, 9, 6, 'w1')
rect(card, 1, 2, 9, 1, 'b2'); rect(card, 2, 4, 2, 2, 'y1')
save(card, 'keycard', PICK)
kit = img(12, 10)
rect(kit, 0, 1, 12, 9, OL); rect(kit, 1, 2, 10, 7, 'w2')
rect(kit, 5, 3, 2, 5, 'r3'); rect(kit, 3, 5, 6, 1, 'r3')
rect(kit, 4, 0, 4, 2, OL)
save(kit, 'surgkit', PICK)

# ---------------- desde el pack: ambulancia y puerta entreabierta ----------------
if len(sys.argv) > 1:
    SRC = sys.argv[1]
    van = Image.open(os.path.join(SRC, 'Objects/Vehicles/Normal/Car_3_Van/Car_3_Blue_Van.png')).convert('RGBA')
    amb = van.copy()
    # franja azul de la pintura -> roja; los vidrios quedan como están
    swap = {(0x6d, 0x7b, 0xa6): hexc('#964851'), (0x9d, 0xa8, 0xc6): hexc('#b86a66')}
    for x in range(amb.width):
        for y in range(amb.height):
            p = amb.getpixel((x, y))
            if p[3] > 10 and p[:3] in swap:
                amb.putpixel((x, y), swap[p[:3]])
    # cruz roja y barra de luces sobre el techo
    cx, cy = amb.width // 2, 6
    rect(amb, cx - 1, cy - 3, 3, 7, 'r3'); rect(amb, cx - 3, cy - 1, 7, 3, 'r3')
    rect(amb, cx - 6, 1, 4, 2, OL); rect(amb, cx - 5, 1, 2, 1, 'r4')
    rect(amb, cx + 3, 1, 4, 2, OL); rect(amb, cx + 4, 1, 2, 1, 'b3')
    save(amb, 'ambulance')
    Image.open(os.path.join(SRC, 'Objects/Buildings/Door_2_Ajar_Beige.png')).convert('RGBA').save(os.path.join(OUT, 'door_ajar.png'))
    print('door_ajar')
