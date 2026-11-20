import './style.css';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { drawPrototypeScene } from './graphics/PrototypeScene';
import { InputAction, InputHandler } from './systems/InputHandler';
import { GameState } from './types/game.types';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor #app');
}

const state: GameState = GameState.Menu;

app.innerHTML = `
  <header class="game-header">
    <h1>T-Lynx</h1>
    <p>Estado actual: ${state}</p>
    <p class="loop-debug">FPS: — · Updates/s: —</p>
    <pre class="input-debug" aria-live="polite"></pre>
  </header>
  <main class="game-viewport" aria-label="Área de juego">
    <canvas class="game-canvas" aria-label="Canvas de T-Lynx">
      Tu navegador no soporta canvas.
    </canvas>
  </main>
`;

const viewport = app.querySelector<HTMLElement>('.game-viewport');
const canvas = app.querySelector<HTMLCanvasElement>('.game-canvas');
const loopDebug = app.querySelector<HTMLParagraphElement>('.loop-debug');
const inputDebug = app.querySelector<HTMLPreElement>('.input-debug');

if (!viewport || !canvas || !loopDebug || !inputDebug) {
  throw new Error('No se pudo crear el área de juego');
}

const engine = new Engine(canvas, viewport);
const input = new InputHandler(window, viewport);

const rectangle = {
  width: 24,
  height: 24,
  y: 108,
  speed: 120,
  color: '#6d28d9',
} as const;
const trackLength = engine.width + rectangle.width;
let previousDistance = 0;
let distance = 0;

const counters: Record<InputAction, { justPressed: number; released: number }> = {
  [InputAction.Jump]: { justPressed: 0, released: 0 },
  [InputAction.Duck]: { justPressed: 0, released: 0 },
};

const update = (dt: number): void => {
  previousDistance = distance;
  distance = (distance + rectangle.speed * dt) % trackLength;

  const lines: string[] = [];

  for (const action of Object.values(InputAction)) {
    if (input.justPressed(action)) {
      counters[action].justPressed++;
    }

    if (input.released(action)) {
      counters[action].released++;
    }

    lines.push(
      `${action.padEnd(4)}  isPressed: ${input.isPressed(action) ? 'SÍ' : 'no'}` +
        `  justPressed: ${counters[action].justPressed}` +
        `  released: ${counters[action].released}`,
    );
  }

  const inputText = lines.join('\n');
  if (inputDebug.textContent !== inputText) {
    inputDebug.textContent = inputText;
  }

  input.update();
};

const render = (alpha: number): void => {
  const ctx = engine.getContext();
  engine.clear();
  drawPrototypeScene(ctx, engine.width, engine.height);

  // Al dar la vuelta, interpola hacia delante y aplica el módulo al final.
  const nextDistance = distance < previousDistance ? distance + trackLength : distance;
  const interpolatedDistance = previousDistance + (nextDistance - previousDistance) * alpha;
  const x = (interpolatedDistance % trackLength) - rectangle.width;
  ctx.fillStyle = rectangle.color;
  ctx.fillRect(x, rectangle.y, rectangle.width, rectangle.height);

  const loopText = `FPS: ${loop.fps || '—'} · Updates/s: ${loop.ups || '—'}`;
  if (loopDebug.textContent !== loopText) {
    loopDebug.textContent = loopText;
  }
};

const loop = new GameLoop(update, render);
loop.start();