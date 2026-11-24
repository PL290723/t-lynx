import { Entity } from './Entity';
import { GROUND_Y } from '../graphics/PrototypeScene';
import type { Rect } from '../types/game.types';
import {
  SpriteAnimation,
  SpriteSheet,
} from '../graphics/SpriteSheet';
import type { InputHandler } from '../systems/InputHandler';
import { InputAction } from '../systems/InputHandler';

export const PLAYER_X = 64;
export const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const CROUCH_HEIGHT = 20;

const GRAVITY = 1800;
const JUMP_IMPULSE = 650;
const JUMP_HOLD_FORCE = 1000;
const JUMP_MAX_HOLD_SECONDS = 0.22;
const JUMP_MAX_HEIGHT = 170;
const JUMP_RELEASE_MULTIPLIER = 0.45;
const FAST_FALL_MULTIPLIER = 2.5;

// Cota del vuelo al contar el empuje sostenido como parte del impulso inicial.
export const PLAYER_MAX_JUMP_AIR_SECONDS =
  (2 * (JUMP_IMPULSE + JUMP_HOLD_FORCE * JUMP_MAX_HOLD_SECONDS)) / GRAVITY;

const RUN_FRAME_DURATION = 0.12;
const DUCK_FRAME_DURATION = 0.2;
const SHIELD_INVULNERABILITY_SECONDS = 0.5;
const INVULNERABILITY_BLINK_SECONDS = 0.06;
const SHIELD_AURA_SIZE = 40;
const TIME_EPSILON_SECONDS = 1e-6;

export const PlayerState = SpriteAnimation;
export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

type JumpListener = () => void;

export class Player extends Entity {
  private readonly input: InputHandler;
  private readonly onJump: JumpListener | null;
  private readonly spriteSheet = new SpriteSheet();
  private velocityY = 0;
  private grounded = true;
  private jumpHoldTime = 0;
  private jumpStartY = 0;
  private animationTime = 0;
  private animationFrame = 0;
  private currentState: PlayerState = PlayerState.Running;
  private shieldActive = false;
  private invulnerabilityRemainingSeconds = 0;
  private shieldAuraTime = 0;

  constructor(input: InputHandler, onJump: JumpListener | null = null) {
    super(
      PLAYER_X,
      GROUND_Y - PLAYER_HEIGHT,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      3,
      2,
    );
    this.input = input;
    this.onJump = onJump;
  }

  get state(): PlayerState {
    return this.currentState;
  }

  get verticalVelocity(): number {
    return this.velocityY;
  }

  get hasShield(): boolean {
    return this.shieldActive;
  }

  get isInvulnerable(): boolean {
    return this.invulnerabilityRemainingSeconds > 0;
  }

  get invulnerabilityRemaining(): number {
    return this.invulnerabilityRemainingSeconds;
  }

  override get hitbox(): Rect {
    const hitbox = super.hitbox;

    if (this.currentState === PlayerState.Ducking) {
      hitbox.height = (PLAYER_HEIGHT - 4) / 2;
      hitbox.y =
        this.position.y +
        this.height -
        this.verticalHitboxInset -
        hitbox.height;
    }

    return hitbox;
  }

  update(dt: number): void {
    this.savePreviousPosition();

    const remainingInvulnerability =
      this.invulnerabilityRemainingSeconds - dt;

    this.invulnerabilityRemainingSeconds =
      remainingInvulnerability > TIME_EPSILON_SECONDS
        ? remainingInvulnerability
        : 0;

    if (this.shieldActive) {
      this.shieldAuraTime += dt;
    }

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

    if (this.shieldActive) {
      this.renderShieldAura(ctx, position.x, position.y);
    }

    if (this.shouldRenderSprite()) {
      ctx.drawImage(
        frame,
        position.x,
        position.y,
        this.width,
        this.height,
      );
    }

    this.renderHitbox(ctx, position.x, position.y);
  }

  collectShield(): void {
    this.shieldActive = true;
    this.shieldAuraTime = 0;
  }

  consumeShield(): boolean {
    if (!this.shieldActive) {
      return false;
    }

    this.shieldActive = false;
    this.invulnerabilityRemainingSeconds =
      SHIELD_INVULNERABILITY_SECONDS;

    return true;
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
    this.shieldActive = false;
    this.invulnerabilityRemainingSeconds = 0;
    this.shieldAuraTime = 0;
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

    this.onJump?.();
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
    const gravityMultiplier = fastFalling
      ? FAST_FALL_MULTIPLIER
      : 1;

    this.velocityY += GRAVITY * gravityMultiplier * dt;

    const nextY = this.position.y + this.velocityY * dt;

    if (
      this.velocityY < 0 &&
      this.jumpStartY - nextY >= JUMP_MAX_HEIGHT
    ) {
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
    const nextHeight = crouching
      ? CROUCH_HEIGHT
      : PLAYER_HEIGHT;

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

    if (
      frameDuration > 0 &&
      this.animationTime >= frameDuration
    ) {
      const frameCount =
        this.currentState === PlayerState.Running ? 4 : 2;

      const framesToAdvance = Math.floor(
        this.animationTime / frameDuration,
      );

      this.animationFrame =
        (this.animationFrame + framesToAdvance) % frameCount;

      this.animationTime %= frameDuration;
    }
  }

  private shouldRenderSprite(): boolean {
    if (!this.isInvulnerable) {
      return true;
    }

    const elapsed =
      SHIELD_INVULNERABILITY_SECONDS -
      this.invulnerabilityRemainingSeconds;

    return (
      Math.floor(elapsed / INVULNERABILITY_BLINK_SECONDS) % 2 === 0
    );
  }

  private renderShieldAura(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const pulse = (Math.sin(this.shieldAuraTime * 8) + 1) / 2;
    const radius = SHIELD_AURA_SIZE / 2;

    ctx.save();
    ctx.fillStyle = '#5de8ff';
    ctx.globalAlpha = 0.14 + pulse * 0.1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d8fbff';
    ctx.globalAlpha = 0.65 + pulse * 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius - 3 + pulse,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
}