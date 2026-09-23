// Frases de los sobrevivientes durante la partida (al estilo Left 4 Dead):
// cada uno habla a su manera cuando recarga, cae, levanta a alguien, etc.
// Se muestran como subtítulos cortos; en online el anfitrión las reenvía.
import { S, bus } from '../core/state.js';
import { charById } from './characters.js';

const LINES = {
  tomas: {
    start: ['Nada de héroes. Llegamos y nos vamos.', 'Otra noche. Tranquilo, Tomás.'],
    reload: ['Cambio cargador.', 'Dame un segundo...'],
    low: ['Esto no pinta bien.', 'Estoy sangrando mucho.'],
    down: ['¡Me agarraron! ¡Ayuda!'],
    revive: ['Arriba, vamos.', 'Te tengo.'],
    thanks: ['Te debo una.'],
    boss: ['Eso no es un zombie normal...'],
    scream: ['¡Un gritón! ¡Callalo!'],
  },
  vera: {
    start: ['Mantengan la formación. Nadie se separa.', 'Ojos en los costados.'],
    reload: ['¡Recargando!', 'Cubrime, recargo.'],
    low: ['Me dieron... sigo de pie.'],
    down: ['¡Oficial caída! ¡Necesito ayuda!'],
    revive: ['Arriba. No te me mueras.'],
    thanks: ['Gracias. Te cubro.'],
    boss: ['Grandote. Apunten a la cabeza.'],
    scream: ['¡Gritón a la vista! ¡Neutralícenlo!'],
  },
  hugo: {
    start: ['A romper cabezas.', 'Vamos, que se hace tarde.'],
    reload: ['Cargando...', 'Esperá que cargo.'],
    low: ['Esto duele más que una viga en la espalda.'],
    down: ['¡Me tiraron abajo!'],
    revive: ['Upa. Arriba, que hay laburo.'],
    thanks: ['Ya está, ya está.'],
    boss: ['Ese es de mi tamaño.'],
    scream: ['¡Ese grita! ¡Denle!'],
  },
  nina: {
    start: ['Si alguien se lastima, me avisa.', 'Respiren hondo. Vamos.'],
    reload: ['Recargo, cúbranme.'],
    low: ['Necesito vendarme, ya.'],
    down: ['¡No me dejen acá!'],
    revive: ['Respirá. Ya pasó. Arriba.'],
    thanks: ['Gracias... de verdad.'],
    boss: ['Por Dios... ¿qué le hicieron?'],
    scream: ['¡Ese grito los atrae! ¡Rápido!'],
  },
  bruno: {
    start: ['Ojos abiertos. Esto recién empieza.', 'En silencio y en grupo.'],
    reload: ['¡Cambio!', 'Recargando, cubran el flanco.'],
    low: ['Herido. Sigo operativo.'],
    down: ['¡Caído! ¡Caído!'],
    revive: ['Arriba, soldado.'],
    thanks: ['Recibido. Gracias.'],
    boss: ['Objetivo grande al frente. Fuego concentrado.'],
    scream: ['¡Gritón! ¡Prioridad uno!'],
  },
};
// probabilidad de hablar y espera mínima (en cuadros) por tipo
const CHANCE = { reload: 0.3, start: 1, low: 1, down: 1, revive: 1, thanks: 1, boss: 1, scream: 0.8 };
const COOLDOWN = 60 * 6;

export function bark(p, kind, force = false) {
  if (!p || p.isNpc || p.gone) return;
  const lines = LINES[p.char]?.[kind];
  if (!lines) return;
  if (!force && (S.t - (p.barkAt ?? -1e9) < COOLDOWN || Math.random() > CHANCE[kind])) return;
  p.barkAt = S.t;
  const c = charById(p.char);
  bus.emit('bark', { name: c.name, color: c.color, text: lines[Math.floor(Math.random() * lines.length)] });
}

// alguien vivo al azar (para frases del grupo: jefe, gritón, arranque)
export function anyone() {
  const alive = S.players.filter((p) => !p.dead && !p.gone && !p.boarded);
  return alive[Math.floor(Math.random() * alive.length)];
}
