import './style.css';
import { GameState } from './types/game.types';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor #app');
}

const state: GameState = GameState.Menu;

app.innerHTML = `
  <h1>T-Lynx</h1>
  <p>Estado actual: ${state}</p>
`;