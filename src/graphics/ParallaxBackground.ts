import type { PaletteColors } from './ColorPalette';
import { GROUND_Y } from './PrototypeScene';

const CLOUD_SPEED_FACTOR = 0.1;
const DISTANT_SPEED_FACTOR = 0.25;
const NEARBY_SPEED_FACTOR = 0.5;
const GROUND_SPEED_FACTOR = 1;
const GROUND_MARK_SPACING = 48;

const CLOUD_X = [48, 205, 385, 565] as const;
const CLOUD_Y = [67, 43, 82, 54] as const;
const CLOUD_SCALE = [0.8, 1.15, 0.7, 0.95] as const;

const DISTANT_BUILDINGS = [
  { x: 8, width: 76, height: 74 },
  { x: 105, width: 112, height: 108 },
  { x: 244, width: 68, height: 82 },
  { x: 340, width: 104, height: 118 },
  { x: 478, width: 82, height: 90 },
  { x: 584, width: 56, height: 70 },
] as const;

const NEARBY_BUILDINGS = [
  { x: 28, width: 92, height: 62 },
  { x: 155, width: 72, height: 88 },
  { x: 264, width: 106, height: 70 },
  { x: 408, width: 84, height: 98 },
  { x: 532, width: 90, height: 74 },
] as const;

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function createLayerCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class ParallaxBackground {
  private readonly width: number;
  private readonly height: number;
  private readonly distantCanvas: HTMLCanvasElement;
  private readonly nearbyCanvas: HTMLCanvasElement;
  private readonly distantContext: CanvasRenderingContext2D;
  private readonly nearbyContext: CanvasRenderingContext2D;
  private previousCloudOffset = 0;
  private cloudOffset = 0;
  private previousDistantOffset = 0;
  private distantOffset = 0;
  private previousNearbyOffset = 0;
  private nearbyOffset = 0;
  private previousGroundOffset = 0;
  private groundOffset = 0;
  private palette: PaletteColors | null = null;
  private skyGradient: CanvasGradient | null = null;
  private gradientPalette: PaletteColors | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.distantCanvas = createLayerCanvas(width, GROUND_Y);
    this.nearbyCanvas = createLayerCanvas(width, GROUND_Y);

    const distantContext = this.distantCanvas.getContext('2d');
    const nearbyContext = this.nearbyCanvas.getContext('2d');

    if (!distantContext || !nearbyContext) {
      throw new Error('No se pudieron crear las capas del fondo');
    }

    this.distantContext = distantContext;
    this.nearbyContext = nearbyContext;
  }

  setPalette(palette: PaletteColors): void {
    if (this.palette === palette) {
      return;
    }

    this.palette = palette;
    this.drawBuildingLayer(
      this.distantContext,
      DISTANT_BUILDINGS,
      palette.distantBuildings,
      palette.windows,
      0.66,
    );
    this.drawBuildingLayer(
      this.nearbyContext,
      NEARBY_BUILDINGS,
      palette.nearbyBuildings,
      palette.windows,
      0.82,
    );
  }

  update(dt: number, worldSpeed: number): void {
    this.previousCloudOffset = this.cloudOffset;
    this.previousDistantOffset = this.distantOffset;
    this.previousNearbyOffset = this.nearbyOffset;
    this.previousGroundOffset = this.groundOffset;

    this.cloudOffset += worldSpeed * CLOUD_SPEED_FACTOR * dt;
    this.distantOffset += worldSpeed * DISTANT_SPEED_FACTOR * dt;
    this.nearbyOffset += worldSpeed * NEARBY_SPEED_FACTOR * dt;
    this.groundOffset += worldSpeed * GROUND_SPEED_FACTOR * dt;
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const palette = this.palette;
    if (!palette) {
      throw new Error('La paleta del fondo debe configurarse antes de dibujar');
    }

    if (this.gradientPalette !== palette || !this.skyGradient) {
      this.skyGradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      this.skyGradient.addColorStop(0, palette.skyTop);
      this.skyGradient.addColorStop(1, palette.skyBottom);
      this.gradientPalette = palette;
    }

    ctx.fillStyle = this.skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawClouds(
      ctx,
      positiveModulo(
        this.previousCloudOffset +
          (this.cloudOffset - this.previousCloudOffset) * alpha,
        this.width,
      ),
      palette.clouds,
    );

    this.drawRepeatedLayer(
      ctx,
      this.distantCanvas,
      positiveModulo(
        this.previousDistantOffset +
          (this.distantOffset - this.previousDistantOffset) * alpha,
        this.width,
      ),
    );
    this.drawRepeatedLayer(
      ctx,
      this.nearbyCanvas,
      positiveModulo(
        this.previousNearbyOffset +
          (this.nearbyOffset - this.previousNearbyOffset) * alpha,
        this.width,
      ),
    );

    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);

    ctx.strokeStyle = palette.groundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(this.width, GROUND_Y);
    ctx.stroke();

    this.drawGroundMarks(
      ctx,
      positiveModulo(
        this.previousGroundOffset +
          (this.groundOffset - this.previousGroundOffset) * alpha,
        GROUND_MARK_SPACING,
      ),
      palette.groundLine,
    );
  }

  reset(): void {
    this.previousCloudOffset = 0;
    this.cloudOffset = 0;
    this.previousDistantOffset = 0;
    this.distantOffset = 0;
    this.previousNearbyOffset = 0;
    this.nearbyOffset = 0;
    this.previousGroundOffset = 0;
    this.groundOffset = 0;
  }

  private drawBuildingLayer(
    ctx: CanvasRenderingContext2D,
    buildings: readonly { x: number; width: number; height: number }[],
    buildingColor: string,
    windowColor: string,
    windowAlpha: number,
  ): void {
    ctx.clearRect(0, 0, this.width, GROUND_Y);

    for (const building of buildings) {
      const top = GROUND_Y - building.height;
      ctx.fillStyle = buildingColor;
      ctx.fillRect(building.x, top, building.width, building.height);

      ctx.globalAlpha = windowAlpha;
      ctx.fillStyle = windowColor;
      for (let y = top + 12; y < GROUND_Y - 10; y += 22) {
        for (let x = building.x + 10; x < building.x + building.width - 10; x += 20) {
          ctx.fillRect(x, y, 7, 9);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawRepeatedLayer(
    ctx: CanvasRenderingContext2D,
    layer: HTMLCanvasElement,
    offset: number,
  ): void {
    ctx.drawImage(layer, -offset, 0);
    ctx.drawImage(layer, this.width - offset, 0);
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    offset: number,
    color: string,
  ): void {
    ctx.fillStyle = color;

    for (let index = 0; index < CLOUD_X.length; index++) {
      const x = CLOUD_X[index] - offset;
      const y = CLOUD_Y[index];
      const scale = CLOUD_SCALE[index];

      for (let tile = -1; tile <= 1; tile++) {
        this.drawCloud(ctx, x + tile * this.width, y, scale);
      }
    }
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + 38 * scale, y);
    ctx.arc(x + 24 * scale, y, 14 * scale, 0, Math.PI * 2);
    ctx.arc(x + 48 * scale, y - 8 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.arc(x + 72 * scale, y, 14 * scale, 0, Math.PI * 2);
    ctx.arc(x + 48 * scale, y + 6 * scale, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGroundMarks(
    ctx: CanvasRenderingContext2D,
    offset: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    for (
      let x = -offset;
      x < this.width;
      x += GROUND_MARK_SPACING
    ) {
      ctx.fillRect(x, GROUND_Y + 18, 18, 2);
    }
  }
}
