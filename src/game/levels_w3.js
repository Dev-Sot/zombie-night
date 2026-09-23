// Mundo 3 — El Puerto. Noches 7 a 9: el final de la historia.
// La ambulancia llega al Puerto Sur. Un barco, La Esperanza, sale al amanecer.

const road = (x, y, w, h) => ({ tile: 'ground_asphalt', x, y, w, h, road: true });
const walk = (x, y, w, h) => ({ tile: 'ground_sidewalk', x, y, w, h, road: true, edge: 'rgba(0,0,0,0.35)' });
const wood = (x, y, w, h) => ({ tile: 'ground_wood', x, y, w, h, road: true, filter: 'brightness(0.6) saturate(0.6)' });
const floor = (x, y, w, h) => ({ tile: 'int_floor', x, y, w, h, road: true });

function hwall(x1, x2, y, gaps = []) {
  const out = [];
  let x = x1;
  for (const g of gaps) { if (g.x > x) out.push({ x, y, w: g.x - x, h: 8 }); x = g.x + (g.w || 16); }
  if (x2 > x) out.push({ x, y, w: x2 - x, h: 8 });
  return out;
}
const vwall = (x, y1, y2) => [{ x, y: y1, w: 8, h: y2 - y1 }];

// patio de contenedores: filas con pasillos entre medio
function yard(x0, y0, cols, rows, skip = []) {
  const out = [], kinds = ['container_gray', 'container_red', 'container_gray', 'container_red'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (skip.some(([sc, sr]) => sc === c && sr === r)) continue;
      out.push({ k: kinds[(r * 3 + c) % kinds.length], x: x0 + c * 44, y: y0 + r * 70 });
    }
  }
  return out;
}

const MIX_P = [['walker', 5, 1], ['runner', 3, 1], ['thrower', 2, 1], ['screamer', 1, 1], ['bloater', 2, 2], ['brute', 2, 2], ['toxic', 2, 2], ['nurse', 2, 1]];
const LUCIA = { id: 'lucia', name: 'Lucía', hp: 110, sprite: 'lucia', color: '#9fd0ff', follow: true };
const PORT_LIGHT = 'rgba(255,200,140,';

export const LEVELS_W3 = [
  // =========================================================================
  {
    id: 7, world: 3, name: 'Los muelles', tag: 'TERMINAL · NIEBLA', color: '#1c2630',
    desc: 'Un contenedor tapa el único muelle. La grúa puede moverlo... si alguien la enciende.',
    W: 1400, H: 950, ground: 'ground_asphalt', groundFilter: 'brightness(0.6) saturate(0.5)',
    weather: 'fog', darkness: 0.88, music: 'explore',
    player: { x: 160, y: 150 },
    water: [{ x: 0, y: 790, w: 628, h: 160 }, { x: 672, y: 790, w: 728, h: 160 }, { x: 1320, y: 0, w: 80, h: 790 }],
    areas: [
      road(0, 80, 1320, 70), walk(0, 150, 1320, 20),
      { tile: 'ground_cobble', x: 0, y: 700, w: 1320, h: 90, road: true, filter: 'brightness(0.55)' },
      wood(628, 776, 44, 174), floor(112, 292, 256, 176),
    ],
    lines: [{ x1: 0, y1: 115, x2: 1320, y2: 115 }],
    zebras: [],
    walls: [...hwall(112, 368, 292), ...vwall(112, 292, 468), ...vwall(360, 292, 468), ...hwall(112, 368, 460, [{ x: 224 }])],
    doors: [
      { x: 224, y: 460, key: 'door' },
      { id: 'blocker', style: 'container', key: 'container_red', x: 628, y: 766, w: 44, h: 24 },
    ],
    roofs: [{ x: 112, y: 292, w: 256, h: 176, roof: 'gray', label: 'CAPITANIA', labelColor: '#9fd0ff' }],
    props: [
      { k: 'ambulance', x: 70, y: 96 }, { k: 'car_flipped', x: 320, y: 90 }, { k: 'truck', x: 900, y: 70 },
      { k: 'int_desk', x: 128, y: 312 }, { k: 'int_desk', x: 176, y: 312 }, { k: 'int_locker', x: 330, y: 302 }, { k: 'int_locker', x: 314, y: 302 },
      { k: 'int_shelf', x: 262, y: 302 }, { k: 'int_chairs', x: 140, y: 400 }, { k: 'int_plant', x: 340, y: 420 },
      ...yard(460, 250, 14, 6, [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [2, 2], [10, 1], [11, 4], [3, 4], [0, 5], [13, 3]]),
      { k: 'barrel_red', x: 1210, y: 660 }, { k: 'barrel_red', x: 1226, y: 666 }, { k: 'barrel_blue', x: 560, y: 720 }, { k: 'pallet', x: 760, y: 730 },
      { k: 'tire', x: 400, y: 720 }, { k: 'cardboard', x: 430, y: 240 }, { k: 'forklift', x: 0, y: 0 },
    ].filter((p) => p.k !== 'forklift'),
    lamps: [{ x: 420, y: 200 }, { x: 900, y: 200, flicker: true }, { x: 1260, y: 330 }, { x: 420, y: 700 }, { x: 900, y: 700, flicker: true },
      { x: 640, y: 780, r: 60, color: PORT_LIGHT }, { x: 240, y: 520 }],
    fences: [{ x: 0, y: 176, len: 380 }, { x: 460, y: 176, len: 860 }],
    scatter: [{ k: ['tuft_dead'], n: 20 }],
    keepClear: [],
    spawns: [{ x: 20, y: 110 }, { x: 1300, y: 110 }, { x: 1290, y: 700 }, { x: 20, y: 740 }, { x: 740, y: 270 }, { x: 1000, y: 620 }],
    shop: { x: 420, y: 740 },
    markers: [{ id: 'crane', type: 'crane', x: 1200, y: 520 }],
    npcs: [{ ...LUCIA, x: 186, y: 150 }],
    waves: { first: 5, grow: 2, cap: 22, rate: 70, mix: MIX_P },
    loadout: { weapons: ['bat', 'pistol', 'shotgun', 'rifle'], ammo: { pistol: 48, shotgun: 12, rifle: 60 }, bandage: 2, medkit: 1, coins: 30 },
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit'],
    intro: [
      '04:02. La ambulancia murió en la entrada del Puerto Sur.',
      'LUCÍA: El barco se llama La Esperanza. Sale al amanecer, del muelle norte.',
      'Primero hay que llegar al agua. Y un contenedor tapa el único muelle.',
    ],
    objective: [
      { type: 'collect', item: 'key', text: 'Buscá la llave de la grúa en la capitanía', spots: [{ x: 300, y: 430 }] },
      { type: 'interact', text: 'Encendé la grúa', prompt: 'E  ENCENDER LA GRÚA', sfx: 'generator', spots: [{ x: 1180, y: 548, marker: 'crane' }],
        onDone: { banner: 'LA GRÚA HACE RUIDO... Y ELLOS LO OYEN', danger: true, surge: 16, music: 'combat', shake: 4 } },
      { type: 'survive', seconds: 40, text: 'Aguantá mientras la grúa levanta el contenedor', at: { 20: { surge: 10 } },
        onDone: { open: 'blocker', banner: 'EL MUELLE ESTÁ LIBRE', music: 'explore' } },
      { type: 'escort', npc: 'lucia', x: 650, y: 915, r: 40, text: 'Llevá a Lucía hasta el final del muelle' },
    ],
    outro: [
      'Al final del muelle, la radio de un bote encontró al barco.',
      'CAPITÁN: Con esta tormenta no entramos al puerto sin el faro.',
      'El faro está apagado. Al final de la escollera.',
    ],
  },

  // =========================================================================
  {
    id: 8, world: 3, name: 'El faro', tag: 'ESCOLLERA · TORMENTA', color: '#1a2230',
    desc: 'Una escollera angosta en medio del mar y un faro que hay que volver a encender.',
    W: 1300, H: 1000, ground: 'ground_cobble', groundFilter: 'brightness(0.45) sepia(0.35)',
    weather: 'storm', darkness: 0.9, music: 'explore',
    player: { x: 200, y: 930 },
    water: [
      { x: 0, y: 0, w: 1300, h: 60 }, { x: 0, y: 60, w: 760, h: 370 }, { x: 1100, y: 60, w: 200, h: 790 },
      { x: 760, y: 260, w: 60, h: 170 }, { x: 920, y: 260, w: 180, h: 170 }, { x: 920, y: 430, w: 180, h: 90 },
      { x: 0, y: 430, w: 150, h: 420 }, { x: 250, y: 520, w: 850, h: 330 },
    ],
    areas: [
      { tile: 'ground_deadgrass', x: 0, y: 850, w: 1300, h: 150, road: true, filter: 'brightness(0.6)' },
      walk(158, 500, 84, 350), walk(150, 438, 770, 74), walk(828, 260, 84, 178),
    ],
    lines: [], zebras: [],
    props: [
      { k: 'barrel_red', x: 1020, y: 120 }, { k: 'barrel_red', x: 1036, y: 128 }, { k: 'pallet', x: 800, y: 90 }, { k: 'cardboard', x: 1060, y: 190 },
      { k: 'tire', x: 470, y: 450 }, { k: 'barrel_blue', x: 700, y: 490 }, { k: 'car_rust', x: 60, y: 880 }, { k: 'car_scrap', x: 1100, y: 890 },
      { k: 'bench', x: 400, y: 900 }, { k: 'cone', x: 180, y: 820 }, { k: 'cone', x: 225, y: 820 },
    ],
    lamps: [{ x: 200, y: 700, flicker: true }, { x: 400, y: 470 }, { x: 700, y: 470, flicker: true }, { x: 870, y: 350 }, { x: 600, y: 870 }],
    fences: [],
    scatter: [{ k: ['tuft_dead', 'bush_dead'], n: 30, area: { x: 0, y: 860, w: 1300, h: 140 } }],
    keepClear: [],
    spawns: [{ x: 20, y: 930 }, { x: 1280, y: 930 }, { x: 650, y: 985 }, { x: 1080, y: 80 }, { x: 780, y: 80 }, { x: 560, y: 475 }],
    shop: { x: 520, y: 900 },
    markers: [{ id: 'lh', type: 'lighthouse', x: 940, y: 170 }, { id: 'gen', type: 'generator', x: 1040, y: 232 }],
    npcs: [{ ...LUCIA, x: 226, y: 936 }],
    waves: { first: 6, grow: 3, cap: 24, rate: 65, mix: MIX_P },
    loadout: { weapons: ['bat', 'pistol', 'shotgun', 'rifle'], ammo: { pistol: 48, shotgun: 12, rifle: 60 }, bandage: 2, medkit: 1, coins: 30 },
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit'],
    intro: [
      '04:51. El viento no deja escuchar ni los propios pasos.',
      'La escollera es angosta. Si nos rodean ahí, no hay para dónde correr.',
      'LUCÍA: Mirá el agua... algo se mueve abajo.',
    ],
    objective: [
      { type: 'reach', x: 870, y: 290, r: 45, text: 'Cruzá la escollera hasta el faro' },
      { type: 'interact', text: 'Arrancá el generador del faro', prompt: 'E  ARRANCAR EL GENERADOR', sfx: 'generator', spots: [{ x: 1040, y: 246, marker: 'gen' }],
        onDone: { marker: 'lh', lights: true, banner: 'EL FARO SE ENCIENDE', danger: true, surge: 18, music: 'combat', shake: 5 } },
      { type: 'hold', x: 930, y: 180, r: 105, seconds: 50, text: 'Mantené el faro encendido hasta que el barco lo vea', outside: 'Volvé al faro',
        onDone: { subtitle: 'CAPITÁN: ¡Los vemos! Atracamos en el muelle norte al amanecer. No lleguen tarde.', music: 'explore' } },
    ],
    outro: ['El faro gira sobre el mar.', 'A lo lejos, una bocina larga contesta.', 'La Esperanza viene. Tenemos hasta el amanecer.'],
  },

  // =========================================================================
  {
    id: 9, world: 3, name: 'Amanecer', tag: 'MUELLE NORTE · EL FINAL', color: '#2a1e1a',
    desc: 'Resistí en el muelle hasta que baje la pasarela. Es la última noche.',
    W: 1400, H: 900, ground: 'ground_asphalt', groundFilter: 'brightness(0.62) saturate(0.5)',
    weather: 'rain', darkness: 0.9, music: 'explore', sunrise: true,
    player: { x: 700, y: 820 },
    water: [{ x: 0, y: 0, w: 1400, h: 210 }],
    areas: [walk(0, 210, 1400, 40), { tile: 'ground_cobble', x: 520, y: 250, w: 360, h: 120, road: true, filter: 'brightness(0.55)' }],
    lines: [{ x1: 0, y1: 470, x2: 1400, y2: 470 }],
    zebras: [],
    buildings: [
      { x: 40, y: 560, w: 260, h: 180, wall: 'gray', roof: 'gray', label: 'DEPOSITO 4', windows: 'boarded', doorKey: 'door_boarded', door: 0.5 },
      { x: 1100, y: 560, w: 260, h: 180, wall: 'beige', roof: 'red', roofFilter: 'saturate(0.5)', label: 'ADUANA', windows: 'mixed', door: 0.4 },
    ],
    props: [
      { k: 'container_gray', x: 400, y: 330 }, { k: 'container_red', x: 960, y: 330 }, { k: 'container_red', x: 360, y: 440 },
      { k: 'container_gray', x: 1000, y: 440 }, { k: 'container_green_v', x: 560, y: 520 }, { k: 'container_green_v', x: 816, y: 520 },
      { k: 'barrel_red', x: 520, y: 400 }, { k: 'barrel_red', x: 536, y: 406 }, { k: 'barrel_red', x: 860, y: 400 }, { k: 'barrel_red', x: 876, y: 406 },
      { k: 'pallet', x: 640, y: 420 }, { k: 'pallet', x: 720, y: 430 }, { k: 'car_flipped', x: 200, y: 400 }, { k: 'truck', x: 1160, y: 360 },
      { k: 'car_rust', x: 480, y: 700 }, { k: 'car_blue', x: 900, y: 690 }, { k: 'van', x: 640, y: 760 }, { k: 'bench', x: 300, y: 260 },
    ],
    lamps: [{ x: 300, y: 240 }, { x: 560, y: 240, r: 70, color: PORT_LIGHT }, { x: 1100, y: 240 }, { x: 460, y: 620, flicker: true }, { x: 940, y: 620 }, { x: 700, y: 860 }],
    fences: [],
    scatter: [{ k: ['tuft_dead'], n: 16 }],
    keepClear: [],
    spawns: [{ x: 20, y: 400 }, { x: 1380, y: 400 }, { x: 20, y: 820 }, { x: 1380, y: 820 }, { x: 700, y: 890 }, { x: 350, y: 890 }, { x: 1050, y: 890 }],
    shop: { x: 300, y: 300 },
    markers: [{ id: 'ship', type: 'ship', x: 700, y: 180 }],
    npcs: [{ ...LUCIA, x: 724, y: 828 }],
    finale: 'car',
    waves: { first: 7, grow: 3, cap: 26, rate: 55, mix: MIX_P },
    loadout: { weapons: ['bat', 'pistol', 'shotgun', 'rifle', 'axe'], ammo: { pistol: 60, shotgun: 18, rifle: 90 }, bandage: 2, medkit: 2, coins: 40 },
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit'],
    intro: [
      '05:58. Nunca una noche fue tan larga.',
      'Las luces de La Esperanza esperan en el muelle norte.',
      'LUCÍA: Pase lo que pase... gracias por no dejarme sola.',
    ],
    objective: [
      { type: 'reach', x: 700, y: 320, r: 70, text: 'Llegá al muelle norte',
        onDone: { subtitle: 'CAPITÁN: ¡Estamos bajando la pasarela! ¡Necesitamos tiempo!', banner: 'RESISTAN', danger: true, music: 'final', surge: 20, shake: 4 } },
      { type: 'survive', seconds: 80, dawn: 0.75, text: 'Resistí hasta que bajen la pasarela',
        at: { 15: { gunship: true, subtitle: 'RAMIRO: ¿Me extrañaron? Los cubro desde arriba.' }, 45: { surge: 16, banner: 'SIGUEN LLEGANDO', danger: true } } },
      { type: 'boss', zombie: 'colossus', spawn: { x: 700, y: 880 }, text: 'Detené al Coloso',
        onStart: { banner: 'EL COLOSO', danger: true, shake: 14, subtitle: 'LUCÍA: ¡Eso no es humano!' } },
      { type: 'escort', npc: 'lucia', x: 700, y: 226, r: 40, text: 'Subí a La Esperanza con Lucía', onStart: { exitCar: 'ship', music: 'explore', banner: 'LA PASARELA ESTÁ ABAJO' } },
    ],
    outro: [
      'La Esperanza soltó amarras con cuarenta y tres personas a bordo.',
      'Ramiro aterrizó en la cubierta con el tanque vacío.',
      'Lucía no soltó mi mano hasta que la costa se perdió de vista.',
      'Esa noche tampoco hubo luna.',
      'Pero amaneció.',
    ],
  },
];
