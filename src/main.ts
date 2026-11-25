import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { audioContextManager } from './audio/AudioContextManager';
import { sounds } from './audio/SoundEffects';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { StateManager } from './core/StateManager';
import { Player } from './entities/Player';
import { ParticleSystem } from './graphics/ParticleSystem';
import { ParallaxBackground } from './graphics/ParallaxBackground';
import { GROUND_Y } from './graphics/PrototypeScene';
import {
  CollisionSystem,
  intersects,
} from './systems/CollisionSystem';
import { DayNightCycle } from './systems/DayNightCycle';
import {
  InputAction,
  InputHandler,
} from './systems/InputHandler';
import { ObstacleGenerator } from './systems/ObstacleGenerator';
import { ScoreManager } from './systems/ScoreManager';
import { GameState } from './types/game.types';

registerSW({ immediate: true });

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor #app');
}

const stateManager = new StateManager();

app.innerHTML = `
  <header class="game-header">
    <h1>T-Lynx</h1>
    <p>Estado actual: <span class="game-state">${stateManager.state}</span></p>
    <p class="loop-debug">FPS: — · Updates/s: —</p>
    <p class="cycle-debug"></p>
    <p class="player-debug" aria-live="polite"></p>
    <p class="obstacle-debug"></p>
    <p class="score-debug"></p>
    <p class="audio-debug" aria-live="polite"></p>
    <pre class="input-debug" aria-live="polite"></pre>
  </header>
  <main class="game-viewport" aria-label="Área de juego">
    <canvas class="game-canvas" aria-label="Canvas de T-Lynx">
      Tu navegador no soporta canvas.
    </canvas>
  </main>
`;

const viewport =
  app.querySelector<HTMLElement>('.game-viewport');

const canvas =
  app.querySelector<HTMLCanvasElement>('.game-canvas');

const loopDebug =
  app.querySelector<HTMLParagraphElement>('.loop-debug');

const cycleDebug =
  app.querySelector<HTMLParagraphElement>('.cycle-debug');

const gameStateText =
  app.querySelector<HTMLSpanElement>('.game-state');

const playerDebug =
  app.querySelector<HTMLParagraphElement>('.player-debug');

const obstacleDebug =
  app.querySelector<HTMLParagraphElement>('.obstacle-debug');

const inputDebug =
  app.querySelector<HTMLPreElement>('.input-debug');

const scoreDebug =
  app.querySelector<HTMLParagraphElement>('.score-debug');

const audioDebug =
  app.querySelector<HTMLParagraphElement>('.audio-debug');

if (
  !viewport ||
  !canvas ||
  !loopDebug ||
  !cycleDebug ||
  !gameStateText ||
  !playerDebug ||
  !obstacleDebug ||
  !inputDebug ||
  !scoreDebug ||
  !audioDebug
) {
  throw new Error('No se pudo crear el área de juego');
}

stateManager.subscribe((nextState) => {
  gameStateText.textContent = nextState;
});

audioContextManager.listenForFirstGesture(window);

const engine = new Engine(canvas, viewport);
const input = new InputHandler(window, viewport);
const particles = new ParticleSystem();
const dayNightCycle = new DayNightCycle();
const background = new ParallaxBackground(engine.width, engine.height);
const DUST_PER_JUMP = 6;
const DUST_PER_LANDING = 8;
const PAPER_PER_OBSTACLE = 24;

const emitDustAtPlayerFeet = (count: number): void => {
  particles.emitDust(player.position.x + player.width / 2, GROUND_Y, count);
};

const player = new Player(
  input,
  () => {
    sounds.jump();
    emitDustAtPlayerFeet(DUST_PER_JUMP);
  },
  () => emitDustAtPlayerFeet(DUST_PER_LANDING),
);
const obstacles = new ObstacleGenerator(engine.width);
const collisions = new CollisionSystem();
const scoreManager = new ScoreManager();

let lastMilestone = 0;

scoreManager.onMilestone((milestone) => {
  sounds.milestone();
  lastMilestone = milestone;
});

stateManager.subscribe((nextState) => {
  if (nextState === GameState.Playing) {
    player.reset();
    obstacles.reset();
    scoreManager.reset();
    particles.reset();
    dayNightCycle.reset();
    background.reset();
    lastMilestone = 0;
  } else if (nextState === GameState.GameOver) {
    scoreManager.finishRun();
  }
});

const counters: Record<
  InputAction,
  { justPressed: number; released: number }
> = {
  [InputAction.Jump]: {
    justPressed: 0,
    released: 0,
  },
  [InputAction.Duck]: {
    justPressed: 0,
    released: 0,
  },
};

const update = (dt: number): void => {
  if (stateManager.state === GameState.Menu) {
    if (input.justPressed(InputAction.Jump)) {
      stateManager.transition(GameState.Playing);
    }
  } else if (stateManager.state === GameState.GameOver) {
    if (input.justPressed(InputAction.Jump)) {
      stateManager.transition(GameState.Playing);
    }
  } else if (stateManager.state === GameState.Playing) {
    player.update(dt);
    obstacles.update(dt, scoreManager.score);
    scoreManager.update(obstacles.distance);
    dayNightCycle.update(scoreManager.score);
    background.update(dt, obstacles.speed);

    const shieldPowerUp = obstacles.activeShieldPowerUp;

    if (
      shieldPowerUp &&
      intersects(player.hitbox, shieldPowerUp.hitbox)
    ) {
      obstacles.removeShieldPowerUp();
      player.collectShield();
      sounds.shieldPickup();
    }

    const collision = collisions.firstCollision(
      player,
      obstacles.activeObstacles,
    );

    if (collision) {
      if (player.consumeShield()) {
        particles.emitPaper(
          collision.position.x,
          collision.position.y,
          collision.width,
          collision.height,
          PAPER_PER_OBSTACLE,
        );
        obstacles.deactivateObstacle(collision);
        sounds.shieldBreak();
      } else if (!player.isInvulnerable) {
        player.defeat();
        sounds.gameOver();
        stateManager.transition(GameState.GameOver);
      }
    }
  }

  // Las partículas siguen cayendo en GAME_OVER, pero el mundo ya no se mueve.
  if (stateManager.state !== GameState.Menu) {
    const scrollSpeed =
      stateManager.state === GameState.Playing ? obstacles.speed : 0;
    particles.update(dt, scrollSpeed, GROUND_Y, engine.width);
  }

  const lines: string[] = [];

  for (const action of Object.values(InputAction)) {
    if (input.justPressed(action)) {
      counters[action].justPressed++;
    }

    if (input.released(action)) {
      counters[action].released++;
    }

    lines.push(
      `${action.padEnd(4)}  isPressed: ${
        input.isPressed(action) ? 'SÍ' : 'no'
      }` +
        `  justPressed: ${counters[action].justPressed}` +
        `  released: ${counters[action].released}`,
    );
  }

  const inputText = lines.join('\n');

  if (inputDebug.textContent !== inputText) {
    inputDebug.textContent = inputText;
  }

  const playerText =
    `Jugador: ${player.state}` +
    ` · Velocidad Y: ${player.verticalVelocity.toFixed(1)} px/s` +
    ` · Altura: ${player.height} px` +
    ` · hasShield: ${player.hasShield}` +
    ` · Invulnerabilidad restante: ${Math.ceil(
      player.invulnerabilityRemaining * 1000,
    )} ms`;

  if (playerDebug.textContent !== playerText) {
    playerDebug.textContent = playerText;
  }

  input.update();
};

const render = (alpha: number): void => {
  const ctx = engine.getContext();

  engine.clear();
  background.setPalette(dayNightCycle.currentPalette);
  background.render(ctx, alpha);

  const isGameOver =
    stateManager.state === GameState.GameOver;

  const renderAlpha = isGameOver ? 1 : alpha;

  obstacles.render(ctx, renderAlpha);
  player.render(ctx, renderAlpha);
  particles.render(ctx, alpha);

  drawScore(
    ctx,
    engine.width,
    scoreManager.score,
    scoreManager.highScore,
    player.hasShield,
    dayNightCycle.currentPalette.hudText,
  );

  drawSoundStatus(
    ctx,
    audioContextManager.isSupported,
    audioContextManager.isMuted,
    dayNightCycle.currentPalette.hudText,
  );

  if (stateManager.state === GameState.Menu) {
    drawMessage(
      ctx,
      engine.width,
      engine.height,
      'Presiona Espacio o toca para empezar',
    );
  } else if (isGameOver) {
    drawMessage(
      ctx,
      engine.width,
      engine.height,
      'GAME OVER - Presiona Espacio o toca para reintentar',
    );

    if (scoreManager.isNewRecord) {
      drawNewRecord(
        ctx,
        engine.width,
        engine.height,
      );
    }
  }

  const loopText =
    `FPS: ${loop.fps || '—'}` +
    ` · Updates/s: ${loop.ups || '—'}`;

  if (loopDebug.textContent !== loopText) {
    loopDebug.textContent = loopText;
  }

  const obstacleText =
    `Velocidad: ${obstacles.speed.toFixed(1)} px/s` +
    ` · Distancia: ${obstacles.distance.toFixed(1)} px` +
    ` · Obstáculos activos: ${obstacles.activeObstacles.length}` +
    ` (aviones: ${obstacles.activeAirplanes})` +
    ` · Pool: ${obstacles.poolSize}` +
    ` · Prob. avión: ${Math.round(
      obstacles.airplaneChance * 100,
    )} %` +
    ` · shieldSpawnedThisSession: ${
      obstacles.shieldSpawnedThisSession
    }`;

  if (obstacleDebug.textContent !== obstacleText) {
    obstacleDebug.textContent = obstacleText;
  }

  const scoreText =
    `Puntos: ${scoreManager.score}` +
    ` · Récord: ${scoreManager.highScore}` +
    ` · Último hito: ${lastMilestone || '—'}` +
    ` · Partículas: ${particles.activeCount}/${particles.capacity}` +
    ` (descartadas: ${particles.dropped})`;

  if (scoreDebug.textContent !== scoreText) {
    scoreDebug.textContent = scoreText;
  }

  const cycleText =
    `Fase: ${dayNightCycle.phase.toUpperCase()}` +
    ` · Transición: ${Math.round(
      dayNightCycle.transitionProgress * 100,
    )} %`;

  if (cycleDebug.textContent !== cycleText) {
    cycleDebug.textContent = cycleText;
  }

  const audioText =
    `Sonido: ${
      audioContextManager.isMuted ? 'OFF' : 'ON'
    } · Web Audio: ` +
    (!audioContextManager.isSupported
      ? 'no disponible'
      : audioContextManager.isReady
        ? 'activo'
        : 'esperando gesto');

  if (audioDebug.textContent !== audioText) {
    audioDebug.textContent = audioText;
  }
};

const loop = new GameLoop(update, render);

window.addEventListener('keydown', (event) => {
  if (event.repeat) {
    return;
  }

  if (event.code === 'KeyH') {
    player.showHitbox = !player.showHitbox;
    obstacles.showHitboxes = player.showHitbox;
  } else if (event.code === 'KeyM') {
    audioContextManager.toggleMuted();
  } else if (event.code === 'KeyN') {
    // TEMPORAL: quita esta rama y advancePhaseForDebug() al terminar M-11.
    dayNightCycle.advancePhaseForDebug();
  }
});

loop.start();

function drawMessage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  message: string,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(
    20,
    height / 2 - 24,
    width - 40,
    48,
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(
    message,
    width / 2,
    height / 2,
    width - 56,
  );
}

/** Marcador provisional en el canvas (M-15 lo reemplaza por el HUD final). */
function drawScore(
  ctx: CanvasRenderingContext2D,
  width: number,
  score: number,
  highScore: number,
  hasShield: boolean,
  hudTextColor: string,
): void {
  const pad = (value: number): string =>
    String(value).padStart(5, '0');

  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = hudTextColor;

  ctx.fillText(
    `HI ${pad(highScore)}  ${pad(score)}`,
    width - 12,
    10,
  );

  if (hasShield) {
    drawShieldIndicator(
      ctx,
      width - 166,
      17,
    );
  }

  ctx.restore();
}

function drawShieldIndicator(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
): void {
  ctx.fillStyle = 'rgba(23, 182, 201, 0.65)';
  ctx.strokeStyle = '#d8fbff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    7,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#ffe45c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX + 1, centerY - 5);
  ctx.lineTo(centerX - 2, centerY);
  ctx.lineTo(centerX + 2, centerY);
  ctx.lineTo(centerX - 1, centerY + 5);
  ctx.stroke();
}

function drawSoundStatus(
  ctx: CanvasRenderingContext2D,
  isSupported: boolean,
  isMuted: boolean,
  hudTextColor: string,
): void {
  const label = !isSupported
    ? 'SONIDO: N/D'
    : isMuted
      ? 'SONIDO: OFF'
      : 'SONIDO: ON';

  ctx.save();
  ctx.fillStyle = 'rgba(30, 42, 56, 0.72)';
  ctx.fillRect(8, 8, 94, 18);
  ctx.fillStyle = hudTextColor;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 13, 12);
  ctx.restore();
}

function drawNewRecord(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd84d';

  ctx.fillText(
    'NUEVO RÉCORD',
    width / 2,
    height / 2 + 40,
  );
}