// Manifiesto de sprites. Cada entrada es un PNG en assets/<key>.png; los que
// son animaciones vienen como tira horizontal de N frames del mismo ancho.
export const DIR4 = ['down', 'up', 'side', 'sideleft'];

export const ZOMBIE_FRAMES = {
  walker: { walk: 8, attack: 7, death: 6 },
  thrower: { walk: 8, attack: 9, death: 6 },
  runner: { walk: 6, attack: 4, death: 6 },
  brute: { walk: 8, attack: 8, death: 7 },
};

const ENV = [
  'ground_grass', 'ground_deadgrass', 'ground_cobble', 'ground_sidewalk', 'ground_asphalt', 'ground_zebra', 'ground_wood',
  'wall_beige', 'wall_gray', 'wall_dark', 'wall_white', 'roof_gray', 'roof_red', 'fence', 'fence_b', 'fence_c',
  'window', 'window_broken', 'window_boarded', 'window_beige', 'door', 'door_boarded', 'door_beige',
  'awning_blue', 'awning_orange', 'antenna', 'vent', 'hvac', 'posters',
  'streetlight', 'stop_sign', 'hydrant', 'barrel_red', 'barrel_blue', 'trash_can', 'garbage_bin', 'trash_bag',
  'bench', 'vending_red', 'vending_blue', 'pallet', 'cardboard', 'tire', 'cart', 'manhole', 'cone', 'fridge',
  'container_gray', 'container_red', 'container_green_v',
  'car_red', 'car_blue', 'car_gray', 'van', 'truck', 'bus', 'car_flipped', 'car_rust', 'car_scrap', 'tractor',
  'spruce_green', 'pine_green', 'tree_green', 'birch_green', 'bush_green', 'tuft_green',
  'spruce_dead', 'pine_dead', 'tree_dead', 'birch_dead', 'bush_dead', 'tuft_dead', 'puddle',
  // Mundo 2 (tools/make_interior.py)
  'int_floor', 'int_floor_blood', 'int_lino', 'int_bed', 'int_bed_blood', 'int_gurney', 'int_locker', 'int_locker_open',
  'int_medcab', 'int_medcab_open', 'int_desk', 'int_counter', 'int_iv', 'int_curtain', 'int_chairs', 'int_wheelchair',
  'int_plant', 'int_shelf', 'ambulance', 'door_ajar',
];

const MANIFEST = [];
const add = (key, frames = 1) => MANIFEST.push({ key, frames });

// sobrevivientes (tools/make_characters.py): misma animación, distinta paleta
export const CHAR_SPRITES = ['tomas', 'vera', 'hugo', 'nina', 'bruno', 'lucia', 'ramiro'];
for (const c of CHAR_SPRITES) {
  DIR4.forEach((d) => { add(`char/${c}/run_${d}`, 6); add(`char/${c}/idle_${d}`, 6); });
  add(`char/${c}/death_side`, 6); add(`char/${c}/death_sideleft`, 6);
}
['pistol', 'shotgun', 'rifle', 'bat', 'axe'].forEach((w) => add(`weapons/${w}`));
add('fx/muzzle', 3); add('fx/blood1', 3); add('fx/blood2', 3); add('fx/axe_spin', 9); add('fx/axe_landed');
for (const [z, f] of Object.entries(ZOMBIE_FRAMES)) {
  DIR4.forEach((d) => { add(`zombies/${z}_walk_${d}`, f.walk); add(`zombies/${z}_attack_${d}`, f.attack); });
  ['side', 'sideleft'].forEach((d) => add(`zombies/${z}_death_${d}`, f.death));
}
ENV.forEach((e) => add(`env/${e}`));
['ammo', 'bandage', 'fuel', 'medkit', 'radio', 'keycard', 'surgkit'].forEach((p) => add(`pickups/${p}`));

const sheets = {};

export function sheet(key) { return sheets[key]; }

export function loadAll(onProgress) {
  let done = 0;
  return Promise.all(MANIFEST.map(({ key, frames }) => new Promise((resolve) => {
    const img = new Image();
    const finish = () => {
      sheets[key] = { img, frames, fw: img.naturalWidth / frames, fh: img.naturalHeight };
      done++;
      onProgress?.(done / MANIFEST.length);
      resolve();
    };
    img.onload = finish;
    img.onerror = () => { console.warn('no se pudo cargar', key); finish(); };
    img.src = `assets/${key}.png`;
  })));
}
