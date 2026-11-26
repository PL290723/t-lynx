import { drawPixelPanel, formatScore } from './HUD';
import { PixelFont } from './PixelFont';

const RESTART_DELAY_MS = 500;
const PANEL_X = 112;
const PANEL_WIDTH = 416;
const CENTER_X = PANEL_X + PANEL_WIDTH / 2;

interface GameOverData {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  color: string;
}

export class GameOverOverlay {
  private readonly font: PixelFont;
  private unlockAt = Number.POSITIVE_INFINITY;
  private ready = false;
  private cachedScore = Number.NaN;
  private cachedHighScore = Number.NaN;
  private scoreText = '';
  private recordText = '';

  constructor(font = new PixelFont()) {
    this.font = font;
  }

  open(now = performance.now()): void {
    this.unlockAt = now + RESTART_DELAY_MS;
    this.ready = false;
  }

  advance(now = performance.now()): void {
    this.ready = now >= this.unlockAt;
  }

  canRestart(): boolean {
    return this.ready;
  }

  draw(ctx: CanvasRenderingContext2D, data: GameOverData): void {
    const { score, highScore, isNewRecord, color } = data;
    if (score !== this.cachedScore || highScore !== this.cachedHighScore) {
      this.cachedScore = score;
      this.cachedHighScore = highScore;
      this.scoreText = formatScore(score);
      this.recordText = formatScore(highScore);
    }
    const restartText = 'ESPACIO O TOCA PARA REINICIAR';
    const scoreX = PANEL_X + PANEL_WIDTH / 4;
    const recordX = PANEL_X + PANEL_WIDTH * 3 / 4;

    ctx.save();
    drawPixelPanel(ctx, PANEL_X, 103, PANEL_WIDTH, 161, color);
    this.font.drawCentered(ctx, 'over.title', 'GAME OVER', CENTER_X, 120, color, 3);
    this.font.drawCentered(ctx, 'over.scoreLabel', 'PUNTAJE', scoreX, 158, color, 2);
    this.font.drawCentered(ctx, 'over.recordLabel', 'RÉCORD', recordX, 158, color, 2);
    this.font.drawCentered(
      ctx, 'over.score', this.scoreText, scoreX, 179, color,
      this.font.fit(this.scoreText, PANEL_WIDTH / 2 - 24, 3),
    );
    this.font.drawCentered(
      ctx, 'over.record', this.recordText, recordX, 179, color,
      this.font.fit(this.recordText, PANEL_WIDTH / 2 - 24, 3),
    );

    if (isNewRecord) {
      this.font.drawCentered(ctx, 'over.newRecord', '¡NUEVO RÉCORD!', CENTER_X, 207, color, 2);
    }
    if (this.ready) {
      this.font.drawCentered(
        ctx, 'over.restart', restartText, CENTER_X, 233, color,
        this.font.fit(restartText, PANEL_WIDTH - 24, 2),
      );
    }
    ctx.restore();
  }
}