import { GameState } from '../types/game.types';
import type { GameState as GameStateType } from '../types/game.types';

type StateChangeListener = (nextState: GameStateType, previousState: GameStateType) => void;

const VALID_TRANSITIONS: Readonly<Record<GameStateType, readonly GameStateType[]>> = {
  [GameState.Menu]: [GameState.Playing],
  [GameState.Playing]: [GameState.GameOver],
  [GameState.Paused]: [],
  [GameState.GameOver]: [GameState.Playing],
};

export class StateManager {
  private currentState: GameStateType = GameState.Menu;
  private readonly listeners = new Set<StateChangeListener>();

  get state(): GameStateType {
    return this.currentState;
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transition(nextState: GameStateType): void {
    if (!VALID_TRANSITIONS[this.currentState].includes(nextState)) {
      throw new Error(`Transición de estado no válida: ${this.currentState} -> ${nextState}`);
    }

    const previousState = this.currentState;
    this.currentState = nextState;
    for (const listener of this.listeners) {
      listener(nextState, previousState);
    }
  }
}
