/** Puntos que se ganan por cada píxel recorrido por el mundo. */
const POINTS_PER_PIXEL = 0.1;

/** Cada cuántos puntos se emite un evento de hito (M-12 lo usará para el sonido). */
export const MILESTONE_INTERVAL = 100;

/** Clave del récord en localStorage. */
const HIGH_SCORE_KEY = 't-lynx:high-score';

type MilestoneListener = (milestone: number) => void;

/** Almacenamiento mínimo que necesita el marcador (compatible con localStorage). */
export interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Obtiene localStorage sin romper el juego: en algunos navegadores (modo
 * privado, cookies bloqueadas) solo leer window.localStorage lanza un error.
 */
function getBrowserStorage(): ScoreStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Calcula el puntaje por distancia recorrida, emite un evento cada 100 puntos
 * y guarda el récord (High Score) en localStorage.
 */
export class ScoreManager {
  private readonly storage: ScoreStorage | null;
  private readonly milestoneListeners = new Set<MilestoneListener>();
  private currentScore = 0;
  private savedHighScore: number;
  private lastMilestone = 0;
  private newRecord = false;

  constructor(storage: ScoreStorage | null = getBrowserStorage()) {
    this.storage = storage;
    this.savedHighScore = this.loadHighScore();
  }

  /** Puntaje de la partida actual. */
  get score(): number {
    return this.currentScore;
  }

  /** Récord: el guardado o el puntaje actual si ya lo superó. */
  get highScore(): number {
    return Math.max(this.savedHighScore, this.currentScore);
  }

  /** true si la partida que terminó (o la actual) superó el récord anterior. */
  get isNewRecord(): boolean {
    return this.newRecord;
  }

  /** Avisa cada vez que se cruza un múltiplo de 100 puntos. Devuelve una función para desuscribirse. */
  onMilestone(listener: MilestoneListener): () => void {
    this.milestoneListeners.add(listener);
    return () => this.milestoneListeners.delete(listener);
  }

  /** Actualiza el puntaje a partir de la distancia total recorrida (px). */
  update(distance: number): void {
    this.currentScore = Math.floor(distance * POINTS_PER_PIXEL);

    if (this.currentScore > this.savedHighScore && this.savedHighScore > 0) {
      this.newRecord = true;
    }

    const milestone = Math.floor(this.currentScore / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
    if (milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      for (const listener of this.milestoneListeners) {
        listener(milestone);
      }
    }
  }

  /** Cierra la partida: si se superó el récord, lo guarda. */
  finishRun(): void {
    if (this.currentScore > this.savedHighScore) {
      this.newRecord = this.savedHighScore > 0;
      this.savedHighScore = this.currentScore;
      this.saveHighScore();
    }
  }

  /** Reinicia el puntaje de la partida sin borrar el récord. */
  reset(): void {
    this.currentScore = 0;
    this.lastMilestone = 0;
    this.newRecord = false;
  }

  private loadHighScore(): number {
    try {
      const value = Number(this.storage?.getItem(HIGH_SCORE_KEY));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      this.storage?.setItem(HIGH_SCORE_KEY, String(this.savedHighScore));
    } catch {
      // Sin espacio o almacenamiento bloqueado: el récord vive solo en esta sesión.
    }
  }
}