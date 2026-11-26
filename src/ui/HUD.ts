import { PixelFont } from './PixelFont';

const CENTER_X = 320;
const RIGHT_MARGIN_X = 628;
const FLASH_INTERVAL_MS = 140;
const FLASH_DURATION_MS = 840;
const START_PROMPT = 'PRESIONA ESPACIO O TOCA PARA JUGAR';
const CONTROLS = 'SALTA: W  AGÁCHATE: S/DESLIZA ↓  M: SILENCIO';
const PORTRAIT_HINT = 'GIRA TU DISPOSITIVO PARA JUGAR MEJOR';

interface HudData {
  score: number;
  highScore: number;
  hasShield: boolean;
  isMuted: boolean;
  isSupported: boolean;
  color: string;
}

export class HUD {
  private readonly font: PixelFont;
  private milestoneStartedAt = Number.NEGATIVE_INFINITY;

  constructor(font = new PixelFont()) {
    this.font = font;
  }

  onMilestone(now = performance.now()): void {
    this.milestoneStartedAt = now;
  }

  resetMilestone(): void {
    this.milestoneStartedAt = Number.NEGATIVE_INFINITY;
  }

  draw(ctx: CanvasRenderingContext2D, data: HudData, now = performance.now()): void {
    const { score, highScore, hasShield, isMuted, isSupported, color } = data;
    const recordText = `HI ${formatScore(highScore)}  `;
    const scoreText = formatScore(score);
    const scale = this.font.fit(recordText + scoreText, 416, 2);
    const scoreX = RIGHT_MARGIN_X - this.font.measure(scoreText, scale);
    const recordX = scoreX - this.font.measure(recordText, scale) - scale;
    const scorePanelX = recordX - (hasShield ? 28 : 8);
    const soundText = isSupported && !isMuted ? 'SONIDO: ON' : 'SONIDO: OFF';
    const elapsed = now - this.milestoneStartedAt;
    const showScore =
      elapsed >= FLASH_DURATION_MS ||
      Math.floor(elapsed / FLASH_INTERVAL_MS) % 2 === 1;

    ctx.save();
    drawPixelPanel(ctx, scorePanelX, 8, RIGHT_MARGIN_X + 8 - scorePanelX, 26, color);
    drawPixelPanel(ctx, 8, 8, this.font.measure(soundText, 2) + 16, 26, color);
    this.font.draw(ctx, 'hud.highScore', recordText, recordX, 14, color, scale);
    if (showScore) {
      this.font.draw(ctx, 'hud.score', scoreText, scoreX, 14, color, scale);
    }
    if (hasShield) {
      drawCan(ctx, recordX - 21, 12);
    }
    this.font.draw(ctx, 'hud.sound', soundText, 16, 14, color, 2);
    ctx.restore();
  }

  drawStartScreen(ctx: CanvasRenderingContext2D, color: string): void {
    const panelWidth = 554;
    const textWidth = panelWidth - 24;

    ctx.save();
    drawPixelPanel(ctx, CENTER_X - panelWidth / 2, 120, panelWidth, 120, color);
    this.font.drawCentered(ctx, 'start.title', 'T-LYNX', CENTER_X, 132, color, 3);
    this.font.drawCentered(
      ctx, 'start.prompt', START_PROMPT, CENTER_X, 176, color,
      this.font.fit(START_PROMPT, textWidth, 2),
    );
    this.font.drawCentered(
      ctx, 'start.controls', CONTROLS, CENTER_X, 207, color,
      this.font.fit(CONTROLS, textWidth, 2),
    );
    ctx.restore();
  }

  drawPortraitHint(ctx: CanvasRenderingContext2D, color: string): void {
    const scale = this.font.fit(PORTRAIT_HINT, 600, 2);
    const width = this.font.measure(PORTRAIT_HINT, scale) + 16;

    ctx.save();
    drawPixelPanel(ctx, CENTER_X - width / 2, 326, width, 26, color);
    this.font.drawCentered(ctx, 'hud.portrait', PORTRAIT_HINT, CENTER_X, 332, color, scale);
    ctx.restore();
  }
}

export function formatScore(score: number): string {
  return String(score).padStart(5, '0');
}

export function drawPixelPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  textColor: string,
): void {
  // DayNightCycle entrega colores #RRGGBB, incluso durante las transiciones.
  const rgb = Number.parseInt(textColor.slice(1), 16);
  const luminance =
    0.2126 * linearColor((rgb >>> 16) & 255) +
    0.7152 * linearColor((rgb >>> 8) & 255) +
    0.0722 * linearColor(rgb & 255);

  ctx.fillStyle = luminance > 0.179 ? 'rgba(0,0,0,0.94)' : 'rgba(255,255,255,0.94)';
  ctx.fillRect(x + 2, y + 2, width - 4, 2);
  ctx.fillRect(x, y + 4, width, height - 8);
  ctx.fillRect(x + 2, y + height - 4, width - 4, 2);

  ctx.fillStyle = textColor;
  ctx.fillRect(x + 4, y, width - 8, 2);
  ctx.fillRect(x + 4, y + height - 2, width - 8, 2);
}

function linearColor(byte: number): number {
  const channel = byte / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function drawCan(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#17384a';
  ctx.fillRect(x + 1, y, 10, 18);
  ctx.fillRect(x, y + 2, 12, 14);

  ctx.fillStyle = '#17b6c9';
  ctx.fillRect(x + 2, y + 2, 8, 14);
  ctx.fillStyle = '#08758a';
  ctx.fillRect(x + 8, y + 2, 2, 14);
  ctx.fillStyle = '#d9f4f7';
  ctx.fillRect(x + 2, y + 1, 8, 2);
  ctx.fillRect(x + 2, y + 15, 8, 2);

  ctx.fillStyle = '#ffe45c';
  ctx.fillRect(x + 5, y + 5, 2, 3);
  ctx.fillRect(x + 4, y + 8, 4, 2);
  ctx.fillRect(x + 5, y + 10, 2, 3);
}