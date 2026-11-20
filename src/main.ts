import './style.css';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { Player } from './entities/Player';
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
    <p class="player-debug" aria-live="polite"></p>
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
const playerDebug = app.querySelector<HTMLParagraphElement>('.player-debug');
const inputDebug = app.querySelector<HTMLPreElement>('.input-debug');

if (!viewport || !canvas || !loopDebug || !playerDebug || !inputDebug) {
  throw new Error('No se pudo crear el área de juego');
}

const engine = new Engine(canvas, viewport);
const input = new InputHandler(window, viewport);
const player = new Player(input);

const counters: Record<InputAction, { justPressed: number; released: number }> = {
  [InputAction.Jump]: { justPressed: 0, released: 0 },
  [InputAction.Duck]: { justPressed: 0, released: 0 },
};

const update = (dt: number): void => {
  player.update(dt);

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

  const playerText =
    `Jugador: ${player.state} · Velocidad Y: ${player.verticalVelocity.toFixed(1)} px/s` +
    ` · Altura: ${player.height} px`;
  if (playerDebug.textContent !== playerText) {
    playerDebug.textContent = playerText;
  }

  input.update();
};

const render = (alpha: number): void => {
  const ctx = engine.getContext();
  engine.clear();
  drawPrototypeScene(ctx, engine.width, engine.height);
  player.render(ctx, alpha);

  const loopText = `FPS: ${loop.fps || '—'} · Updates/s: ${loop.ups || '—'}`;
  if (loopDebug.textContent !== loopText) {
    loopDebug.textContent = loopText;
  }
};

const loop = new GameLoop(update, render);

// TEMPORAL: K derrota, R reinicia y H muestra la hitbox; M-08 reemplazará K/R.
window.addEventListener('keydown', (event) => {
  if (event.repeat) {
    return;
  }

  if (event.code === 'KeyK') {
    player.defeat();
  } else if (event.code === 'KeyR') {
    player.reset();
  } else if (event.code === 'KeyH') {
    player.showHitbox = !player.showHitbox;
  }
});

loop.start();