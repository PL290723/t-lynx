const FIXED_STEP_SECONDS = 1 / 60;
const MAX_DELTA_SECONDS = 0.25;
// Absorbe errores de redondeo justo en el límite de un paso.
const STEP_EPSILON = 1e-9;

export class GameLoop {
  private readonly update: (dt: number) => void;
  private readonly render: (alpha: number) => void;
  private running = false;
  private frameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private sampleStart = 0;
  private sampleFrames = 0;
  private sampleUpdates = 0;
  private renderFps = 0;
  private updateRate = 0;

  constructor(update: (dt: number) => void, render: (alpha: number) => void) {
    this.update = update;
    this.render = render;
  }

  get fps(): number {
    return this.renderFps;
  }

  get ups(): number {
    return this.updateRate;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.accumulator = 0;
    this.renderFps = 0;
    this.updateRate = 0;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();
  }

  stop(): void {
    this.running = false;
    this.cancelFrame();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private cancelFrame(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.cancelFrame();
      return;
    }

    if (this.frameId === null) {
      // Conserva la fracción del último paso para mantener la interpolación.
      this.lastTime = performance.now();
      this.sampleStart = this.lastTime;
      this.sampleFrames = 0;
      this.sampleUpdates = 0;
      this.frameId = requestAnimationFrame(this.onFrame);
    }
  };

  private readonly onFrame = (): void => {
    this.frameId = null;
    if (!this.running || document.hidden) {
      return;
    }

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, MAX_DELTA_SECONDS);
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator + STEP_EPSILON >= FIXED_STEP_SECONDS) {
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP_SECONDS);
      this.sampleUpdates++;
      this.update(FIXED_STEP_SECONDS);

      if (!this.running || document.hidden || this.frameId !== null) {
        return;
      }
    }

    this.sampleFrames++;
    const sampleSeconds = (now - this.sampleStart) / 1000;
    if (sampleSeconds >= 1) {
      this.renderFps = Math.round(this.sampleFrames / sampleSeconds);
      this.updateRate = Math.round(this.sampleUpdates / sampleSeconds);
      this.sampleStart = now;
      this.sampleFrames = 0;
      this.sampleUpdates = 0;
    }

    this.render(this.accumulator / FIXED_STEP_SECONDS);

    if (this.running && !document.hidden && this.frameId === null) {
      this.frameId = requestAnimationFrame(this.onFrame);
    }
  };
}