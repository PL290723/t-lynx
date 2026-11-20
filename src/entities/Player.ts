import { Entity } from './Entity';
import { GROUND_Y } from '../graphics/PrototypeScene';
import {
  SpriteAnimation,
  SpriteSheet,
} from '../graphics/SpriteSheet';
import type { InputHandler } from '../systems/InputHandler';
import { InputAction } from '../systems/InputHandler';

const PLAYER_X = 64;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const CROUCH_HEIGHT = 20;

const GRAVITY = 1800;
const JUMP_IMPULSE = 650;
const JUMP_HOLD_FORCE = 1000;
const JUMP_MAX_HOLD_SECONDS = 0.22;
const JUMP_MAX_HEIGHT = 170;
const JUMP_RELEASE_MULTIPLIER = 0.45;
const FAST_FALL_MULTIPLIER = 2.5;

const RUN_FRAME_DURATION = 0.12;
const DUCK_FRAME_DURATION = 0.2;

export const PlayerState = SpriteAnimation;
export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

export class Player extends Entity {
  private readonly input: InputHandler;
  private readonly spriteSheet = new SpriteSheet();
  private velocityY = 0;
  private grounded = true;
  private jumpHoldTime = 0;
  private jumpStartY = 0;
  private animationTime = 0;
  private animationFrame = 0;
  private currentState: PlayerState = PlayerState.Running;

  constructor(input: InputHandler) {
    super(PLAYER_X, GROUND_Y - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);
    this.input = input;
  }

  get state(): PlayerState {
    return this.currentState;
  }

  get verticalVelocity(): number {
    return this.velocityY;
  }

  override get hitbox() {
    const hitbox = super.hitbox;

    if (this.currentState === PlayerState.Ducking) {
      hitbox.height = (PLAYER_HEIGHT - 6) / 2;
    }

    return hitbox;
  }

  update(dt: number): void {
    this.savePreviousPosition();

    if (this.currentState === PlayerState.Defeated) {
      return;
    }

    if (this.grounded) {
      if (this.input.justPressed(InputAction.Jump)) {
        this.startJump();
      } else {
        this.setCrouching(this.input.isPressed(InputAction.Duck));
      }
    } else {
      this.updateAirborne(dt);
    }

    this.updateAnimation(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const position = this.interpolatedPosition(alpha);
    const frame = this.spriteSheet.getFrame(
      this.currentState,
      this.animationFrame,
    );

    ctx.drawImage(frame, position.x, position.y, this.width, this.height);
    this.renderHitbox(ctx, position.x, position.y);
  }

  defeat(): void {
    this.currentState = PlayerState.Defeated;
    this.velocityY = 0;
    this.grounded = false;
    this.animationFrame = 0;
    this.animationTime = 0;
  }

  reset(): void {
    this.position.x = PLAYER_X;
    this.position.y = GROUND_Y - PLAYER_HEIGHT;
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
    this.velocityY = 0;
    this.grounded = true;
    this.jumpHoldTime = 0;
    this.jumpStartY = this.position.y;
    this.animationTime = 0;
    this.animationFrame = 0;
    this.currentState = PlayerState.Running;
  }

  private startJump(): void {
    this.setCrouching(false);
    this.grounded = false;
    this.velocityY = -JUMP_IMPULSE;
    this.jumpHoldTime = 0;
    this.jumpStartY = this.position.y;

    if (this.input.released(InputAction.Jump)) {
      this.velocityY *= JUMP_RELEASE_MULTIPLIER;
      this.jumpHoldTime = JUMP_MAX_HOLD_SECONDS;
    }
  }

  private updateAirborne(dt: number): void {
    if (
      this.input.released(InputAction.Jump) &&
      this.velocityY < 0
    ) {
      this.velocityY *= JUMP_RELEASE_MULTIPLIER;
      this.jumpHoldTime = JUMP_MAX_HOLD_SECONDS;
    }

    if (
      this.input.isPressed(InputAction.Jump) &&
      this.jumpHoldTime < JUMP_MAX_HOLD_SECONDS &&
      this.jumpStartY - this.position.y < JUMP_MAX_HEIGHT
    ) {
      this.velocityY -= JUMP_HOLD_FORCE * dt;
      this.jumpHoldTime = Math.min(
        JUMP_MAX_HOLD_SECONDS,
        this.jumpHoldTime + dt,
      );
    }

    const fastFalling = this.input.isPressed(InputAction.Duck);
    const gravityMultiplier = fastFalling ? FAST_FALL_MULTIPLIER : 1;
    this.velocityY += GRAVITY * gravityMultiplier * dt;

    const nextY = this.position.y + this.velocityY * dt;
    if (this.velocityY < 0 && this.jumpStartY - nextY >= JUMP_MAX_HEIGHT) {
      this.position.y = this.jumpStartY - JUMP_MAX_HEIGHT;
      this.velocityY = 0;
      this.jumpHoldTime = JUMP_MAX_HOLD_SECONDS;
    } else {
      this.position.y = nextY;
    }

    if (this.position.y + this.height >= GROUND_Y) {
      this.grounded = true;
      this.velocityY = 0;
      this.setCrouching(this.input.isPressed(InputAction.Duck));
    }
  }

  private setCrouching(crouching: boolean): void {
    const nextHeight = crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    const heightChanged = this.height !== nextHeight;
    this.height = nextHeight;
    this.position.y = GROUND_Y - this.height;

    if (heightChanged) {
      this.previousPosition.y = this.position.y;
    }
  }

  private updateAnimation(dt: number): void {
    const nextState = this.grounded
      ? this.input.isPressed(InputAction.Duck)
        ? PlayerState.Ducking
        : PlayerState.Running
      : PlayerState.Jumping;

    if (nextState !== this.currentState) {
      this.currentState = nextState;
      this.animationTime = 0;
      this.animationFrame = 0;
      return;
    }

    this.animationTime += dt;
    const frameDuration =
      this.currentState === PlayerState.Running
        ? RUN_FRAME_DURATION
        : this.currentState === PlayerState.Ducking
          ? DUCK_FRAME_DURATION
          : 0;

    if (frameDuration > 0 && this.animationTime >= frameDuration) {
      const frameCount =
        this.currentState === PlayerState.Running ? 4 : 2;
      const framesToAdvance = Math.floor(this.animationTime / frameDuration);
      this.animationFrame = (this.animationFrame + framesToAdvance) % frameCount;
      this.animationTime %= frameDuration;
    }
  }
}
