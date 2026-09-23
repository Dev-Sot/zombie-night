// Dificultades. Todos los valores son multiplicadores sobre el modo normal.
//   zHp/zDmg/zSpeed  vida, daño y velocidad de los zombies
//   waves/rate       cantidad por oleada y ritmo de aparición
//   loot/ammo        chance de botín y munición por caja
//   price/heal       precios de la tienda y curación de vendas/botiquines
//   dark             oscuridad extra; revive: tiempo para levantar a un compañero
//   early            las variantes duras aparecen N oleadas antes
export const DIFFS = {
  normal: {
    id: 'normal', name: 'NORMAL', color: '#e9e6df',
    desc: 'El desafío equilibrado: tenso pero justo.',
    zHp: 1, zDmg: 1, zSpeed: 1, waves: 1, rate: 1, loot: 1, ammo: 1, price: 1, heal: 1, dark: 0, revive: 1, early: 0,
  },
  pesadilla: {
    id: 'pesadilla', name: 'PESADILLA', color: '#e8483f',
    desc: 'Zombies más duros y rápidos, menos balas, todo más caro. Cada error se paga.',
    zHp: 1.45, zDmg: 1.5, zSpeed: 1.15, waves: 1.5, rate: 1.35, loot: 0.55, ammo: 0.7, price: 1.4, heal: 0.7, dark: 0.05, revive: 1.6, early: 1,
  },
};

export const priceOf = (it, D) => Math.round(it.price * (D?.price || 1));
// clave de guardado del mejor rango: '1' en normal, 'p1' en pesadilla
export const bestKey = (id, diff) => (diff === 'pesadilla' ? `p${id}` : `${id}`);
