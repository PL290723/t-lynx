import { InputAction, type InputActivation } from './InputHandler';

const WINDOW_SIZE = 20;

export const EMPTY_LATENCY_TEXT =
  `Latencia · Última: — · Promedio: — · Máxima: — (0/${WINDOW_SIZE})`;

function elapsedSince(timeStamp: number, now: number): number | undefined {
  // Convierte los timestamps Unix de navegadores antiguos al reloj monotónico.
  const start = timeStamp > now ? timeStamp - performance.timeOrigin : timeStamp;
  return start >= 0 && start <= now ? now - start : undefined;
}

export class InputLatencyMeter {
  private readonly samples = new Float64Array(WINDOW_SIZE);
  private cursor = 0;
  private count = 0;
  private last = 0;
  private lastSwipeFromTouchStart: number | undefined;
  private pendingJump: InputActivation | undefined;
  private pendingDuck: InputActivation | undefined;

  queue(action: InputAction, activation: InputActivation | undefined): void {
    if (!activation) {
      return;
    }

    if (action === InputAction.Jump) {
      this.pendingJump = activation;
    } else {
      this.pendingDuck = activation;
    }
  }

  finishFrame(playing: boolean): string | undefined {
    const jump = this.pendingJump;
    const duck = this.pendingDuck;
    this.pendingJump = undefined;
    this.pendingDuck = undefined;

    if (!playing || (!jump && !duck)) {
      return;
    }

    const now = performance.now();
    const jumpRecorded = this.record(jump, now);
    const duckRecorded = this.record(duck, now);
    if (!jumpRecorded && !duckRecorded) {
      return;
    }

    let sum = 0;
    let max = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.samples[i];
      max = Math.max(max, this.samples[i]);
    }

    const summary = `Latencia · Última: ${this.last.toFixed(1)} ms` +
      ` · Promedio: ${(sum / this.count).toFixed(1)} ms` +
      ` · Máxima: ${max.toFixed(1)} ms (${this.count}/${WINDOW_SIZE})`;
    return this.lastSwipeFromTouchStart === undefined
      ? summary
      : `${summary} · Último deslizamiento desde el toque: ${this.lastSwipeFromTouchStart.toFixed(1)} ms`;
  }

  private record(activation: InputActivation | undefined, now: number): boolean {
    if (!activation) {
      return false;
    }
    const latency = elapsedSince(activation.timeStamp, now);
    if (latency === undefined) {
      return false;
    }

    this.samples[this.cursor] = latency;
    this.cursor = (this.cursor + 1) % WINDOW_SIZE;
    this.count = Math.min(this.count + 1, WINDOW_SIZE);
    this.last = latency;
    if (activation.touchStartTimeStamp !== undefined) {
      this.lastSwipeFromTouchStart = elapsedSince(activation.touchStartTimeStamp, now);
    }
    return true;
  }
}