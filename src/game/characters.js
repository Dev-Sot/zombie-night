// Sobrevivientes jugables. Cada uno tiene una ventaja chica que cambia cómo
// juega el equipo (como en Left 4 Dead: nadie es "mejor", se complementan).
// mods: multiplicadores y extras que leen player.js, weapons.js y pickups.js.
export const CHARACTERS = [
  {
    id: 'tomas', name: 'Tomás', role: 'Electricista', color: '#9fd88f',
    bio: 'Estaba arreglando la subestación del barrio cuando se cortó todo.',
    perk: 'Manos rápidas', perkDesc: 'Recarga 30% más rápido y su linterna alumbra más lejos.',
    mods: { reload: 0.7, light: 1.3 },
  },
  {
    id: 'vera', name: 'Vera', role: 'Policía', color: '#7cc4ff',
    bio: 'Quince años en la comisaría del centro. Nunca vio una noche así.',
    perk: 'Puntería', perkDesc: '+20% de daño con armas de fuego y empieza con más balas.',
    mods: { gunDmg: 1.2, startAmmo: { pistol: 24 } },
  },
  {
    id: 'hugo', name: 'Hugo', role: 'Obrero', color: '#ffcf6b',
    bio: 'Levantaba edificios. Ahora los usa para esconderse.',
    perk: 'Aguante', perkDesc: '+30 de vida máxima y +40% de daño cuerpo a cuerpo. Un poco más lento.',
    mods: { maxHp: 130, melee: 1.4, speed: 0.94 },
  },
  {
    id: 'nina', name: 'Nina', role: 'Paramédica', color: '#ff8f8f',
    bio: 'Iba en la última ambulancia que salió del hospital.',
    perk: 'Primeros auxilios', perkDesc: 'Cura 50% más, levanta compañeros el doble de rápido y trae un botiquín.',
    mods: { heal: 1.5, revive: 2, startMedkit: 1 },
  },
  {
    id: 'bruno', name: 'Bruno', role: 'Soldado', color: '#c4d18a',
    bio: 'Su unidad no volvió del puente. Él sí.',
    perk: 'Logística', perkDesc: 'Saca 50% más munición de cada caja y tira con menos dispersión.',
    mods: { ammo: 1.5, spread: 0.6 },
  },
];

export const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
