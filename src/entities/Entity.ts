import type { Rect, Vector2 } from '../types/game.types';

const HITBOX_INSET = 3;

export abstract class Entity {
  readonly position: Vector2;
  readonly previousPosition: Vector2;
  width: number;
  height: number;
  showHitbox = false;

  protected constructor(x: number, y: number, width: number, height: number) {
    this.position = { x, y };
    this.previousPosition = { x, y };
    this.width = width;
    this.height = height;
  }

  get hitbox(): Rect {
    return {
      x: this.position.x + HITBOX_INSET,
      y: this.position.y + HITBOX_INSET,
      width: this.width - HITBOX_INSET * 2,
      height: this.height - HITBOX_INSET * 2,
    };
  }

  abstract update(dt: number): void;

  abstract render(ctx: CanvasRenderingContext2D, alpha: number): void;

  protected savePreviousPosition(): void {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
  }

  protected interpolatedPosition(alpha: number): Vector2 {
    const interpolation = Math.max(0, Math.min(1, alpha));

    return {
      x:
        this.previousPosition.x +
        (this.position.x - this.previousPosition.x) * interpolation,
      y:
        this.previousPosition.y +
        (this.position.y - this.previousPosition.y) * interpolation,
    };
  }

  protected renderHitbox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    if (!this.showHitbox) {
      return;
    }

    const hitbox = this.hitbox;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      x + hitbox.x - this.position.x,
      y + hitbox.y - this.position.y,
      hitbox.width,
      hitbox.height,
    );
  }
}
