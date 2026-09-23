import { S, dist } from '../core/state.js';
import { removeProp } from './world.js';
import { explosion } from './fx.js';
import { damageZombie } from './zombies.js';
import { hurtPlayer } from './player.js';

// Barriles rojos: absorben un par de balas y explotan (en cadena si hay otros cerca).
export function hitProp(pr, dmg, by) {
  if (!pr.def?.explosive || pr.exploded) return;
  pr.hp -= dmg;
  pr.hitFlash = 4;
  if (pr.hp <= 0) explode(pr, by);
}

function explode(pr, by) {
  pr.exploded = true;
  const x = pr.x + pr.w / 2, y = pr.y + pr.h - 4;
  removeProp(S.world, pr);
  explosion(x, y);
  const R = 58;
  for (const z of S.zombies) {
    const d = dist(z.x, z.y, x, y);
    if (d < R) damageZombie(z, 140 * (1 - d / R) + 30, Math.atan2(z.y - y, z.x - x), 7, by);
  }
  for (const p of S.players) {
    const d = dist(p.x, p.y, x, y);
    if (d < R * 0.8 && !p.dead) hurtPlayer(p, Math.round(35 * (1 - d / R)), Math.atan2(p.y - y, p.x - x), true);
  }
  for (const other of S.world.props) {
    if (other.def?.explosive && !other.exploded && dist(other.x, other.y, pr.x, pr.y) < R) {
      setTimeout(() => hitProp(other, 999, by), 180);
    }
  }
}
