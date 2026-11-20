type ResizeListener = () => void;

export class Engine {
  private readonly logicalWidth = 640;
  private readonly logicalHeight = 360;
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly viewport: HTMLElement;
  private readonly resizeListeners: ResizeListener[] = [];

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

  get width(): number {
    return this.logicalWidth;
  }

  get height(): number {
    return this.logicalHeight;
  }

  clear(): void {
    this.context.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  /** Registra una función que se ejecuta cada vez que el canvas cambia de tamaño. */
  onResize(listener: ResizeListener): void {
    this.resizeListeners.push(listener);
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

    for (const listener of this.resizeListeners) {
      listener();
    }
  };
}