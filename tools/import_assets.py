"""Copia/recorta los sprites del pack "Post-Apocalypse Pixel Art Asset Pack"
(TheLazyStone, itch.io) hacia assets/ con nombres limpios.

El pack no se versiona (su licencia no permite redistribuirlo suelto), solo
los sprites que el juego usa. Uso:

    python tools/import_assets.py <carpeta_del_pack_descomprimido>

Requiere Pillow (pip install Pillow).
"""
import os
import re
import sys
from PIL import Image

if len(sys.argv) < 2:
    sys.exit(__doc__)

SRC = sys.argv[1]
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
TILE = 16
DIRS = {'down': 'Down', 'up': 'Up', 'side': 'Side', 'sideleft': 'Side-left'}
CHAR_DIRS = {'down': 'down', 'up': 'up', 'side': 'side', 'sideleft': 'side-left'}


def out(path):
    full = os.path.join(DST, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    return full


def copy(src_rel, dst_rel):
    im = Image.open(os.path.join(SRC, src_rel)).convert('RGBA')
    im.save(out(dst_rel))
    frames = re.search(r'Sheet(\d+)', src_rel)
    print(f'{dst_rel:42s} {im.size} {"frames=" + frames.group(1) if frames else ""}')


def crop(src_rel, box, dst_rel):
    im = Image.open(os.path.join(SRC, src_rel)).convert('RGBA').crop(box)
    im.save(out(dst_rel))
    print(f'{dst_rel:42s} {im.size}')


def tile(src_rel, cx, cy, dst_rel):
    crop(src_rel, (cx * TILE, cy * TILE, cx * TILE + TILE, cy * TILE + TILE), dst_rel)


# ---------------- jugador (sin manos: el arma se dibuja aparte y rota) ----------------
for d, name in CHAR_DIRS.items():
    copy(f'Character/Main/Run/Character_{name}_run_no-hands-Sheet6.png', f'char/run_{d}.png')
    copy(f'Character/Main/Idle/Character_{name}_idle_no-hands-Sheet6.png', f'char/idle_{d}.png')
copy('Character/Main/Death/Character_side_death1_NoHands-Sheet6.png', 'char/death_side.png')
copy('Character/Main/Death/Character_side-left_death1_NoHands-Sheet6.png', 'char/death_sideleft.png')

# ---------------- armas (sprites de costado, empuñadura a la izquierda) ----------------
copy('Objects/Pickable/Pistol.png', 'weapons/pistol.png')
copy('Objects/Pickable/Shotgun.png', 'weapons/shotgun.png')
copy('Objects/Pickable/Gun.png', 'weapons/rifle.png')
copy('Objects/Pickable/Bat.png', 'weapons/bat.png')

# ---------------- efectos ----------------
copy('Character/Guns/Fire/Fire_side-Sheet3.png', 'fx/muzzle.png')
copy('Enemies/Shot/shot_1-Sheet3.png', 'fx/blood1.png')
copy('Enemies/Shot/shot_2-Sheet3.png', 'fx/blood2.png')
copy('Enemies/Zombie_Axe/Axe/Axe_Side_Thrown-Sheet9.png', 'fx/axe_spin.png')
copy('Enemies/Zombie_Axe/Axe/Axe_Side_Landed.png', 'fx/axe_landed.png')
copy('Enemies/Zombie_Axe/Axe/Axe_Side_Landed.png', 'weapons/axe.png')
copy('Enemies/Zombie_Axe/Axe/Axe_Side_Landed.png', 'ui/icon_axe.png')

# ---------------- zombies ----------------
ZB = 'Enemies'
for d, name in DIRS.items():
    # caminante: zombie del hacha pero sin hacha
    copy(f'{ZB}/Zombie_Axe/No-Axe/Zombie_Axe_No-axe_{name}_Walk-Sheet8.png', f'zombies/walker_walk_{d}.png')
    copy(f'{ZB}/Zombie_Axe/No-Axe/Zombie_Axe_No-axe_{name}_First-Attack-Sheet7.png', f'zombies/walker_attack_{d}.png')
    # lanzador: el mismo zombie, con hacha (ataque a distancia)
    copy(f'{ZB}/Zombie_Axe/Zombie_Axe_{name}_Walk-Sheet8.png', f'zombies/thrower_walk_{d}.png')
    copy(f'{ZB}/Zombie_Axe/Zombie_Axe_{name}_Second-Attack-Sheet9.png', f'zombies/thrower_attack_{d}.png')
    # corredor: zombie chico
    walk = 'walk' if name == 'Down' else 'Walk'
    copy(f'{ZB}/Zombie_Small/Zombie_Small_{name}_{walk}-Sheet6.png', f'zombies/runner_walk_{d}.png')
    copy(f'{ZB}/Zombie_Small/Zombie_Small_{name}_First-Attack-Sheet4.png', f'zombies/runner_attack_{d}.png')
    # bruto: zombie grande
    copy(f'{ZB}/Zombie_Big/Zombie_Big_{name}_Walk-Sheet8.png', f'zombies/brute_walk_{d}.png')
    copy(f'{ZB}/Zombie_Big/Zombie_Big_{name}_First-Attack-Sheet8.png', f'zombies/brute_attack_{d}.png')
for d, name in (('side', 'Side'), ('sideleft', 'Side-left')):
    copy(f'{ZB}/Zombie_Axe/No-Axe/Zombie_Axe_No-axe_{name}_First-Death-Sheet6.png', f'zombies/walker_death_{d}.png')
    copy(f'{ZB}/Zombie_Axe/Zombie_Axe_{name}_First-Death-Sheet6.png', f'zombies/thrower_death_{d}.png')
    copy(f'{ZB}/Zombie_Small/Zombie_Small_{name}_First-Death-Sheet6.png', f'zombies/runner_death_{d}.png')
    copy(f'{ZB}/Zombie_Big/Zombie_Big_{name}_First-Death-Sheet7.png', f'zombies/brute_death_{d}.png')

# ---------------- suelos (tiles 16x16 de los tilesets de fondo) ----------------
DG = 'Tiles/Background_Dark-Green_TileSet.png'
BY = 'Tiles/Background_Bleak-Yellow_TileSet.png'
tile(DG, 14, 2, 'env/ground_grass.png')
tile(BY, 14, 2, 'env/ground_deadgrass.png')
tile(DG, 13, 15, 'env/ground_cobble.png')
tile(DG, 10, 0, 'env/ground_sidewalk.png')
tile(DG, 5, 8, 'env/ground_asphalt.png')
tile(DG, 2, 7, 'env/ground_zebra.png')
tile(DG, 4, 11, 'env/ground_wood.png')

# ---------------- edificios: pared (celda lisa del autotile) + techos vistos desde arriba ----------------
for color in ('beige', 'gray', 'dark', 'white'):
    tile(f'Tiles/Buildings/Buildings_{color}_TileSet.png', 1, 2, f'env/wall_{color}.png')
crop('Tiles/Roof_TileSet.png', (0, 0, 48, 80), 'env/roof_gray.png')
crop('Tiles/Roof_TileSet.png', (128, 0, 176, 80), 'env/roof_red.png')
# cerca de alambre: 3 variantes de 48px armadas con tiles de 16 (liso, cartel, rota)
wire = Image.open(os.path.join(SRC, 'Tiles/Wire-Fence/Wire-Fence_TileSet.png')).convert('RGBA')
for name, tiles in {'fence': [(1, 1), (1, 1), (4, 2)], 'fence_b': [(1, 1), (1, 0), (4, 2)], 'fence_c': [(1, 1), (1, 2), (4, 2)]}.items():
    strip = Image.new('RGBA', (48, 16))
    for i, (cx, cy) in enumerate(tiles):
        strip.paste(wire.crop((cx * 16, cy * 16, cx * 16 + 16, cy * 16 + 16)), (i * 16, 0))
    strip.save(out(f'env/{name}.png'))
for src, dst in [
    ('Window_9_gray.png', 'window'), ('Window_7_broken_gray.png', 'window_broken'),
    ('Window_11_Boarded-up_gray.png', 'window_boarded'), ('Window_15_Beige.png', 'window_beige'),
]:
    copy(f'Objects/Windows/{src}', f'env/{dst}.png')
B = 'Objects/Buildings'
for src, dst in [
    ('Door_4_Metal.png', 'door'), ('Door_6_Boarded-up_Metal.png', 'door_boarded'),
    ('Door_1_Beige.png', 'door_beige'), ('Awning_blue_1.png', 'awning_blue'),
    ('Awning_orange_1.png', 'awning_orange'), ('Antenna_1.png', 'antenna'),
    ('Air-vent_1.png', 'vent'), ('HVAC.png', 'hvac'),
    ('layered-posters_1_For-ground-and-walls.png', 'posters'),
]:
    copy(f'{B}/{src}', f'env/{dst}.png')

# ---------------- props de calle ----------------
O = 'Objects'
for src, dst in [
    ('Street-Light_2_Up.png', 'streetlight'), ('Stop-sign_Down_1.png', 'stop_sign'),
    ('Hydrant_1_red.png', 'hydrant'), ('Barrel_red_1.png', 'barrel_red'),
    ('Barrel_rust_blue_1.png', 'barrel_blue'), ('Trash-can_1.png', 'trash_can'),
    ('Garbage-Bin_1.png', 'garbage_bin'), ('Trash-bag_1.png', 'trash_bag'),
    ('Bench_1_down.png', 'bench'), ('Vending-machine_Red.png', 'vending_red'),
    ('Vending-machine_Blue.png', 'vending_blue'), ('Pallet_1.png', 'pallet'),
    ('Cardboard_1.png', 'cardboard'), ('Tire_1.png', 'tire'),
    ('Shopping-cart.png', 'cart'), ('Manhole.png', 'manhole'),
    ('Traffic-cone.png', 'cone'), ('Refrigerator.png', 'fridge'),
    ('Container/Container_3_Gray_Horizontal.png', 'container_gray'),
    ('Container/Container_7_Red_Horizontal.png', 'container_red'),
    ('Container/Container_9_Green_Vertical.png', 'container_green_v'),
]:
    copy(f'{O}/{src}', f'env/{dst}.png')

V = 'Objects/Vehicles'
for src, dst in [
    ('Normal/Car_1/Car_1_Red.png', 'car_red'), ('Normal/Car_1/Car_1_Blue.png', 'car_blue'),
    ('Normal/Car_4/Car_4_Gray.png', 'car_gray'), ('Normal/Car_3_Van/Car_3_Blue_Van.png', 'van'),
    ('Normal/Car_7_Truck/Car_7_Orange_Truck.png', 'truck'), ('Normal/Car_8_Bus/Car_8_Yellow_Bus.png', 'bus'),
    ('Normal/Car_2_Upsidedown/Car_2_Gray_Upsidedown.png', 'car_flipped'),
    ('Rust/Car_1_Rust/Car_1_Rust_Orange.png', 'car_rust'), ('Rust/Car_6_Rust_Scrap/Car_6_Rust_Red_Scrap.png', 'car_scrap'),
    ('Rust/Car_5_Rust_Tractor/Car_5_Rust_Tractor_Up.png', 'tractor'),
]:
    copy(f'{V}/{src}', f'env/{dst}.png')

N = 'Objects/Nature'
for tone, suffix in (('Dark-Green', 'green'), ('Bleak-Yellow', 'dead')):
    for src, dst in [
        (f'Tree_1_Spruce_{tone}.png', 'spruce'), (f'Tree_6_Big-pine_{tone}.png', 'pine'),
        (f'Tree_3_Normal_{tone}.png', 'tree'), (f'Tree_7_Birch_{tone}.png', 'birch'),
        (f'Bush_1_{tone}.png', 'bush'), (f'Grass_1_{tone}.png', 'tuft'),
    ]:
        if os.path.exists(os.path.join(SRC, N, tone, src)):
            copy(f'{N}/{tone}/{src}', f'env/{dst}_{suffix}.png')
copy(f'{N}/Flowers_Mashrooms_Other-nature-stuff/Puddles-And-Water-Anim/Puddle_On-Dry-Ground_1.png', 'env/puddle.png')

# ---------------- objetos recogibles ----------------
copy('Objects/Pickable/Ammo-crate_Red.png', 'pickups/ammo.png')
copy('Objects/Pickable/Bandage.png', 'pickups/bandage.png')
copy('UI/Inventory/Objects/Icon_First-Aid-Kit_Red.png', 'pickups/medkit.png')

# ---------------- UI ----------------
U = 'UI'
for src, dst in [
    ('HP/Heart_Full.png', 'heart_full'), ('HP/Heart_Half.png', 'heart_half'), ('HP/Heart_Empty.png', 'heart_empty'),
    ('Inventory/Inventory-Cell.png', 'cell'), ('Inventory/Inventory-Chosen.png', 'cell_chosen'),
    ('Inventory/Objects/Icon_Pistol.png', 'icon_pistol'), ('Inventory/Objects/Icon_Shotgun.png', 'icon_shotgun'),
    ('Inventory/Objects/Icon_Gun.png', 'icon_rifle'), ('Inventory/Objects/Icon_Bat.png', 'icon_bat'),
    ('Inventory/Objects/Icon_First-Aid-Kit_Red.png', 'icon_medkit'), ('Inventory/Objects/Icon_Bandage.png', 'icon_bandage'),
    ('Inventory/Objects/Icon_Bullet-box_Red.png', 'icon_ammo'),
    ('Menu/Cursor.png', 'cursor'),
]:
    copy(f'{U}/{src}', f'ui/{dst}.png')

print('\nListo.')
