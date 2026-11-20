import './style.css';
import { Engine } from './core/Engine';
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
const inputDebug = app.querySelector<HTMLPreElement>('.input-debug');

if (!viewport || !canvas || !inputDebug) {
  throw new Error('No se pudo crear el área de juego');
}

const engine = new Engine(canvas, viewport);
const input = new InputHandler(window, viewport);

const render = (): void => {
  engine.clear();
  drawPrototypeScene(engine.getContext(), engine.width, engine.height);
};

engine.onResize(render);
render();

// --- Depuración de entradas (temporal: se reemplaza cuando exista el GameLoop de M-03) ---
const counters: Record<InputAction, { justPressed: number; released: number }> = {
  [InputAction.Jump]: { justPressed: 0, released: 0 },
  [InputAction.Duck]: { justPressed: 0, released: 0 },
};

const debugLoop = (): void => {
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

  inputDebug.textContent = lines.join('\n');
  input.update();
  requestAnimationFrame(debugLoop);
};

requestAnimationFrame(debugLoop);