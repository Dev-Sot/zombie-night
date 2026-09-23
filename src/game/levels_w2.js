// Mundo 2 — El Hospital. Noches 4 a 6.
// El helicóptero cae frente al Hospital San Rafael; adentro, Lucía pide ayuda.

const road = (x, y, w, h) => ({ tile: 'ground_asphalt', x, y, w, h, road: true });
const walk = (x, y, w, h) => ({ tile: 'ground_sidewalk', x, y, w, h, road: true, edge: 'rgba(0,0,0,0.35)' });
const floor = (x, y, w, h, filter) => ({ tile: 'int_floor', x, y, w, h, road: true, filter });
const blood = (x, y, w = 32, h = 32) => ({ tile: 'int_floor_blood', x, y, w, h, road: true });

// Pared horizontal/vertical de 8px con huecos (puertas o pasos abiertos).
// gaps: [{ x|y, w }] — w por defecto 16 (una puerta).
function hwall(x1, x2, y, gaps = [], style) {
  const out = [];
  let x = x1;
  for (const g of [...gaps].sort((a, b) => a.x - b.x)) {
    if (g.x > x) out.push({ x, y, w: g.x - x, h: 8, style });
    x = g.x + (g.w || 16);
  }
  if (x2 > x) out.push({ x, y, w: x2 - x, h: 8, style });
  return out;
}
function vwall(x, y1, y2, gaps = [], style) {
  const out = [];
  let y = y1;
  for (const g of [...gaps].sort((a, b) => a.y - b.y)) {
    if (g.y > y) out.push({ x, y, w: 8, h: g.y - y, style });
    y = g.y + (g.w || 16);
  }
  if (y2 > y) out.push({ x, y, w: 8, h: y2 - y, style });
  return out;
}

const MIX_H = [['nurse', 5, 1], ['walker', 3, 1], ['runner', 3, 2], ['screamer', 1, 2], ['bloater', 1, 3], ['thrower', 1, 3], ['brute', 1, 4]];
const MIX_H2 = [['nurse', 4, 1], ['walker', 3, 1], ['runner', 3, 1], ['thrower', 2, 1], ['screamer', 1, 1], ['bloater', 2, 2], ['brute', 2, 2], ['toxic', 1, 3]];
const LUCIA = { id: 'lucia', name: 'Lucía', hp: 90, sprite: 'lucia', color: '#9fd0ff' };
const CEIL = 'rgba(200,220,255,';
const EMERG = 'rgba(255,50,40,';

export const LEVELS_W2 = [
  // =========================================================================
  {
    id: 4, world: 2, name: 'Aterrizaje forzoso', tag: 'PARQUE · CENIZA', color: '#3a2a22',
    desc: 'El helicóptero cayó frente al hospital. Ramiro, el piloto, está herido.',
    W: 1300, H: 950, ground: 'ground_grass', groundFilter: 'brightness(0.72) saturate(0.6) sepia(0.35)',
    weather: 'ash', darkness: 0.8, music: 'explore',
    player: { x: 560, y: 840 },
    buildings: [
      { x: 360, y: 20, w: 900, h: 200, wall: 'white', roof: 'gray', label: 'HOSPITAL SAN RAFAEL', labelColor: '#9fd0ff', door: 0.5, doorKey: 'door_boarded', windows: 'mixed' },
      { x: 30, y: 40, w: 260, h: 160, wall: 'beige', roof: 'red', windows: 'boarded', door: 0.4 },
    ],
    areas: [
      walk(0, 228, 1300, 112), road(0, 248, 1300, 72), walk(758, 340, 112, 610), road(780, 340, 70, 610),
      { tile: 'ground_asphalt', x: 880, y: 350, w: 410, h: 250, filter: 'brightness(0.8)' },
      floor(952, 632, 256, 176),
    ],
    lines: [{ x1: 0, y1: 284, x2: 1300, y2: 284 }, { x1: 815, y1: 340, x2: 815, y2: 950 }],
    zebras: [{ x: 780, y: 330, w: 70, h: 20, dir: 'v' }],
    // farmacia: primer edificio con interior (el techo desaparece al entrar)
    walls: [
      ...hwall(952, 1208, 632), ...vwall(952, 632, 808), ...vwall(1200, 632, 808),
      ...hwall(952, 1208, 800, [{ x: 1060 }]),
    ],
    doors: [{ x: 1060, y: 800, key: 'door_beige' }],
    roofs: [{ x: 952, y: 632, w: 256, h: 176, roof: 'red', roofFilter: 'hue-rotate(95deg)', label: 'FARMACIA', labelColor: '#8dff9d' }],
    props: [
      { k: 'int_shelf', x: 966, y: 652 }, { k: 'int_shelf', x: 1000, y: 652 }, { k: 'int_shelf', x: 1034, y: 652 },
      { k: 'int_shelf', x: 1120, y: 652 }, { k: 'int_shelf', x: 1154, y: 652 },
      { k: 'int_counter', x: 1076, y: 716 }, { k: 'int_medcab', x: 1172, y: 716 }, { k: 'int_plant', x: 962, y: 760 },
      { k: 'tire', x: 300, y: 540 }, { k: 'tire', x: 470, y: 600 }, { k: 'cardboard', x: 440, y: 520 },
      { k: 'car_flipped', x: 790, y: 420 }, { k: 'car_rust', x: 818, y: 560 }, { k: 'bus', x: 200, y: 262 }, { k: 'car_scrap', x: 1050, y: 262 },
      { k: 'car_red', x: 910, y: 380 }, { k: 'car_blue', x: 960, y: 385 }, { k: 'car_gray', x: 1110, y: 380 }, { k: 'van', x: 1180, y: 470 },
      { k: 'car_rust', x: 1010, y: 520 }, { k: 'barrel_red', x: 1260, y: 380 }, { k: 'barrel_red', x: 1270, y: 396 },
      { k: 'barrel_red', x: 480, y: 470 }, { k: 'bench', x: 120, y: 720 }, { k: 'bench', x: 600, y: 700 },
      { k: 'trash_can', x: 740, y: 400 }, { k: 'garbage_bin', x: 900, y: 860 }, { k: 'hydrant', x: 766, y: 600 },
      { k: 'cone', x: 800, y: 700 }, { k: 'cone', x: 830, y: 710 }, { k: 'vending_red', x: 700, y: 348 },
    ],
    lamps: [{ x: 120, y: 236, flicker: true }, { x: 470, y: 236 }, { x: 900, y: 236, flicker: true }, { x: 1180, y: 236 },
      { x: 766, y: 480 }, { x: 862, y: 820, flicker: true }],
    fences: [{ x: 0, y: 350, len: 290 }, { x: 490, y: 350, len: 200 }],
    scatter: [
      { k: ['tree_dead', 'spruce_dead', 'tree_green', 'bush_dead'], n: 26, area: { x: 20, y: 380, w: 720, h: 550 } },
      { k: ['tuft_dead', 'bush_dead'], n: 40 },
    ],
    keepClear: [{ x: 280, y: 500, w: 220, h: 140 }, { x: 520, y: 780, w: 90, h: 90 }, { x: 680, y: 340, w: 70, h: 60 }, { x: 940, y: 620, w: 280, h: 200 }],
    spawns: [{ x: 10, y: 600 }, { x: 1290, y: 500 }, { x: 640, y: 940 }, { x: 1290, y: 900 }, { x: 10, y: 900 }, { x: 815, y: 940 }, { x: 10, y: 280 }, { x: 1290, y: 280 }],
    shop: { x: 707, y: 376 },
    markers: [{ id: 'wreck', type: 'wreck', x: 380, y: 560 }],
    npcs: [{ id: 'ramiro', name: 'Ramiro', x: 334, y: 596, static: true, sprite: 'ramiro', color: '#e8e2c8' }],
    waves: { first: 5, grow: 2, cap: 20, rate: 75, mix: MIX_H },
    loadout: { weapons: ['bat', 'pistol', 'shotgun'], ammo: { pistol: 48, shotgun: 12, rifle: 30 }, bandage: 1, coins: 20 },
    weaponSpots: [{ weapon: 'rifle', x: 1215, y: 440 }],
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit', 'rifle'],
    intro: [
      '03:12. El combustible no alcanzó.',
      'Caímos en el parque, frente al Hospital San Rafael.',
      'Ramiro sigue vivo. Por ahora.',
    ],
    objective: [
      { type: 'reach', x: 380, y: 600, r: 44, text: 'Volvé al helicóptero caído',
        onDone: { subtitle: 'RAMIRO: No siento la pierna... En la farmacia de la esquina tiene que haber algo.' } },
      { type: 'collect', item: 'surgkit', text: 'Buscá un kit quirúrgico en la farmacia', spots: [{ x: 1150, y: 775 }] },
      { type: 'reach', x: 350, y: 610, r: 26, text: 'Llevale el kit a Ramiro',
        onDone: { subtitle: 'RADIO: ...¿Hay alguien? Soy Lucía, enfermera. Estoy encerrada en cuarentena, en el San Rafael...',
          banner: 'LA RADIO LOS ATRAJO', danger: true, surge: 14, music: 'combat', shake: 4 } },
      { type: 'hold', x: 380, y: 590, r: 80, seconds: 45, text: 'Defendé el helicóptero mientras Ramiro arregla la radio', outside: 'Volvé al helicóptero',
        onDone: { banner: 'RADIO REPARADA', music: 'explore' } },
    ],
    outro: ['Ramiro se queda con el helicóptero y la radio.', 'Adentro del hospital, alguien pidió ayuda.', 'Voy a buscarla.'],
  },

  // =========================================================================
  {
    id: 5, world: 2, name: 'San Rafael', tag: 'HOSPITAL · APAGÓN', color: '#1f2a2c',
    desc: 'Tarjeta, energía y cuarentena. Lucía espera del otro lado.',
    W: 1200, H: 912, ground: 'int_lino', groundFilter: 'brightness(0.9)',
    weather: 'none', darkness: 0.95, music: 'explore', lampsOff: true, interior: true,
    player: { x: 600, y: 880 },
    areas: [
      floor(8, 48, 182, 202), floor(198, 48, 182, 202), floor(388, 48, 232, 202, 'sepia(0.3)'), floor(628, 48, 252, 202),
      { tile: 'ground_asphalt', x: 888, y: 48, w: 304, h: 202, road: true, filter: 'brightness(0.7)' },
      floor(8, 328, 412, 192), floor(428, 328, 432, 192, 'hue-rotate(60deg) brightness(0.85)'), floor(868, 328, 324, 192),
      floor(8, 608, 372, 296), floor(388, 608, 432, 296, 'brightness(1.08)'), floor(828, 608, 364, 296),
      blood(60, 420), blood(250, 150), blood(700, 560, 48, 16), blood(140, 700), blood(1040, 450),
    ],
    walls: [
      ...hwall(0, 1200, 40), ...vwall(0, 48, 904), ...vwall(1192, 48, 904), ...hwall(0, 1200, 904, [{ x: 576, w: 48 }]),
      // fila de arriba: habitaciones, seguridad, personal, sala de máquinas
      ...hwall(8, 1192, 250, [{ x: 92 }, { x: 282 }, { x: 492 }, { x: 742 }, { x: 1022 }]),
      ...vwall(190, 48, 250), ...vwall(380, 48, 250), ...vwall(620, 48, 250), ...vwall(880, 48, 250),
      // fila del medio: sala común, cuarentena, depósito
      ...hwall(8, 1192, 320, [{ x: 180, w: 40 }, { x: 632 }, { x: 1012 }]),
      ...vwall(420, 328, 520), ...vwall(860, 328, 520),
      ...hwall(8, 1192, 520, [{ x: 292 }, { x: 952 }]),
      // fila de abajo: guardia, hall de entrada, administración
      ...hwall(8, 1192, 600, [{ x: 182 }, { x: 520, w: 160 }, { x: 992 }]),
      ...vwall(380, 608, 904), ...vwall(820, 608, 904),
    ],
    doors: [
      { x: 92, y: 250 }, { x: 282, y: 250 }, { x: 492, y: 250, label: 'SEGURIDAD' }, { x: 742, y: 250, label: 'PERSONAL' },
      { x: 1022, y: 250, label: 'MAQUINAS', labelColor: '#ffcf6b' },
      { x: 632, y: 320, lock: ['keycard', 'power'], label: 'CUARENTENA', labelColor: '#8dff9d' },
      { x: 1012, y: 320 }, { x: 292, y: 520 }, { x: 952, y: 520 }, { x: 182, y: 600, label: 'GUARDIA' }, { x: 992, y: 600 },
    ],
    props: [
      // habitaciones
      { k: 'int_bed', x: 24, y: 66 }, { k: 'int_iv', x: 44, y: 70 }, { k: 'int_bed', x: 70, y: 66 }, { k: 'int_curtain', x: 110, y: 64 }, { k: 'int_bed', x: 144, y: 66 },
      { k: 'int_bed_blood', x: 214, y: 66 }, { k: 'int_bed', x: 262, y: 66 }, { k: 'int_gurney', x: 320, y: 150 }, { k: 'int_medcab', x: 350, y: 60 },
      // seguridad
      { k: 'int_desk', x: 404, y: 70 }, { k: 'int_desk', x: 450, y: 70 }, { k: 'int_locker', x: 584, y: 58 }, { k: 'int_locker', x: 600, y: 58 },
      // personal
      { k: 'int_locker', x: 640, y: 58 }, { k: 'int_locker', x: 656, y: 58 }, { k: 'int_locker', x: 672, y: 58 }, { k: 'int_locker', x: 688, y: 58 },
      { k: 'int_chairs', x: 780, y: 180 }, { k: 'int_plant', x: 860, y: 60 }, { k: 'vending_blue', x: 830, y: 60 },
      // sala de máquinas
      { k: 'barrel_blue', x: 1000, y: 170 }, { k: 'barrel_red', x: 1016, y: 176 }, { k: 'pallet', x: 1070, y: 190 }, { k: 'container_gray', x: 1110, y: 150 },
      // sala común
      { k: 'int_bed', x: 24, y: 340 }, { k: 'int_bed', x: 70, y: 340 }, { k: 'int_bed_blood', x: 116, y: 340 }, { k: 'int_curtain', x: 236, y: 338 },
      { k: 'int_bed', x: 270, y: 340 }, { k: 'int_bed', x: 316, y: 340 }, { k: 'int_iv', x: 94, y: 344 },
      { k: 'int_bed', x: 24, y: 440 }, { k: 'int_bed_blood', x: 70, y: 440 }, { k: 'int_wheelchair', x: 200, y: 470 }, { k: 'int_bed', x: 340, y: 440 },
      // cuarentena
      { k: 'int_bed', x: 450, y: 344 }, { k: 'int_curtain', x: 480, y: 342 }, { k: 'int_bed', x: 520, y: 344 }, { k: 'int_bed', x: 740, y: 344 },
      { k: 'int_iv', x: 700, y: 348 }, { k: 'int_medcab', x: 790, y: 336 }, { k: 'int_locker', x: 830, y: 336 }, { k: 'int_gurney', x: 560, y: 470 },
      // depósito
      { k: 'int_shelf', x: 880, y: 338 }, { k: 'int_shelf', x: 912, y: 338 }, { k: 'int_shelf', x: 944, y: 338 },
      { k: 'int_medcab', x: 1110, y: 338 }, { k: 'int_medcab', x: 1140, y: 338 }, { k: 'cardboard', x: 1000, y: 460 }, { k: 'pallet', x: 1120, y: 470 },
      // guardia
      { k: 'int_bed', x: 24, y: 626 }, { k: 'int_curtain', x: 52, y: 624 }, { k: 'int_bed', x: 90, y: 626 }, { k: 'int_bed_blood', x: 136, y: 626 },
      { k: 'int_gurney', x: 250, y: 650 }, { k: 'int_wheelchair', x: 210, y: 760 }, { k: 'int_medcab', x: 340, y: 622 }, { k: 'int_iv', x: 116, y: 630 },
      // hall
      { k: 'int_counter', x: 560, y: 636 }, { k: 'int_plant', x: 396, y: 620 }, { k: 'int_plant', x: 800, y: 620 },
      { k: 'int_chairs', x: 402, y: 760 }, { k: 'int_chairs', x: 440, y: 760 }, { k: 'int_chairs', x: 700, y: 760 }, { k: 'int_chairs', x: 738, y: 760 },
      { k: 'vending_red', x: 770, y: 626 }, { k: 'int_wheelchair', x: 660, y: 820 },
      // administración
      { k: 'int_desk', x: 850, y: 640 }, { k: 'int_desk', x: 910, y: 640 }, { k: 'int_desk', x: 850, y: 740 }, { k: 'int_locker', x: 1160, y: 620 },
      { k: 'int_plant', x: 1170, y: 860 }, { k: 'cardboard', x: 1080, y: 800 },
      // pasillos
      { k: 'int_gurney', x: 420, y: 272 }, { k: 'int_wheelchair', x: 1140, y: 280 }, { k: 'int_gurney', x: 880, y: 548 }, { k: 'int_iv', x: 330, y: 540 },
    ],
    lamps: [
      ...[100, 300, 500, 700, 900, 1100].flatMap((x) => [{ x, y: 292, r: 70, ceiling: true, color: CEIL }, { x, y: 568, r: 70, ceiling: true, color: CEIL }]),
      ...[[100, 150], [290, 150], [500, 150], [750, 150], [1030, 150], [210, 430], [640, 430], [1030, 430], [190, 760], [600, 760], [1010, 760]]
        .map(([x, y]) => ({ x, y, r: 84, ceiling: true, color: CEIL, flicker: x === 290 || x === 1010 })),
      { x: 20, y: 292, r: 46, ceiling: true, emergency: true, color: EMERG }, { x: 1180, y: 292, r: 46, ceiling: true, emergency: true, color: EMERG, flicker: true },
      { x: 20, y: 568, r: 46, ceiling: true, emergency: true, color: EMERG }, { x: 1180, y: 568, r: 46, ceiling: true, emergency: true, color: EMERG },
      { x: 600, y: 890, r: 50, ceiling: true, emergency: true, color: EMERG }, { x: 640, y: 344, r: 40, ceiling: true, emergency: true, color: EMERG, flicker: true },
    ],
    spawns: [{ x: 100, y: 110 }, { x: 1150, y: 110 }, { x: 100, y: 700 }, { x: 1150, y: 820 }, { x: 300, y: 470 }, { x: 1100, y: 470 }, { x: 600, y: 900 }, { x: 740, y: 150 }],
    shop: { x: 777, y: 652 },
    markers: [{ id: 'b1', type: 'breaker', x: 960, y: 78 }, { id: 'b2', type: 'breaker', x: 1130, y: 78 }],
    npcs: [{ ...LUCIA, x: 640, y: 440 }],
    waves: { first: 5, grow: 2, cap: 20, rate: 75, mix: MIX_H },
    loadout: { weapons: ['bat', 'pistol', 'shotgun'], ammo: { pistol: 48, shotgun: 12, rifle: 30 }, bandage: 2, coins: 25 },
    weaponSpots: [{ weapon: 'rifle', x: 750, y: 206 }],
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit', 'rifle'],
    intro: [
      '04:40. El San Rafael está a oscuras.',
      'Lucía dijo cuarentena. Esa puerta pide tarjeta.',
      'Y electricidad.',
    ],
    objective: [
      { type: 'collect', item: 'keycard', text: 'Buscá la tarjeta de acceso en Seguridad', spots: [{ x: 540, y: 190 }] },
      { type: 'interact', text: 'Restablecé la energía en la sala de máquinas', prompt: 'E  SUBIR DISYUNTOR', sfx: 'generator',
        spots: [{ x: 960, y: 92, marker: 'b1' }, { x: 1130, y: 92, marker: 'b2' }],
        onDone: { lights: true, power: true, banner: 'VOLVIÓ LA LUZ... Y ELLOS LO SABEN', danger: true, surge: 16, music: 'combat', shake: 5 } },
      { type: 'rescue', npc: 'lucia', r: 26, text: 'Abrí la cuarentena y encontrá a Lucía',
        onDone: { subtitle: 'LUCÍA: ¡Sabía que alguien iba a venir! Sacame de acá, por favor.' } },
      { type: 'escort', npc: 'lucia', x: 600, y: 880, r: 42, text: 'Escoltá a Lucía hasta la salida', onStart: { surge: 12, banner: 'NO LA DEJES ATRÁS', danger: true } },
    ],
    outro: ['Lucía está viva. Asustada, pero viva.', '"Hay una ambulancia atrás, en el estacionamiento... pero él anda suelto."', '¿Él?'],
  },

  // =========================================================================
  {
    id: 6, world: 2, name: 'La salida', tag: 'ESTACIONAMIENTO · LLUVIA', color: '#26202a',
    desc: 'Escoltá a Lucía hasta la ambulancia. El Paciente Cero no los va a dejar ir.',
    W: 1400, H: 900, ground: 'ground_grass', groundFilter: 'brightness(0.6) saturate(0.6)',
    weather: 'rain', darkness: 0.9, music: 'explore',
    player: { x: 300, y: 250 },
    buildings: [
      { x: 40, y: 20, w: 1320, h: 200, wall: 'white', roof: 'gray', label: 'SAN RAFAEL · EMERGENCIAS', labelColor: '#ff8f8f', door: 0.2, doorKey: 'door_ajar', windows: 'boarded' },
    ],
    areas: [
      walk(0, 220, 1400, 30), { tile: 'ground_asphalt', x: 0, y: 250, w: 1400, h: 380, road: true, filter: 'brightness(0.8)' },
      walk(0, 680, 1400, 20), road(0, 700, 1400, 80), walk(0, 780, 1400, 14),
    ],
    lines: [
      { x1: 0, y1: 740, x2: 1400, y2: 740 },
      ...Array.from({ length: 16 }, (_, i) => ({ x1: 90 + i * 80, y1: 266, x2: 90 + i * 80, y2: 306 })),
      ...Array.from({ length: 16 }, (_, i) => ({ x1: 90 + i * 80, y1: 530, x2: 90 + i * 80, y2: 570 })),
    ],
    zebras: [{ x: 620, y: 700, w: 22, h: 80, dir: 'h' }],
    props: [
      { k: 'car_red', x: 100, y: 268 }, { k: 'car_blue', x: 260, y: 520 }, { k: 'car_gray', x: 420, y: 272 }, { k: 'car_rust', x: 500, y: 525 },
      { k: 'car_scrap', x: 740, y: 272 }, { k: 'car_flipped', x: 820, y: 400 }, { k: 'van', x: 980, y: 280 }, { k: 'car_blue', x: 1060, y: 522 },
      { k: 'car_red', x: 1220, y: 270 }, { k: 'car_rust', x: 1300, y: 525 }, { k: 'truck', x: 400, y: 380 }, { k: 'bus', x: 60, y: 715 },
      { k: 'barrel_red', x: 600, y: 420 }, { k: 'barrel_red', x: 616, y: 426 }, { k: 'barrel_red', x: 1150, y: 430 }, { k: 'barrel_blue', x: 1166, y: 436 },
      { k: 'int_gurney', x: 330, y: 300 }, { k: 'int_wheelchair', x: 700, y: 330 }, { k: 'garbage_bin', x: 30, y: 250 }, { k: 'cone', x: 660, y: 640 }, { k: 'cone', x: 740, y: 640 },
      { k: 'vending_blue', x: 900, y: 226 },
    ],
    lamps: [{ x: 200, y: 400 }, { x: 600, y: 480, flicker: true }, { x: 1000, y: 400 }, { x: 1300, y: 480, flicker: true },
      { x: 400, y: 690 }, { x: 900, y: 690, flicker: true }, { x: 1300, y: 690 }],
    fences: [{ x: 20, y: 628, len: 576 }, { x: 772, y: 628, len: 620 }],
    scatter: [{ k: ['tree_green', 'spruce_green', 'bush_green', 'tree_dead'], n: 30, area: { x: 0, y: 800, w: 1400, h: 100 } }, { k: ['tuft_green'], n: 20 }],
    keepClear: [{ x: 1180, y: 700, w: 120, h: 90 }],
    spawns: [{ x: 15, y: 450 }, { x: 1385, y: 450 }, { x: 15, y: 740 }, { x: 700, y: 890 }, { x: 1385, y: 850 }, { x: 250, y: 890 }],
    shop: { x: 907, y: 256 },
    markers: [{ id: 'amb', type: 'ambulance', x: 1250, y: 752 }],
    npcs: [{ ...LUCIA, x: 330, y: 262, follow: true }],
    finale: 'car',
    waves: { first: 6, grow: 3, cap: 24, rate: 65, mix: MIX_H2 },
    loadout: { weapons: ['bat', 'pistol', 'shotgun', 'rifle'], ammo: { pistol: 48, shotgun: 12, rifle: 60 }, bandage: 2, medkit: 1, coins: 30 },
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit'],
    intro: [
      '05:30. Amanece detrás de la lluvia.',
      'La ambulancia está del otro lado del estacionamiento.',
      'Lucía no se separa de mí.',
    ],
    objective: [
      { type: 'escort', npc: 'lucia', x: 684, y: 660, r: 50, text: 'Cruzá el estacionamiento con Lucía' },
      { type: 'boss', zombie: 'pzero', spawn: { x: 680, y: 262 }, text: 'Sobreviví al Paciente Cero',
        onStart: { banner: 'PACIENTE CERO', danger: true, shake: 12, music: 'final', subtitle: 'LUCÍA: ¡Es él! El primero que trajeron...' } },
      { type: 'escort', npc: 'lucia', x: 1222, y: 742, r: 44, text: 'Subí con Lucía a la ambulancia', onStart: { exitCar: 'amb', music: 'explore' } },
    ],
    outro: ['La ambulancia se pierde en la lluvia.', 'Lucía conoce un lugar: el puerto. Dicen que todavía salen barcos.', 'Esta noche termina. La próxima, quién sabe.'],
  },
];
