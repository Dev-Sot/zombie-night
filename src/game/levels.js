// Definición de niveles (datos puros). Coordenadas en píxeles de mundo.
// Edificios en perspectiva 3/4: (x,y) es la esquina del techo, h incluye la
// fachada de 30px de abajo, y la puerta siempre va en la fachada.
import { LEVELS_W2 } from './levels_w2.js';

const road = (x, y, w, h) => ({ tile: 'ground_asphalt', x, y, w, h, road: true });
const walk = (x, y, w, h) => ({ tile: 'ground_sidewalk', x, y, w, h, road: true, edge: 'rgba(0,0,0,0.35)' });
const gravel = (x, y, w, h) => ({ tile: 'ground_cobble', x, y, w, h, road: true, filter: 'sepia(0.7) brightness(0.62) saturate(0.8)' });

// mezcla de zombies: [tipo, peso, desde qué oleada]
const MIX_1 = [['walker', 6, 1], ['runner', 3, 2], ['brute', 1, 4], ['screamer', 1, 3]];
const MIX_2 = [['walker', 5, 1], ['runner', 3, 1], ['thrower', 2, 2], ['brute', 1, 3], ['toxic', 1, 5], ['screamer', 1, 2], ['bloater', 1, 4]];
const MIX_3 = [['walker', 4, 1], ['runner', 3, 1], ['thrower', 2, 1], ['brute', 2, 2], ['toxic', 2, 2], ['screamer', 1, 1], ['bloater', 2, 2]];

const LEVELS_W1 = [
  // =========================================================================
  {
    id: 1, name: 'El Apagón', tag: 'BARRIO · LLUVIA', color: '#2a3140',
    desc: 'El barrio se quedó a oscuras. Devolvé la luz desde la subestación.',
    W: 1100, H: 820, ground: 'ground_grass', groundFilter: 'brightness(0.8)',
    weather: 'rain', darkness: 0.8, music: 'explore', lampsOff: true,
    player: { x: 250, y: 640 },
    areas: [
      walk(476, 0, 128, 820), walk(0, 356, 1100, 118),
      road(500, 0, 80, 820), road(0, 380, 1100, 70),
      gravel(250, 620, 60, 40),
    ],
    lines: [{ x1: 539, y1: 0, x2: 539, y2: 372 }, { x1: 539, y1: 458, x2: 539, y2: 820 },
      { x1: 0, y1: 414, x2: 492, y2: 414 }, { x1: 588, y1: 414, x2: 1100, y2: 414 }],
    zebras: [{ x: 500, y: 328, w: 80, h: 22, dir: 'v' }, { x: 500, y: 478, w: 80, h: 22, dir: 'v' },
      { x: 448, y: 380, w: 22, h: 70, dir: 'h' }, { x: 610, y: 380, w: 22, h: 70, dir: 'h' }],
    buildings: [
      { x: 70, y: 90, w: 170, h: 110, wall: 'beige', roof: 'red', door: 0.5 },
      { x: 290, y: 150, w: 140, h: 100, wall: 'white', roof: 'gray', door: 0.35, windows: 'beige' },
      { x: 640, y: 230, w: 160, h: 100, wall: 'gray', roof: 'gray', roofFilter: 'hue-rotate(150deg) saturate(0.6)', label: 'ALMACEN', awning: 'blue', door: 0.4 },
      { x: 860, y: 80, w: 180, h: 120, wall: 'dark', roof: 'red', windows: 'mixed', door: 0.6 },
      { x: 650, y: 520, w: 120, h: 90, wall: 'gray', roof: 'gray', windows: 'boarded', doorKey: 'door_boarded', label: 'TALLER' },
    ],
    props: [
      { k: 'bus', x: 330, y: 392 }, { k: 'car_red', x: 507, y: 110 }, { k: 'car_rust', x: 546, y: 245 },
      { k: 'car_flipped', x: 510, y: 600 }, { k: 'car_blue', x: 548, y: 700 }, { k: 'car_gray', x: 170, y: 424 },
      { k: 'car_scrap', x: 760, y: 386 }, { k: 'van', x: 900, y: 420 },
      { k: 'barrel_red', x: 452, y: 334 }, { k: 'barrel_red', x: 466, y: 340 }, { k: 'barrel_red', x: 612, y: 478 }, { k: 'barrel_blue', x: 628, y: 482 },
      { k: 'barrel_red', x: 820, y: 596 }, { k: 'barrel_red', x: 990, y: 690 },
      { k: 'garbage_bin', x: 808, y: 300 }, { k: 'trash_can', x: 612, y: 330 }, { k: 'trash_bag', x: 630, y: 336 },
      { k: 'vending_red', x: 740, y: 333 }, { k: 'hydrant', x: 478, y: 474 }, { k: 'stop_sign', x: 588, y: 332 },
      { k: 'bench', x: 120, y: 540 }, { k: 'bench', x: 300, y: 740 }, { k: 'puddle', x: 200, y: 700 }, { k: 'puddle', x: 530, y: 300 },
      { k: 'cardboard', x: 790, y: 318 }, { k: 'tire', x: 700, y: 620 }, { k: 'pallet', x: 780, y: 540 },
      { k: 'manhole', x: 530, y: 520 },
    ],
    lamps: [{ x: 488, y: 110 }, { x: 592, y: 260, flicker: true }, { x: 488, y: 540 }, { x: 592, y: 720 },
      { x: 150, y: 368 }, { x: 320, y: 462, flicker: true }, { x: 820, y: 368 }, { x: 990, y: 462 }],
    fences: [{ x: 50, y: 222, len: 216 }, { x: 850, y: 222, len: 210 }, { x: 830, y: 585, len: 170 }],
    scatter: [
      { k: ['spruce_green', 'tree_green', 'pine_green'], n: 16, area: { x: 10, y: 10, w: 460, h: 330 } },
      { k: ['spruce_green', 'tree_green', 'birch_green'], n: 14, area: { x: 610, y: 10, w: 480, h: 330 } },
      { k: ['tree_green', 'birch_green', 'spruce_green', 'bush_green'], n: 22, area: { x: 20, y: 490, w: 440, h: 320 } },
      { k: ['spruce_green', 'bush_green'], n: 10, area: { x: 620, y: 630, w: 470, h: 180 } },
      { k: ['tuft_green', 'bush_green'], n: 50 },
    ],
    keepClear: [{ x: 130, y: 225, w: 60, h: 50 }, { x: 930, y: 225, w: 60, h: 50 }, { x: 330, y: 670, w: 60, h: 60 },
      { x: 860, y: 600, w: 80, h: 70 }, { x: 210, y: 610, w: 80, h: 60 }, { x: 720, y: 330, w: 50, h: 30 }],
    spawns: [{ x: 1085, y: 415 }, { x: 15, y: 415 }, { x: 540, y: 15 }, { x: 540, y: 810 }, { x: 1080, y: 760 }, { x: 20, y: 60 }],
    shop: { x: 747, y: 360 },
    markers: [{ id: 'gen', type: 'generator', x: 900, y: 648 }],
    waves: { first: 5, grow: 2, cap: 18, rate: 80, mix: MIX_1 },
    loadout: { weapons: ['bat', 'pistol'], ammo: { pistol: 36 }, bandage: 1, coins: 0 },
    shopItems: ['ammo_pistol', 'bandage', 'medkit', 'shotgun', 'ammo_shotgun'],
    intro: [
      '22:47. El apagón cayó sobre el barrio entero en un segundo.',
      'Después empezaron los gritos.',
      'El generador de la subestación puede devolver la luz... si consigo combustible.',
    ],
    objective: [
      { type: 'collect', item: 'fuel', text: 'Juntá bidones de combustible', spots: [{ x: 160, y: 250 }, { x: 960, y: 250 }, { x: 360, y: 700 }] },
      { type: 'reach', x: 900, y: 660, r: 24, text: 'Llevá el combustible al generador',
        onDone: { marker: 'gen', lights: true, sfx: 'generator', banner: 'LA LUZ ATRAE A LA HORDA', danger: true, surge: 14, music: 'combat', shake: 6 } },
      { type: 'survive', seconds: 45, text: 'Aguantá hasta que la red se estabilice', at: { 20: { surge: 8 } },
        onDone: { banner: 'LA LUZ VOLVIÓ', music: 'explore' } },
    ],
    outro: ['La luz volvió al barrio.', 'Pero la radio sigue muda. Nadie responde.', 'Tengo que llegar a la comisaría del centro.'],
  },

  // =========================================================================
  {
    id: 2, name: 'La Señal', tag: 'CENTRO · NIEBLA', color: '#2c2f33',
    desc: 'Reuní piezas para la radio de la comisaría y pedí ayuda.',
    W: 1300, H: 900, ground: 'ground_cobble', groundFilter: 'brightness(0.55) saturate(0.5)',
    weather: 'fog', darkness: 0.93, music: 'explore',
    player: { x: 900, y: 860 },
    areas: [
      walk(360, 0, 120, 900), walk(840, 0, 120, 900), walk(0, 280, 1300, 110), walk(0, 600, 1300, 110),
      road(380, 0, 80, 900), road(860, 0, 80, 900), road(0, 300, 1300, 70), road(0, 620, 1300, 70),
      { tile: 'ground_asphalt', x: 20, y: 180, w: 330, h: 95, filter: 'brightness(0.85)' },
      { tile: 'ground_asphalt', x: 20, y: 720, w: 330, h: 170, filter: 'brightness(0.85)' },
    ],
    lines: [{ x1: 419, y1: 0, x2: 419, y2: 900 }, { x1: 899, y1: 0, x2: 899, y2: 900 },
      { x1: 0, y1: 334, x2: 1300, y2: 334 }, { x1: 0, y1: 654, x2: 1300, y2: 654 }],
    zebras: [{ x: 380, y: 250, w: 80, h: 22, dir: 'v' }, { x: 860, y: 572, w: 80, h: 22, dir: 'v' }, { x: 470, y: 300, w: 22, h: 70, dir: 'h' }, { x: 950, y: 620, w: 22, h: 70, dir: 'h' }],
    buildings: [
      { x: 40, y: 30, w: 250, h: 130, wall: 'white', roof: 'gray', label: 'POLICIA', labelColor: '#9fd0ff', awning: 'blue', door: 0.5 },
      { x: 560, y: 40, w: 200, h: 90, wall: 'gray', roof: 'red', label: 'GASOLINERA', awning: 'orange', door: 0.3 },
      { x: 990, y: 30, w: 280, h: 180, wall: 'dark', roof: 'gray', windows: 'mixed', door: 0.3 },
      { x: 40, y: 420, w: 180, h: 100, wall: 'beige', roof: 'red', label: 'BAR', windows: 'boarded', door: 0.6 },
      { x: 990, y: 410, w: 270, h: 160, wall: 'gray', roof: 'gray', label: 'DEPOSITO', windows: 'boarded', doorKey: 'door_boarded', door: 0.5 },
      { x: 520, y: 740, w: 200, h: 100, wall: 'white', roof: 'red', roofFilter: 'hue-rotate(95deg)', label: 'FARMACIA', labelColor: '#8dff9d', door: 0.5 },
      { x: 1000, y: 740, w: 150, h: 100, wall: 'beige', roof: 'gray', door: 0.5, windows: 'beige' },
    ],
    props: [
      { k: 'car_blue', x: 60, y: 200 }, { k: 'car_blue', x: 100, y: 205 }, { k: 'van', x: 160, y: 215 },
      { k: 'vending_blue', x: 590, y: 140 }, { k: 'vending_red', x: 610, y: 140 },
      { k: 'barrel_red', x: 700, y: 150 }, { k: 'barrel_red', x: 716, y: 156 }, { k: 'barrel_red', x: 520, y: 200 },
      { k: 'car_scrap', x: 680, y: 210 }, { k: 'truck', x: 470, y: 380 }, { k: 'bus', x: 1100, y: 310 },
      { k: 'garbage_bin', x: 250, y: 470 }, { k: 'garbage_bin', x: 250, y: 540 }, { k: 'container_red', x: 280, y: 420 },
      { k: 'trash_bag', x: 240, y: 510 }, { k: 'trash_can', x: 300, y: 560 },
      { k: 'bench', x: 560, y: 440 }, { k: 'bench', x: 700, y: 540 }, { k: 'puddle', x: 640, y: 480 },
      { k: 'car_red', x: 40, y: 740 }, { k: 'car_rust', x: 80, y: 740 }, { k: 'car_blue', x: 160, y: 745 }, { k: 'car_flipped', x: 240, y: 760 },
      { k: 'car_gray', x: 60, y: 830 }, { k: 'car_scrap', x: 200, y: 840 }, { k: 'barrel_red', x: 300, y: 830 },
      { k: 'container_gray', x: 1180, y: 740 }, { k: 'container_red', x: 1180, y: 790 }, { k: 'container_green_v', x: 1250, y: 720 },
      { k: 'car_red', x: 868, y: 120 }, { k: 'car_rust', x: 907, y: 470 }, { k: 'car_flipped', x: 388, y: 540 },
      { k: 'cart', x: 760, y: 820 }, { k: 'cardboard', x: 740, y: 700 }, { k: 'fridge', x: 1010, y: 600 },
      { k: 'barrel_red', x: 970, y: 590 }, { k: 'barrel_blue', x: 986, y: 594 },
    ],
    lamps: [{ x: 368, y: 120 }, { x: 472, y: 470, flicker: true }, { x: 368, y: 800 }, { x: 848, y: 180, flicker: true },
      { x: 952, y: 480 }, { x: 848, y: 800 }, { x: 640, y: 292 }, { x: 1150, y: 612, flicker: true }, { x: 150, y: 612 }],
    fences: [{ x: 20, y: 712, len: 330 }],
    scatter: [
      { k: ['tree_dead', 'spruce_green', 'bush_green'], n: 10, area: { x: 490, y: 400, w: 340, h: 190 } },
      { k: ['tuft_green', 'tuft_dead'], n: 30 },
    ],
    keepClear: [{ x: 250, y: 190, w: 110, h: 90 }, { x: 620, y: 470, w: 80, h: 60 }, { x: 150, y: 780, w: 70, h: 50 },
      { x: 1150, y: 800, w: 60, h: 40 }, { x: 570, y: 150, w: 70, h: 40 }],
    spawns: [{ x: 420, y: 15 }, { x: 900, y: 15 }, { x: 1285, y: 335 }, { x: 15, y: 335 }, { x: 1285, y: 655 }, { x: 15, y: 655 }, { x: 420, y: 890 }],
    shop: { x: 603, y: 170 },
    markers: [{ id: 'ant', type: 'antenna', x: 320, y: 240 }],
    waves: { first: 6, grow: 3, cap: 22, rate: 70, mix: MIX_2 },
    loadout: { weapons: ['bat', 'pistol'], ammo: { pistol: 48, shotgun: 6 }, bandage: 1, medkit: 1, coins: 10 },
    // escopeta escondida en el depósito del este
    weaponSpots: [{ weapon: 'shotgun', x: 1125, y: 596 }],
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'bandage', 'medkit', 'shotgun', 'rifle', 'ammo_rifle'],
    intro: [
      '06:10. La niebla no deja ver a diez metros.',
      'La radio de la comisaría todavía tiene batería. Le faltan piezas.',
      'Si alguien sigue ahí afuera, me va a escuchar.',
    ],
    objective: [
      { type: 'collect', item: 'radio', text: 'Reuní piezas de radio', spots: [{ x: 660, y: 500 }, { x: 185, y: 805 }, { x: 1180, y: 850 }] },
      { type: 'reach', x: 320, y: 250, r: 28, text: 'Llevá las piezas a la antena de la comisaría',
        onDone: { marker: 'ant', sfx: 'radio', banner: 'TRANSMITIENDO', danger: true, surge: 16, music: 'combat', intensity: 1.6 } },
      { type: 'hold', x: 320, y: 250, r: 60, seconds: 40, text: 'Mantené la señal', outside: 'Volvé a la antena',
        onDone: { subtitle: 'RADIO: ...Recibido. Mandamos un helicóptero a la granja Robles, al norte. Aguanten.', music: 'explore', intensity: 1 } },
    ],
    outro: ['Alguien contestó.', 'Un helicóptero va a la granja Robles, en las afueras.', 'Solo tengo que llegar vivo.'],
  },

  // =========================================================================
  {
    id: 3, name: 'El Rescate', tag: 'AFUERAS · TORMENTA', color: '#33291f',
    desc: 'Encendé las bengalas y resistí hasta que aterrice el helicóptero.',
    W: 1400, H: 950, ground: 'ground_deadgrass', groundFilter: 'brightness(0.85)',
    weather: 'storm', darkness: 0.88, music: 'explore',
    player: { x: 140, y: 858 },
    areas: [
      road(0, 820, 1400, 70), gravel(640, 280, 60, 540), gravel(700, 280, 520, 50),
      { tile: 'ground_wood', x: 1040, y: 110, w: 230, h: 180, filter: 'brightness(0.5) saturate(0.4)' },
    ],
    lines: [{ x1: 0, y1: 854, x2: 1400, y2: 854 }],
    zebras: [],
    buildings: [
      { x: 400, y: 100, w: 220, h: 160, wall: 'dark', roof: 'red', label: 'GRANJA ROBLES', door: 0.5, doorKey: 'door_beige', windows: 'boarded' },
      { x: 760, y: 150, w: 170, h: 110, wall: 'beige', roof: 'gray', door: 0.4, windows: 'mixed' },
      { x: 60, y: 120, w: 150, h: 90, wall: 'gray', roof: 'red', roofFilter: 'saturate(0.5)', windows: 'boarded', doorKey: 'door_boarded' },
    ],
    props: [
      { k: 'car_flipped', x: 260, y: 832 }, { k: 'car_rust', x: 330, y: 835 }, { k: 'truck', x: 500, y: 810 }, { k: 'bus', x: 900, y: 836 },
      { k: 'car_scrap', x: 1180, y: 846 }, { k: 'barrel_red', x: 420, y: 790 }, { k: 'barrel_red', x: 436, y: 796 },
      { k: 'tractor', x: 720, y: 360 }, { k: 'vending_red', x: 610, y: 262 }, { k: 'barrel_red', x: 640, y: 250 },
      { k: 'container_gray', x: 1040, y: 480 }, { k: 'container_red', x: 1090, y: 480 }, { k: 'container_gray', x: 1140, y: 520 },
      { k: 'container_green_v', x: 1200, y: 560 }, { k: 'container_red', x: 1040, y: 600 }, { k: 'container_gray', x: 1130, y: 640 },
      { k: 'barrel_red', x: 1180, y: 610 }, { k: 'barrel_blue', x: 1196, y: 614 }, { k: 'pallet', x: 1020, y: 560 }, { k: 'tire', x: 1260, y: 520 },
      { k: 'car_rust', x: 880, y: 300 }, { k: 'barrel_red', x: 960, y: 280 },
    ],
    lamps: [{ x: 300, y: 812, flicker: true }, { x: 800, y: 812 }, { x: 1250, y: 812, flicker: true }, { x: 630, y: 270 }],
    fences: [{ x: 40, y: 330, len: 340 }, { x: 40, y: 760, len: 340 }, { x: 1020, y: 90, len: 270 }, { x: 1020, y: 300, len: 60 }, { x: 1230, y: 300, len: 60 }],
    scatter: [
      { k: ['tuft_dead', 'bush_dead'], n: 90, area: { x: 60, y: 350, w: 320, h: 400 } },
      { k: ['pine_dead', 'spruce_dead', 'tree_dead', 'birch_dead'], n: 30, area: { x: 0, y: 0, w: 1400, h: 90 } },
      { k: ['pine_dead', 'spruce_dead', 'tree_dead'], n: 26, area: { x: 380, y: 360, w: 240, h: 440 } },
      { k: ['spruce_dead', 'tree_dead', 'bush_dead'], n: 16, area: { x: 740, y: 400, w: 280, h: 380 } },
      { k: ['tuft_dead', 'bush_dead'], n: 40 },
    ],
    keepClear: [{ x: 1040, y: 100, w: 240, h: 200 }, { x: 100, y: 820, w: 100, h: 70 }, { x: 600, y: 255, w: 60, h: 50 }],
    spawns: [{ x: 15, y: 855 }, { x: 1385, y: 855 }, { x: 700, y: 20 }, { x: 1385, y: 400 }, { x: 15, y: 500 }, { x: 250, y: 20 }],
    shop: { x: 617, y: 290 },
    markers: [{ id: 'pad', type: 'helipad', x: 1155, y: 200 }, { id: 'f1', type: 'flare', x: 1070, y: 140 }, { id: 'f2', type: 'flare', x: 1240, y: 265 }],
    waves: { first: 7, grow: 3, cap: 26, rate: 60, mix: MIX_3 },
    loadout: { weapons: ['bat', 'pistol', 'shotgun'], ammo: { pistol: 36, shotgun: 12, rifle: 30 }, bandage: 2, medkit: 1, coins: 15 },
    // rifle en el galpón del oeste, lejos del helipuerto
    weaponSpots: [{ weapon: 'rifle', x: 135, y: 226 }],
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit', 'rifle'],
    intro: [
      '23:58. La tormenta tapa todo menos los relámpagos.',
      'El helicóptero no puede bajar a ciegas.',
      'Bengalas en el helipuerto de la granja. Y después, aguantar.',
    ],
    objective: [
      { type: 'interact', text: 'Encendé las bengalas de señal', prompt: 'E  ENCENDER BENGALA', sfx: 'flare',
        spots: [{ x: 1070, y: 146, marker: 'f1' }, { x: 1240, y: 270, marker: 'f2' }] },
      { type: 'reach', x: 1155, y: 200, r: 30, text: 'Esperá al helicóptero en el helipuerto',
        onDone: { marker: 'pad', banner: 'RESISTÍ HASTA QUE ATERRICE', danger: true, music: 'final', surge: 18, intensity: 1.8,
          heli: { from: { x: 1700, y: -150 }, to: { x: 1155, y: 196 } } } },
      { type: 'survive', seconds: 40, text: 'El helicóptero llega en', at: { 15: { surge: 10 } } },
      { type: 'boss', spawn: { x: 700, y: 870 }, text: 'Matá al Gigante',
        onStart: { banner: 'EL GIGANTE', danger: true, shake: 10 } },
      { type: 'reach', x: 1155, y: 200, r: 26, text: 'Subí al helicóptero' },
    ],
    outro: ['El helicóptero despega entre la lluvia.', 'Abajo, la ciudad sigue a oscuras.', 'Pero todavía hay gente allá abajo...'],
  },
];

export const LEVELS = [...LEVELS_W1.map((l) => ({ world: 1, ...l })), ...LEVELS_W2];
export const WORLDS = [[1, 'MUNDO 1 · LA CIUDAD'], [2, 'MUNDO 2 · EL HOSPITAL']];

export const SHOP_ITEMS = {
  ammo_pistol: { name: 'Balas de pistola', sub: '+24', price: 8, icon: 'icon_ammo' },
  ammo_shotgun: { name: 'Cartuchos', sub: '+12', price: 12, icon: 'icon_ammo' },
  ammo_rifle: { name: 'Cargador de rifle', sub: '+60', price: 15, icon: 'icon_ammo' },
  bandage: { name: 'Venda', sub: '+22 vida', price: 10, icon: 'icon_bandage' },
  medkit: { name: 'Botiquín', sub: '+55 vida', price: 22, icon: 'icon_medkit' },
  shotgun: { name: 'Escopeta', sub: 'arma + 12 cartuchos', price: 45, icon: 'icon_shotgun', weapon: 'shotgun' },
  rifle: { name: 'Rifle', sub: 'arma + 60 balas', price: 70, icon: 'icon_rifle', weapon: 'rifle' },
};
