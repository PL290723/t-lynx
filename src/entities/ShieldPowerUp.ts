import { Entity } from './Entity';

export const SHIELD_POWER_UP_WIDTH = 16;
export const SHIELD_POWER_UP_HEIGHT = 16;

const FLOAT_AMPLITUDE = 3;
const FLOAT_PERIOD_SECONDS = 1.2;
const FLOAT_ANGULAR_SPEED = (Math.PI * 2) / FLOAT_PERIOD_SECONDS;

const CanColors = {
  glow: '#7ff8ff',
  outline: '#17384a',
  metal: '#d9f4f7',
  body: '#17b6c9',
  shadow: '#08758a',
  highlight: '#ecffff',
  energy: '#ffe45c',
} as const;

export class ShieldPowerUp extends Entity {
  active = false;
  scrollSpeed = 0;
  private baseY = 0;
  private floatTime = 0;

  constructor() {
    super(0, 0, SHIELD_POWER_UP_WIDTH, SHIELD_POWER_UP_HEIGHT, 2, 2);
  }

  activate(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.savePreviousPosition();
    this.baseY = y;
    this.floatTime = 0;
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
    this.scrollSpeed = 0;
  }

  update(dt: number): void {
    if (!this.active) {
      return;
    }

    this.savePreviousPosition();
    this.position.x -= this.scrollSpeed * dt;
    this.floatTime += dt;
    this.position.y =
      this.baseY + Math.sin(this.floatTime * FLOAT_ANGULAR_SPEED) * FLOAT_AMPLITUDE;
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    if (!this.active) {
      return;
    }

    const position = this.interpolatedPosition(alpha);
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    const glowAlpha =
      0.18 + (Math.sin(this.floatTime * FLOAT_ANGULAR_SPEED) + 1) * 0.07;

    ctx.save();

    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = CanColors.glow;
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = CanColors.outline;
    ctx.fillRect(x + 3, y + 1, 10, 14);

    ctx.fillStyle = CanColors.body;
    ctx.fillRect(x + 4, y + 2, 8, 12);

    ctx.fillStyle = CanColors.shadow;
    ctx.fillRect(x + 10, y + 3, 2, 10);

    ctx.fillStyle = CanColors.highlight;
    ctx.fillRect(x + 5, y + 3, 1, 8);

    ctx.fillStyle = CanColors.metal;
    ctx.fillRect(x + 4, y + 1, 8, 2);
    ctx.fillRect(x + 4, y + 13, 8, 2);

    ctx.strokeStyle = CanColors.outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 8, y + 2, 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = CanColors.energy;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'bevel';
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 4);
    ctx.lineTo(x + 7, y + 8);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x + 7, y + 12);
    ctx.stroke();

    ctx.restore();
    this.renderHitbox(ctx, position.x, position.y);
  }
}