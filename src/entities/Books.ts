import { Entity } from './Entity';
import { GROUND_Y } from '../graphics/PrototypeScene';

const BOOKS_WIDTH = 16;
const BOOK_OUTLINE = '#1e1e1e';

export const BOOK_VARIANTS = [
  { height: 16, colors: ['#c0392b'] },
  { height: 24, colors: ['#2e86c1', '#27ae60'] },
  { height: 32, colors: ['#8e44ad', '#2e86c1', '#d68910'] },
] as const;

type BookVariant = (typeof BOOK_VARIANTS)[number];

export class Books extends Entity {
  active = false;
  scrollSpeed = 0;
  private variant: BookVariant = BOOK_VARIANTS[0];

  constructor() {
    const height = BOOK_VARIANTS[0].height;
    super(0, GROUND_Y - height, BOOKS_WIDTH, height);
  }

  activate(x: number, variant: BookVariant): void {
    this.variant = variant;
    this.height = variant.height;
    this.position.x = x;
    this.position.y = GROUND_Y - this.height;
    this.savePreviousPosition();
    this.active = true;
  }

  update(dt: number): void {
    this.savePreviousPosition();
    this.position.x -= this.scrollSpeed * dt;
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const { x, y } = this.interpolatedPosition(alpha);
    const colors = this.variant.colors;
    const ground = y + this.height;
    const bookHeight = this.height / colors.length;
    let bottom = ground;

    ctx.strokeStyle = BOOK_OUTLINE;
    ctx.lineWidth = 1;

    for (let index = 0; index < colors.length; index++) {
      const top = ground - Math.round((index + 1) * bookHeight);
      const height = bottom - top;
      ctx.fillStyle = colors[index];
      ctx.fillRect(x, top, this.width, height);
      ctx.strokeRect(x + 0.5, top + 0.5, this.width - 1, height - 1);
      bottom = top;
    }

    this.renderHitbox(ctx, x, y);
  }
}