/**
 * Sistema de partículas pixel-art con un pool de tamaño fijo.
 *
 * Todas las partículas viven en arreglos tipados creados una sola vez en el
 * constructor (struct of arrays). Emitir, actualizar y dibujar no crea objetos,
 * así que el recolector de basura no tiene nada que limpiar durante la partida.
 * Los espacios libres se administran con una pila de índices: tomar y devolver
 * una partícula cuesta O(1).
 */

/** Capacidad máxima del pool. Si se llena, las emisiones nuevas se descartan. */
const MAX_PARTICLES = 256;

const DUST_GRAVITY = 220; // px/s², el polvo cae despacio
const PAPER_GRAVITY = 520; // px/s², los fragmentos caen más rápido
const PAPER_DRAG = 0.9; // fracción de velocidad horizontal que se conserva por segundo

/**
 * Paleta fija: las partículas guardan el índice del color, no el texto, para no
 * crear strings durante el juego.
 */
const PARTICLE_COLORS = [
  '#c9a46a', // 0 polvo claro (color del suelo)
  '#a07a45', // 1 polvo oscuro
  '#e8d3a6', // 2 polvo muy claro
  '#ffffff', // 3 papel blanco
  '#f5e1b5', // 4 papel crema
  '#d7dde3', // 5 papel gris
  '#c0392b', // 6 tapa roja
  '#2e86c1', // 7 tapa azul
] as const;

const DUST_COLORS = [0, 1, 2] as const;
const PAPER_COLORS = [3, 3, 4, 5, 6, 7] as const;

const ParticleKind = {
  Dust: 0,
  Paper: 1,
} as const;

type ParticleKind = (typeof ParticleKind)[keyof typeof ParticleKind];

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomIndex(values: readonly number[]): number {
  return values[Math.floor(Math.random() * values.length)];
}

export class ParticleSystem {
  private readonly x = new Float32Array(MAX_PARTICLES);
  private readonly y = new Float32Array(MAX_PARTICLES);
  private readonly prevX = new Float32Array(MAX_PARTICLES);
  private readonly prevY = new Float32Array(MAX_PARTICLES);
  private readonly vx = new Float32Array(MAX_PARTICLES);
  private readonly vy = new Float32Array(MAX_PARTICLES);
  private readonly life = new Float32Array(MAX_PARTICLES);
  private readonly maxLife = new Float32Array(MAX_PARTICLES);
  private readonly size = new Uint8Array(MAX_PARTICLES);
  private readonly color = new Uint8Array(MAX_PARTICLES);
  private readonly kind = new Uint8Array(MAX_PARTICLES);
  private readonly alive = new Uint8Array(MAX_PARTICLES);

  /** Pila de índices libres. freeCount marca cuántos hay disponibles. */
  private readonly freeStack = new Uint16Array(MAX_PARTICLES);
  private freeCount = MAX_PARTICLES;
  private droppedCount = 0;

  constructor() {
    this.reset();
  }

  /** Partículas vivas en este momento. */
  get activeCount(): number {
    return MAX_PARTICLES - this.freeCount;
  }

  get capacity(): number {
    return MAX_PARTICLES;
  }

  /** Partículas que no se pudieron emitir porque el pool estaba lleno. */
  get dropped(): number {
    return this.droppedCount;
  }

  /** Polvo al saltar o aterrizar: (x, y) es el punto de los pies sobre el suelo. */
  emitDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const index = this.acquire();
      if (index < 0) {
        return;
      }

      this.spawn(
        index,
        ParticleKind.Dust,
        x + randomRange(-10, 10),
        y - randomRange(0, 3),
        randomRange(-70, 40),
        randomRange(-80, -20),
        randomRange(0.25, 0.45),
        Math.random() < 0.7 ? 2 : 1,
        randomIndex(DUST_COLORS),
      );
    }
  }

  /**
   * Fragmentos de papel al destruir un obstáculo: salen del rectángulo del
   * obstáculo hacia arriba y caen con gravedad.
   */
  emitPaper(x: number, y: number, width: number, height: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const index = this.acquire();
      if (index < 0) {
        return;
      }

      this.spawn(
        index,
        ParticleKind.Paper,
        x + Math.random() * width,
        y + Math.random() * height,
        randomRange(-90, 140),
        randomRange(-260, -80),
        randomRange(0.7, 1.2),
        Math.random() < 0.5 ? 3 : 2,
        randomIndex(PAPER_COLORS),
      );
    }
  }

  /**
   * Avanza todas las partículas. scrollSpeed es la velocidad del mundo (px/s):
   * las partículas se quedan "pegadas" al escenario y se desplazan con él.
   */
  update(dt: number, scrollSpeed: number, groundY: number, viewWidth: number): void {
    const dragFactor = Math.pow(PAPER_DRAG, dt);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.alive[i] === 0) {
        continue;
      }

      this.prevX[i] = this.x[i];
      this.prevY[i] = this.y[i];
      this.life[i] -= dt;

      if (this.kind[i] === ParticleKind.Paper) {
        this.vy[i] += PAPER_GRAVITY * dt;
        this.vx[i] *= dragFactor;
      } else {
        this.vy[i] += DUST_GRAVITY * dt;
      }

      this.x[i] += (this.vx[i] - scrollSpeed) * dt;
      this.y[i] += this.vy[i] * dt;

      // Los fragmentos rebotan un poco al tocar el suelo y se frenan.
      if (this.y[i] > groundY) {
        this.y[i] = groundY;
        this.vy[i] *= -0.25;
        this.vx[i] *= 0.5;
      }

      const offScreen = this.x[i] < -8 || this.x[i] > viewWidth + 8;
      if (this.life[i] <= 0 || offScreen) {
        this.release(i);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    if (this.freeCount === MAX_PARTICLES) {
      return;
    }

    const previousAlpha = ctx.globalAlpha;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.alive[i] === 0) {
        continue;
      }

      // Se desvanece en el último 60 % de su vida.
      const remaining = this.life[i] / this.maxLife[i];
      ctx.globalAlpha = remaining < 0.6 ? remaining / 0.6 : 1;
      ctx.fillStyle = PARTICLE_COLORS[this.color[i]];

      const drawX = this.prevX[i] + (this.x[i] - this.prevX[i]) * alpha;
      const drawY = this.prevY[i] + (this.y[i] - this.prevY[i]) * alpha;
      const s = this.size[i];
      ctx.fillRect(Math.round(drawX), Math.round(drawY) - s, s, s);
    }

    ctx.globalAlpha = previousAlpha;
  }

  /** Elimina todas las partículas (al empezar una partida nueva). */
  reset(): void {
    this.alive.fill(0);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.freeStack[i] = MAX_PARTICLES - 1 - i;
    }
    this.freeCount = MAX_PARTICLES;
    this.droppedCount = 0;
  }

  private acquire(): number {
    if (this.freeCount === 0) {
      this.droppedCount++;
      return -1;
    }

    this.freeCount--;
    return this.freeStack[this.freeCount];
  }

  private release(index: number): void {
    this.alive[index] = 0;
    this.freeStack[this.freeCount] = index;
    this.freeCount++;
  }

  private spawn(
    index: number,
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: number,
  ): void {
    this.alive[index] = 1;
    this.kind[index] = kind;
    this.x[index] = x;
    this.y[index] = y;
    this.prevX[index] = x;
    this.prevY[index] = y;
    this.vx[index] = vx;
    this.vy[index] = vy;
    this.life[index] = life;
    this.maxLife[index] = life;
    this.size[index] = size;
    this.color[index] = color;
  }
}