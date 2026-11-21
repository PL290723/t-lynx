import {
  AIRPLANE_LANES,
  AIRPLANE_SPEED_FACTOR,
  Airplane,
} from '../entities/Airplane';
import { BOOK_VARIANTS, Books } from '../entities/Books';
import type { Entity } from '../entities/Entity';
import { PLAYER_MAX_JUMP_AIR_SECONDS, PLAYER_WIDTH, PLAYER_X } from '../entities/Player';

const INITIAL_SPEED = 150; // px/s
const MAX_SPEED = 360; // px/s
const ACCELERATION = 4; // px/s²
const SPAWN_MARGIN = 24; // px fuera del canvas lógico
const FIRST_SPAWN_DISTANCE = 48; // px recorridos al iniciar
const LANDING_BUFFER_SECONDS = 0.12;
const MIN_RANDOM_GAP = 40; // px adicionales
const MAX_RANDOM_GAP = 150;

// Aviones: aparecen después de cierta distancia y su probabilidad sube con ella.
// (La distancia es la base del puntaje; M-13 la convertirá en puntos.)
const AIRPLANE_START_DISTANCE = 1500; // px recorridos antes del primer avión
const AIRPLANE_MIN_CHANCE = 0.15; // probabilidad al empezar a aparecer
const AIRPLANE_MAX_CHANCE = 0.45; // probabilidad máxima
const AIRPLANE_FULL_CHANCE_DISTANCE = 15000; // px para llegar al máximo

const ObstacleKind = {
  Books: 'BOOKS',
  Airplane: 'AIRPLANE',
} as const;

type ObstacleKind = (typeof ObstacleKind)[keyof typeof ObstacleKind];

interface ScrollingObstacle extends Entity {
  active: boolean;
  scrollSpeed: number;
}

function isAvailableBooks(obstacle: ScrollingObstacle): obstacle is Books {
  return !obstacle.active && obstacle instanceof Books;
}

function isAvailableAirplane(obstacle: ScrollingObstacle): obstacle is Airplane {
  return !obstacle.active && obstacle instanceof Airplane;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export class ObstacleGenerator {
  private readonly spawnX: number;
  private readonly active: ScrollingObstacle[] = [];
  private readonly pool: ScrollingObstacle[] = [];
  private currentSpeed = INITIAL_SPEED;
  private traveledDistance = 0;
  private nextSpawnDistance = FIRST_SPAWN_DISTANCE;
  private hitboxesVisible = false;
  private nextKind: ObstacleKind = ObstacleKind.Books;

  constructor(canvasWidth: number) {
    this.spawnX = canvasWidth + SPAWN_MARGIN;
  }

  get speed(): number {
    return this.currentSpeed;
  }

  get distance(): number {
    return this.traveledDistance;
  }

  get activeObstacles(): readonly Entity[] {
    return this.active;
  }

  get poolSize(): number {
    return this.pool.length;
  }

  /** Probabilidad actual de que el siguiente obstáculo sea un avión (0 a 1). */
  get airplaneChance(): number {
    if (this.traveledDistance < AIRPLANE_START_DISTANCE) {
      return 0;
    }

    const progress = Math.min(
      1,
      (this.traveledDistance - AIRPLANE_START_DISTANCE) /
        (AIRPLANE_FULL_CHANCE_DISTANCE - AIRPLANE_START_DISTANCE),
    );
    return AIRPLANE_MIN_CHANCE + (AIRPLANE_MAX_CHANCE - AIRPLANE_MIN_CHANCE) * progress;
  }

  get activeAirplanes(): number {
    let count = 0;
    for (const obstacle of this.active) {
      if (obstacle instanceof Airplane) {
        count++;
      }
    }
    return count;
  }

  set showHitboxes(visible: boolean) {
    this.hitboxesVisible = visible;
    for (const obstacle of this.active) {
      obstacle.showHitbox = visible;
    }
  }

  update(dt: number): void {
    this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + ACCELERATION * dt);
    this.traveledDistance += this.currentSpeed * dt;

    let activeCount = 0;
    for (const obstacle of this.active) {
      obstacle.scrollSpeed = this.currentSpeed;
      obstacle.update(dt);

      if (obstacle.position.x + obstacle.width < 0) {
        obstacle.active = false;
      } else {
        this.active[activeCount] = obstacle;
        activeCount++;
      }
    }
    this.active.length = activeCount;

    if (this.traveledDistance >= this.nextSpawnDistance) {
      const obstacle =
        this.nextKind === ObstacleKind.Airplane ? this.spawnAirplane() : this.spawnBooks();
      this.nextKind = Math.random() < this.airplaneChance ? ObstacleKind.Airplane : ObstacleKind.Books;
      this.nextSpawnDistance =
        this.traveledDistance + this.gapAfter(obstacle) + this.catchUpGap(this.nextKind);
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const obstacle of this.active) {
      obstacle.render(ctx, alpha);
    }
  }

  reset(): void {
    for (const obstacle of this.active) {
      obstacle.active = false;
    }
    this.active.length = 0;
    this.currentSpeed = INITIAL_SPEED;
    this.traveledDistance = 0;
    this.nextSpawnDistance = FIRST_SPAWN_DISTANCE;
    this.nextKind = ObstacleKind.Books;
  }

  private spawnBooks(): Books {
    let books = this.pool.find(isAvailableBooks);
    if (!books) {
      books = new Books();
      this.pool.push(books);
    }

    const variant = randomItem(BOOK_VARIANTS);
    books.activate(this.spawnX, variant);
    books.showHitbox = this.hitboxesVisible;
    this.active.push(books);
    return books;
  }

  private spawnAirplane(): Airplane {
    let airplane = this.pool.find(isAvailableAirplane);
    if (!airplane) {
      airplane = new Airplane();
      this.pool.push(airplane);
    }

    airplane.activate(this.spawnX, randomItem(AIRPLANE_LANES));
    airplane.showHitbox = this.hitboxesVisible;
    this.active.push(airplane);
    return airplane;
  }

  /**
   * Un avión es más rápido que el suelo, así que alcanza al obstáculo anterior
   * mientras cruza la pantalla. Se agrega la distancia que recorta en ese trayecto
   * para que llegue al lince con la misma separación que un libro.
   */
  private catchUpGap(kind: ObstacleKind): number {
    if (kind !== ObstacleKind.Airplane) {
      return 0;
    }

    const distanceToPlayer = this.spawnX - PLAYER_X;
    return distanceToPlayer * (1 - 1 / AIRPLANE_SPEED_FACTOR);
  }

  private gapAfter(obstacle: Entity): number {
    const clearanceTime = PLAYER_MAX_JUMP_AIR_SECONDS + LANDING_BUFFER_SECONDS;
    // Acota cuánto puede acelerar el mundo hasta que la pila pasa al lince,
    // más el tiempo reservado para un salto y su aterrizaje.
    const timeToPass = (this.spawnX + obstacle.width) / this.currentSpeed;
    const clearanceSpeed = Math.min(
      MAX_SPEED,
      this.currentSpeed + ACCELERATION * (timeToPass + clearanceTime),
    );
    const minGap = obstacle.width + PLAYER_WIDTH + clearanceSpeed * clearanceTime;
    const randomGap = MIN_RANDOM_GAP + Math.random() * (MAX_RANDOM_GAP - MIN_RANDOM_GAP);
    return minGap + randomGap;
  }
}