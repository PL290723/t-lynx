export const SpriteAnimation = {
  Running: 'running',
  Jumping: 'jumping',
  Ducking: 'ducking',
  Defeated: 'defeated',
} as const;

export type SpriteAnimation =
  (typeof SpriteAnimation)[keyof typeof SpriteAnimation];

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 32;
const DUCK_FRAME_HEIGHT = 20;

const SpriteColors = {
  outline: '#302018',
  fur: '#d98c3f',
  furLight: '#f0b765',
  furDark: '#a9562e',
  cream: '#f5e1b5',
  innerEar: '#8f4531',
  eye: '#182b35',
  eyeShine: '#ffffff',
  paw: '#4b3023',
} as const;

type FrameCanvas = HTMLCanvasElement;

export class SpriteSheet {
  private readonly frames: Readonly<Record<SpriteAnimation, readonly FrameCanvas[]>>;

  constructor() {
    this.frames = {
      [SpriteAnimation.Running]: Array.from({ length: 4 }, (_, index) =>
        this.createFrame(FRAME_WIDTH, FRAME_HEIGHT, (ctx) =>
          this.drawRunningFrame(ctx, index),
        ),
      ),
      [SpriteAnimation.Jumping]: [
        this.createFrame(FRAME_WIDTH, FRAME_HEIGHT, (ctx) =>
          this.drawJumpingFrame(ctx),
        ),
      ],
      [SpriteAnimation.Ducking]: Array.from({ length: 2 }, (_, index) =>
        this.createFrame(FRAME_WIDTH, DUCK_FRAME_HEIGHT, (ctx) =>
          this.drawDuckingFrame(ctx, index),
        ),
      ),
      [SpriteAnimation.Defeated]: [
        this.createFrame(FRAME_WIDTH, FRAME_HEIGHT, (ctx) =>
          this.drawDefeatedFrame(ctx),
        ),
      ],
    };
  }

  getFrame(animation: SpriteAnimation, index: number): FrameCanvas {
    const frames = this.frames[animation];
    const normalizedIndex = ((Math.floor(index) % frames.length) + frames.length) % frames.length;

    return frames[normalizedIndex];
  }

  private createFrame(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): FrameCanvas {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo crear el contexto 2D para los sprites');
    }

    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    return canvas;
  }

  private drawRunningFrame(ctx: CanvasRenderingContext2D, frame: number): void {
    const legs = [
      { rearX: 7, rearY: 23, frontX: 19, frontY: 23 },
      { rearX: 8, rearY: 22, frontX: 18, frontY: 25 },
      { rearX: 7, rearY: 24, frontX: 19, frontY: 22 },
      { rearX: 8, rearY: 25, frontX: 18, frontY: 22 },
    ][frame];

    this.drawTail(ctx, 3, 17);
    this.drawLeg(ctx, legs.rearX, legs.rearY, 5, 32 - legs.rearY);
    this.drawBody(ctx, 5, 15, 19, 13);
    this.drawLeg(ctx, legs.frontX, legs.frontY, 5, 32 - legs.frontY);
    this.drawHead(ctx, 14, 6);
  }

  private drawJumpingFrame(ctx: CanvasRenderingContext2D): void {
    this.drawTail(ctx, 2, 15);
    this.drawLeg(ctx, 7, 20, 6, 8);
    this.drawBody(ctx, 5, 13, 19, 13);
    this.drawLeg(ctx, 19, 22, 6, 7);
    this.drawHead(ctx, 14, 4);
    this.drawBlock(ctx, SpriteColors.cream, 10, 25, 4, 3);
  }

  private drawDuckingFrame(ctx: CanvasRenderingContext2D, frame: number): void {
    this.drawTail(ctx, 1, 10);
    this.drawBody(ctx, 3, 8, 21, 9);
    this.drawLeg(ctx, 5 + frame, 15, 7, 5);
    this.drawLeg(ctx, 18 - frame, 15, 7, 5);
    this.drawHead(ctx, 14, 1);
    this.drawBlock(ctx, SpriteColors.cream, 9, 12, 8, 3);
  }

  private drawDefeatedFrame(ctx: CanvasRenderingContext2D): void {
    this.drawTail(ctx, 2, 20);
    this.drawBody(ctx, 4, 19, 22, 9);
    this.drawLeg(ctx, 7, 15, 5, 8);
    this.drawLeg(ctx, 18, 15, 5, 8);
    this.drawHead(ctx, 19, 12);
    this.drawBlock(ctx, SpriteColors.eye, 25, 19, 3, 1);
    this.drawBlock(ctx, SpriteColors.eye, 11, 23, 3, 2);
  }

  private drawTail(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    this.drawBlock(ctx, SpriteColors.outline, x, y, 7, 9);
    this.drawBlock(ctx, SpriteColors.fur, x + 2, y + 2, 5, 6);
    this.drawBlock(ctx, SpriteColors.outline, x, y + 6, 4, 4);
    this.drawBlock(ctx, SpriteColors.furDark, x + 1, y + 7, 3, 2);
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.drawBlock(ctx, SpriteColors.outline, x, y, width, height);
    this.drawBlock(ctx, SpriteColors.fur, x + 2, y + 2, width - 4, height - 4);
    this.drawBlock(
      ctx,
      SpriteColors.furLight,
      x + 3,
      y + 2,
      Math.max(2, width - 8),
      3,
    );
    this.drawBlock(
      ctx,
      SpriteColors.cream,
      x + 5,
      y + height - 5,
      Math.max(2, width - 10),
      3,
    );
    this.drawBlock(ctx, SpriteColors.furDark, x + 8, y + 6, 2, 2);
    this.drawBlock(ctx, SpriteColors.furDark, x + 14, y + 8, 2, 2);
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    this.drawBlock(ctx, SpriteColors.outline, x + 2, y, 5, 9);
    this.drawBlock(ctx, SpriteColors.outline, x + 11, y, 5, 9);
    this.drawBlock(ctx, SpriteColors.fur, x + 3, y + 3, 3, 5);
    this.drawBlock(ctx, SpriteColors.fur, x + 12, y + 3, 3, 5);
    this.drawBlock(ctx, SpriteColors.innerEar, x + 4, y + 4, 1, 3);
    this.drawBlock(ctx, SpriteColors.innerEar, x + 13, y + 4, 1, 3);

    this.drawBlock(ctx, SpriteColors.outline, x, y + 5, 17, 15);
    this.drawBlock(ctx, SpriteColors.fur, x + 2, y + 7, 13, 11);
    this.drawBlock(ctx, SpriteColors.furLight, x + 3, y + 7, 10, 3);
    this.drawBlock(ctx, SpriteColors.cream, x + 8, y + 14, 7, 4);
    this.drawBlock(ctx, SpriteColors.outline, x + 13, y + 15, 2, 2);
    this.drawBlock(ctx, SpriteColors.eye, x + 9, y + 11, 2, 2);
    this.drawBlock(ctx, SpriteColors.eyeShine, x + 9, y + 11, 1, 1);
    this.drawBlock(ctx, SpriteColors.furDark, x + 5, y + 13, 2, 2);
  }

  private drawLeg(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (height <= 0) {
      return;
    }

    this.drawBlock(ctx, SpriteColors.outline, x, y, width, height);
    this.drawBlock(
      ctx,
      SpriteColors.fur,
      x + 1,
      y,
      width - 2,
      Math.max(1, height - 2),
    );
    this.drawBlock(
      ctx,
      SpriteColors.paw,
      x,
      y + height - 2,
      width,
      Math.min(2, height),
    );
  }

  private drawBlock(
    ctx: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }
}
