export type PixelScale = 1 | 2 | 3;

const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;
const GLYPH_STEP = GLYPH_WIDTH + 1;
const LEFT_PIXEL = 0b10000;
const QUESTION_MARK = [14, 17, 1, 2, 4, 0, 4] as const;

function countGlyphs(text: string): number {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const codePoint = text.charCodeAt(index);
    if (
      codePoint >= 0xd800 &&
      codePoint <= 0xdbff &&
      index + 1 < text.length
    ) {
      const nextCodePoint = text.charCodeAt(index + 1);
      if (nextCodePoint >= 0xdc00 && nextCodePoint <= 0xdfff) {
        index += 1;
      }
    }
    count += 1;
  }
  return count;
}

// Cada número es una fila de cinco bits, con el bit más alto a la izquierda.
const GLYPHS: Readonly<Record<string, readonly number[] | undefined>> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 18, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  Á: [2, 4, 14, 17, 31, 17, 17],
  É: [2, 4, 31, 16, 30, 16, 31],
  Í: [2, 4, 14, 4, 4, 4, 14],
  Ó: [2, 4, 14, 17, 17, 17, 14],
  Ú: [2, 4, 17, 17, 17, 17, 14],
  Ñ: [13, 22, 17, 25, 21, 19, 17],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [30, 1, 1, 14, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 16, 30, 1, 1, 30],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 0, 12, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "¡": [4, 0, 4, 4, 4, 4, 4],
  "?": QUESTION_MARK,
  "-": [0, 0, 0, 31, 0, 0, 0],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "%": [17, 2, 4, 4, 8, 16, 17],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "↓": [4, 4, 4, 4, 21, 14, 4],
};

interface CachedText {
  canvas: HTMLCanvasElement;
  text: string;
  color: string;
  scale: PixelScale;
}

export class PixelFont {
  // Cada elemento de UI conserva un solo bitmap, incluso si cambia cada cuadro.
  private readonly cache = new Map<string, CachedText>();

  measure(text: string, scale: PixelScale): number {
    const length = countGlyphs(text.normalize("NFC").toUpperCase());
    return Math.max(0, length * GLYPH_STEP - 1) * scale;
  }

  fit(text: string, maxWidth: number, preferredScale: PixelScale): PixelScale {
    const width = this.measure(text, 1);
    if (preferredScale === 3 && width * 3 <= maxWidth) return 3;
    if (preferredScale >= 2 && width * 2 <= maxWidth) return 2;
    return 1;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    slot: string,
    text: string,
    x: number,
    y: number,
    color: string,
    scale: PixelScale,
  ): void {
    const canvas = this.bitmap(slot, text, color, scale);
    ctx.drawImage(canvas, Math.round(x), Math.round(y));
  }

  drawCentered(
    ctx: CanvasRenderingContext2D,
    slot: string,
    text: string,
    centerX: number,
    y: number,
    color: string,
    scale: PixelScale,
  ): void {
    const canvas = this.bitmap(slot, text, color, scale);
    ctx.drawImage(canvas, Math.round(centerX - canvas.width / 2), Math.round(y));
  }

  private bitmap(
    slot: string,
    text: string,
    color: string,
    scale: PixelScale,
  ): HTMLCanvasElement {
    const cached = this.cache.get(slot);
    if (cached?.text === text && cached.color === color && cached.scale === scale) {
      return cached.canvas;
    }

    const canvas = cached?.canvas ?? document.createElement("canvas");
    const glyphs = text.normalize("NFC").toUpperCase();
    const glyphCount = countGlyphs(glyphs);
    canvas.width = Math.max(1, (glyphCount * GLYPH_STEP - 1) * scale);
    canvas.height = GLYPH_HEIGHT * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el canvas de la fuente pixel.");
    ctx.fillStyle = color;

    let index = 0;
    for (const glyph of glyphs) {
      const rows = GLYPHS[glyph] ?? QUESTION_MARK;
      for (let row = 0; row < rows.length; row += 1) {
        const bits = rows[row];
        for (let column = 0; column < GLYPH_WIDTH; column += 1) {
          if (bits & (LEFT_PIXEL >> column)) {
            const x = (index * GLYPH_STEP + column) * scale;
            ctx.fillRect(x, row * scale, scale, scale);
          }
        }
      }
      index += 1;
    }

    if (cached) {
      cached.text = text;
      cached.color = color;
      cached.scale = scale;
    } else {
      this.cache.set(slot, { canvas, text, color, scale });
    }
    return canvas;
  }
}