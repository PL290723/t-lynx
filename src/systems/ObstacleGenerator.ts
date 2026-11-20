import { BOOK_VARIANTS, Books } from '../entities/Books';
import type { Entity } from '../entities/Entity';
import { PLAYER_MAX_JUMP_AIR_SECONDS, PLAYER_WIDTH } from '../entities/Player';

const INITIAL_SPEED = 150; // px/s
const MAX_SPEED = 360; // px/s
const ACCELERATION = 4; // px/s²
const SPAWN_MARGIN = 24; // px fuera del canvas lógico
const FIRST_SPAWN_DISTANCE = 48; // px recorridos al iniciar
const LANDING_BUFFER_SECONDS = 0.12;
const MIN_RANDOM_GAP = 40; // px adicionales
const MAX_RANDOM_GAP = 150;

interface ScrollingObstacle extends Entity {
  active: boolean;
  scrollSpeed: number;
}

function isAvailableBooks(obstacle: ScrollingObstacle): obstacle is Books {
  return !obstacle.active && obstacle instanceof Books;
}

export class ObstacleGenerator {
  private readonly spawnX: number;
  private readonly active: ScrollingObstacle[] = [];
  private readonly pool: ScrollingObstacle[] = [];
  private currentSpeed = INITIAL_SPEED;
  private traveledDistance = 0;
  private nextSpawnDistance = FIRST_SPAWN_DISTANCE;
  private hitboxesVisible = false;

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
      const obstacle = this.spawnBooks();
      this.nextSpawnDistance = this.traveledDistance + this.gapAfter(obstacle);
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
  }

  private spawnBooks(): Books {
    let books = this.pool.find(isAvailableBooks);
    if (!books) {
      books = new Books();
      this.pool.push(books);
    }

    const variant = BOOK_VARIANTS[Math.floor(Math.random() * BOOK_VARIANTS.length)];
    books.activate(this.spawnX, variant);
    books.showHitbox = this.hitboxesVisible;
    this.active.push(books);
    return books;
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