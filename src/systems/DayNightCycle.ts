import {
  ColorPalette,
  type DayNightPhase,
  type PaletteColors,
} from '../graphics/ColorPalette';

const POINTS_PER_PHASE = 700;
const TRANSITION_POINTS = 100;
const TRANSITION_STEPS = 32;

const PHASES = ['day', 'sunset', 'night'] as const satisfies readonly DayNightPhase[];
const COLOR_KEYS = [
  'skyTop',
  'skyBottom',
  'clouds',
  'distantBuildings',
  'nearbyBuildings',
  'windows',
  'ground',
  'groundLine',
  'hudText',
] as const satisfies readonly (keyof PaletteColors)[];

type TransitionTable = readonly PaletteColors[];

function hexToRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function interpolateHex(from: string, to: string, amount: number): string {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  const red = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * amount);
  const green = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * amount);
  const blue = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * amount);

  return `#${red.toString(16).padStart(2, '0')}${green
    .toString(16)
    .padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function createTransition(
  from: PaletteColors,
  to: PaletteColors,
): TransitionTable {
  const steps: PaletteColors[] = [];

  for (let step = 0; step <= TRANSITION_STEPS; step++) {
    const linearProgress = step / TRANSITION_STEPS;
    const easedProgress =
      linearProgress * linearProgress * (3 - 2 * linearProgress);
    const colors = {} as Record<keyof PaletteColors, string>;

    for (const key of COLOR_KEYS) {
      colors[key] = interpolateHex(from[key], to[key], easedProgress);
    }

    steps.push(colors);
  }

  return steps;
}

const TRANSITIONS: readonly TransitionTable[] = PHASES.map(
  (phase, index) => {
    const nextPhase = PHASES[(index + 1) % PHASES.length];
    return createTransition(ColorPalette[phase], ColorPalette[nextPhase]);
  },
);

function wrapPhase(index: number): number {
  return ((index % PHASES.length) + PHASES.length) % PHASES.length;
}

export class DayNightCycle {
  private currentScore = 0;
  private debugPhaseOffset = 0;
  private currentPhase: DayNightPhase = 'day';
  private currentProgress = 0;
  private palette: PaletteColors = ColorPalette.day;

  get currentPalette(): PaletteColors {
    return this.palette;
  }

  get phase(): DayNightPhase {
    return this.currentPhase;
  }

  get transitionProgress(): number {
    return this.currentProgress;
  }

  update(score: number): void {
    this.currentScore = Math.max(0, score);
    this.refresh();
  }

  reset(): void {
    this.currentScore = 0;
    this.debugPhaseOffset = 0;
    this.currentPhase = 'day';
    this.currentProgress = 0;
    this.palette = ColorPalette.day;
  }

  /** Avance una fase para la tecla temporal de depuración. */
  advancePhaseForDebug(): void {
    this.debugPhaseOffset++;
    this.refresh();
  }

  private refresh(): void {
    const phaseIndex = wrapPhase(
      Math.floor(this.currentScore / POINTS_PER_PHASE) +
        this.debugPhaseOffset,
    );
    const scoreInPhase = this.currentScore % POINTS_PER_PHASE;

    this.currentPhase = PHASES[phaseIndex];
    this.currentProgress = 0;
    this.palette = ColorPalette[this.currentPhase];

    if (scoreInPhase < POINTS_PER_PHASE - TRANSITION_POINTS) {
      return;
    }

    const linearProgress =
      (scoreInPhase - (POINTS_PER_PHASE - TRANSITION_POINTS)) /
      TRANSITION_POINTS;
    const easedProgress =
      linearProgress * linearProgress * (3 - 2 * linearProgress);
    const step = Math.round(easedProgress * TRANSITION_STEPS);

    this.currentProgress = step / TRANSITION_STEPS;
    this.palette = TRANSITIONS[phaseIndex][step];
  }
}
