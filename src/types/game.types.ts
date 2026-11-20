/** Vector 2D para posiciones, velocidades y aceleraciones. */
export interface Vector2 {
  x: number;
  y: number;
}

/** Rectángulo alineado a ejes (AABB) para hitboxes y sprites. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Estados posibles del juego. */
export const GameState = {
  Menu: 'MENU',
  Playing: 'PLAYING',
  Paused: 'PAUSED',
  GameOver: 'GAME_OVER',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];