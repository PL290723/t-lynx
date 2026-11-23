import type { Entity } from '../entities/Entity';
import type { Player } from '../entities/Player';
import type { Rect } from '../types/game.types';

/** Dos AABB que solo se tocan por el borde no se consideran una colisión. */
export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class CollisionSystem {
  firstCollision(player: Player, obstacles: readonly Entity[]): Entity | null {
    for (const obstacle of obstacles) {
      if (intersects(player.hitbox, obstacle.hitbox)) {
        return obstacle;
      }
    }

    return null;
  }
}
