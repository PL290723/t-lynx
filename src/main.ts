import './style.css';
import { Engine } from './core/Engine';
import { drawPrototypeScene } from './graphics/PrototypeScene';
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
  </header>
  <main class="game-viewport" aria-label="Área de juego">
    <canvas class="game-canvas" aria-label="Canvas de T-Lynx">
      Tu navegador no soporta canvas.
    </canvas>
  </main>
`;

const viewport = app.querySelector<HTMLElement>('.game-viewport');
const canvas = app.querySelector<HTMLCanvasElement>('.game-canvas');

if (!viewport || !canvas) {
  throw new Error('No se pudo crear el área de juego');
}

const engine = new Engine(canvas, viewport);

const render = (): void => {
  engine.clear();
  drawPrototypeScene(engine.getContext(), engine.width, engine.height);
};

engine.onResize(render);
render();