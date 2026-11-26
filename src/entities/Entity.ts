import type { Rect, Vector2 } from '../types/game.types';

export abstract class Entity {
  readonly position: Vector2;
  readonly previousPosition: Vector2;
  private readonly cachedHitbox: Rect;
  private readonly cachedInterpolatedPosition: Vector2;
  width: number;
  height: number;
  showHitbox = false;
  protected horizontalHitboxInset: number;
  protected verticalHitboxInset: number;

  protected constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    horizontalHitboxInset = 3,
    verticalHitboxInset = 2,
  ) {
    this.position = { x, y };
    this.previousPosition = { x, y };
    this.cachedHitbox = { x: 0, y: 0, width, height };
    this.cachedInterpolatedPosition = { x, y };
    this.width = width;
    this.height = height;
    this.horizontalHitboxInset = horizontalHitboxInset;
    this.verticalHitboxInset = verticalHitboxInset;
  }

  get hitbox(): Rect {
    this.cachedHitbox.x = this.position.x + this.horizontalHitboxInset;
    this.cachedHitbox.y = this.position.y + this.verticalHitboxInset;
    this.cachedHitbox.width = this.width - this.horizontalHitboxInset * 2;
    this.cachedHitbox.height = this.height - this.verticalHitboxInset * 2;
    return this.cachedHitbox;
  }

  protected setHitboxInsets(horizontal: number, vertical: number): void {
    this.horizontalHitboxInset = horizontal;
    this.verticalHitboxInset = vertical;
  }

  abstract update(dt: number): void;

  abstract render(ctx: CanvasRenderingContext2D, alpha: number): void;

  protected savePreviousPosition(): void {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
  }

  protected interpolatedPosition(alpha: number): Vector2 {
    const interpolation = Math.max(0, Math.min(1, alpha));

    this.cachedInterpolatedPosition.x =
      this.previousPosition.x +
      (this.position.x - this.previousPosition.x) * interpolation;
    this.cachedInterpolatedPosition.y =
      this.previousPosition.y +
      (this.position.y - this.previousPosition.y) * interpolation;
    return this.cachedInterpolatedPosition;
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
