import {
  AIRPLANE_LANES,
  AIRPLANE_SPEED_FACTOR,
  Airplane,
} from '../entities/Airplane';
import { BOOK_VARIANTS, Books } from '../entities/Books';
import type { Entity } from '../entities/Entity';
import { PLAYER_MAX_JUMP_AIR_SECONDS, PLAYER_WIDTH, PLAYER_X } from '../entities/Player';
import { ShieldPowerUp } from '../entities/ShieldPowerUp';
import { GROUND_Y } from '../graphics/PrototypeScene';

const INITIAL_SPEED = 150; // px/s
const MAX_SPEED = 360; // px/s
const ACCELERATION = 4; // px/s²
const SPAWN_MARGIN = 24; // px fuera del canvas lógico
const FIRST_SPAWN_DISTANCE = 48; // px recorridos al iniciar
const LANDING_BUFFER_SECONDS = 0.12;
const MIN_RANDOM_GAP = 40; // px adicionales
const MAX_RANDOM_GAP = 150;

export const SHIELD_DEBUG_MIN_SCORE = 300;
const SHIELD_SPAWN_CHANCE = 0.25;
const SHIELD_SPAWN_Y = GROUND_Y - 56;
const PREWARMED_OBSTACLES_PER_KIND = 4;

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
  private readonly shieldPowerUp = new ShieldPowerUp();
  private shieldSpawned = false;

  constructor(canvasWidth: number) {
    this.spawnX = canvasWidth + SPAWN_MARGIN;
    for (let index = 0; index < PREWARMED_OBSTACLES_PER_KIND; index += 1) {
      this.pool.push(new Books(), new Airplane());
    }
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

  get activeShieldPowerUp(): ShieldPowerUp | null {
    return this.shieldPowerUp.active ? this.shieldPowerUp : null;
  }

  get shieldSpawnedThisSession(): boolean {
    return this.shieldSpawned;
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
    this.shieldPowerUp.showHitbox = visible;
  }

  update(dt: number, currentScore: number): void {
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

    if (this.shieldPowerUp.active) {
      this.shieldPowerUp.scrollSpeed = this.currentSpeed;
      this.shieldPowerUp.update(dt);

      if (this.shieldPowerUp.position.x + this.shieldPowerUp.width < 0) {
        this.shieldPowerUp.deactivate();
      }
    }

    if (this.traveledDistance >= this.nextSpawnDistance) {
      const spawnedEntity = this.shouldSpawnShield(currentScore)
        ? this.spawnShieldPowerUp()
        : this.nextKind === ObstacleKind.Airplane
          ? this.spawnAirplane()
          : this.spawnBooks();

      this.nextKind =
        Math.random() < this.airplaneChance
          ? ObstacleKind.Airplane
          : ObstacleKind.Books;

      this.nextSpawnDistance =
        this.traveledDistance +
        this.gapAfter(spawnedEntity) +
        this.catchUpGap(this.nextKind);
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const obstacle of this.active) {
      obstacle.render(ctx, alpha);
    }

    this.shieldPowerUp.render(ctx, alpha);
  }

  removeShieldPowerUp(): void {
    this.shieldPowerUp.deactivate();
  }

  deactivateObstacle(obstacle: Entity): boolean {
    const index = this.active.findIndex((candidate) => candidate === obstacle);
    if (index < 0) {
      return false;
    }

    const removed = this.active[index];
    removed.active = false;
    this.active.splice(index, 1);
    return true;
  }

  reset(): void {
    for (const obstacle of this.active) {
      obstacle.active = false;
    }

    this.active.length = 0;
    this.shieldPowerUp.deactivate();
    this.shieldSpawned = false;
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

  private shouldSpawnShield(currentScore: number): boolean {
    return (
      !this.shieldSpawned &&
      currentScore >= SHIELD_DEBUG_MIN_SCORE &&
      Math.random() < SHIELD_SPAWN_CHANCE
    );
  }

  private spawnShieldPowerUp(): ShieldPowerUp {
    this.shieldPowerUp.activate(this.spawnX, SHIELD_SPAWN_Y);
    this.shieldPowerUp.scrollSpeed = this.currentSpeed;
    this.shieldPowerUp.showHitbox = this.hitboxesVisible;
    this.shieldSpawned = true;
    return this.shieldPowerUp;
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
    const randomGap =
      MIN_RANDOM_GAP + Math.random() * (MAX_RANDOM_GAP - MIN_RANDOM_GAP);
    return minGap + randomGap;
  }
}