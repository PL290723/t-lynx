import { Entity } from './Entity';
import { GROUND_Y } from '../graphics/PrototypeScene';

const AIRPLANE_WIDTH = 24;
const AIRPLANE_HEIGHT = 16;

/** Los aviones vuelan más rápido que el suelo: velocidad del mundo × este factor. */
export const AIRPLANE_SPEED_FACTOR = 1.35;

/** Duración de cada frame del aleteo (2 frames). */
const FLAP_FRAME_DURATION = 0.15;

const AirplaneColors = {
  paper: '#f4f4f4',
  shade: '#c9d2db',
  fold: '#7f8c99',
  outline: '#3d4a57',
} as const;

/**
 * Carriles de vuelo, medidos como la "y" superior del sprite (24x16).
 * La hitbox del avión tiene 3 px de margen: ocupa de y + 3 a y + 13.
 *
 * Hitbox del lince (GROUND_Y = 300):
 *   - De pie:    y de 271 a 297
 *   - Agachado:  y de 283 a 296
 *
 * - Low:    y = 280 → hitbox 283–293. Choca de pie y agachado: hay que saltar.
 * - Medium: y = 264 → hitbox 267–277. Choca de pie (6 px), deja 6 px libres
 *           sobre el lince agachado (283): hay que agacharse.
 * - High:   y = 236 → hitbox 239–249. Pasa 22 px sobre la cabeza: no requiere
 *           acción (solo choca si el lince salta).
 */
export const AirplaneLane = {
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
} as const;

export type AirplaneLane = (typeof AirplaneLane)[keyof typeof AirplaneLane];

export const AIRPLANE_LANE_Y: Readonly<Record<AirplaneLane, number>> = {
  [AirplaneLane.Low]: GROUND_Y - 20,
  [AirplaneLane.Medium]: GROUND_Y - 36,
  [AirplaneLane.High]: GROUND_Y - 64,
};

export const AIRPLANE_LANES = Object.values(AirplaneLane);

export class Airplane extends Entity {
  active = false;
  /** Velocidad del mundo; el avión la multiplica por AIRPLANE_SPEED_FACTOR. */
  scrollSpeed = 0;
  private currentLane: AirplaneLane = AirplaneLane.Low;
  private flapTime = 0;
  private flapFrame = 0;

  constructor() {
    super(0, AIRPLANE_LANE_Y[AirplaneLane.Low], AIRPLANE_WIDTH, AIRPLANE_HEIGHT);
  }

  get lane(): AirplaneLane {
    return this.currentLane;
  }

  activate(x: number, lane: AirplaneLane): void {
    this.currentLane = lane;
    this.position.x = x;
    this.position.y = AIRPLANE_LANE_Y[lane];
    this.savePreviousPosition();
    this.flapTime = 0;
    this.flapFrame = 0;
    this.active = true;
  }

  update(dt: number): void {
    this.savePreviousPosition();
    this.position.x -= this.scrollSpeed * AIRPLANE_SPEED_FACTOR * dt;

    this.flapTime += dt;
    if (this.flapTime >= FLAP_FRAME_DURATION) {
      this.flapTime %= FLAP_FRAME_DURATION;
      this.flapFrame = 1 - this.flapFrame;
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const { x, y } = this.interpolatedPosition(alpha);
    const px = Math.round(x);
    const py = Math.round(y);
    // Frame 0: ala arriba. Frame 1: ala abajo (aleteo).
    const wingY = this.flapFrame === 0 ? py + 1 : py + 4;
    const tailY = py + 9;
    const noseX = px;
    const noseY = py + 9;
    const backX = px + AIRPLANE_WIDTH;

    // Ala superior (triángulo grande con relleno).
    ctx.fillStyle = AirplaneColors.paper;
    ctx.strokeStyle = AirplaneColors.outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(backX, wingY);
    ctx.lineTo(backX - 4, tailY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Panza / ala inferior (triángulo sombreado).
    ctx.fillStyle = AirplaneColors.shade;
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(backX - 4, tailY);
    ctx.lineTo(backX - 2, py + AIRPLANE_HEIGHT - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Doblez central del papel.
    ctx.strokeStyle = AirplaneColors.fold;
    ctx.beginPath();
    ctx.moveTo(noseX + 2, noseY);
    ctx.lineTo(backX - 4, tailY);
    ctx.stroke();

    this.renderHitbox(ctx, x, y);
  }
}