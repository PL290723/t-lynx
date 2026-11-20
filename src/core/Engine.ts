export class Engine {
  private readonly logicalWidth = 640;
  private readonly logicalHeight = 360;
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly viewport: HTMLElement;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: HTMLElement,
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('No se pudo obtener el contexto 2D del canvas');
    }

    this.context = context;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  clear(): void {
    this.context.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  private readonly resize = (): void => {
    const viewportWidth = this.viewport.clientWidth;
    const viewportHeight = this.viewport.clientHeight;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    const scale = Math.min(
      viewportWidth / this.logicalWidth,
      viewportHeight / this.logicalHeight,
    );
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = Math.round(this.logicalWidth * pixelRatio);
    const canvasHeight = Math.round(this.logicalHeight * pixelRatio);

    if (this.canvas.width !== canvasWidth) {
      this.canvas.width = canvasWidth;
    }

    if (this.canvas.height !== canvasHeight) {
      this.canvas.height = canvasHeight;
    }

    this.canvas.style.width = `${this.logicalWidth * scale}px`;
    this.canvas.style.height = `${this.logicalHeight * scale}px`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.context.imageSmoothingEnabled = false;
  };
}
