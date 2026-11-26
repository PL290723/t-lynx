import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { audioContextManager } from './audio/AudioContextManager';
import { sounds } from './audio/SoundEffects';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { StateManager } from './core/StateManager';
import { Player, PlayerState } from './entities/Player';
import { ParticleSystem } from './graphics/ParticleSystem';
import { ParallaxBackground } from './graphics/ParallaxBackground';
import { GROUND_Y } from './graphics/PrototypeScene';
import { CollisionSystem, intersects } from './systems/CollisionSystem';
import { DayNightCycle } from './systems/DayNightCycle';
import { InputAction, InputHandler } from './systems/InputHandler';
import { EMPTY_LATENCY_TEXT, InputLatencyMeter } from './systems/InputLatencyMeter';
import { ObstacleGenerator } from './systems/ObstacleGenerator';
import { ScoreManager } from './systems/ScoreManager';
import { GameState } from './types/game.types';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { HUD } from './ui/HUD';
import { PixelFont } from './ui/PixelFont';

registerSW({ immediate: true });

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`No se encontró ${selector}`);
  }
  return element;
}

const app = requireElement<HTMLDivElement>('#app');
app.innerHTML = `
  <main class="game-viewport" aria-label="Área de juego">
    <canvas class="game-canvas" aria-label="Canvas de T-Lynx">
      Tu navegador no soporta canvas.
    </canvas>
  </main>
  <aside class="game-header" aria-label="Depuración" hidden>
    <p>Estado actual: <span class="game-state"></span></p>
    <p class="loop-debug"></p>
    <p class="cycle-debug"></p>
    <p class="player-debug"></p>
    <p class="obstacle-debug"></p>
    <p class="score-debug"></p>
    <p class="audio-debug"></p>
    <p class="latency-debug">${EMPTY_LATENCY_TEXT}</p>
    <pre class="input-debug"></pre>
  </aside>
`;

const viewport = requireElement<HTMLElement>('.game-viewport');
const canvas = requireElement<HTMLCanvasElement>('.game-canvas');
const debugPanel = requireElement<HTMLElement>('.game-header');
const gameStateText = requireElement<HTMLElement>('.game-state');
const loopDebug = requireElement<HTMLElement>('.loop-debug');
const cycleDebug = requireElement<HTMLElement>('.cycle-debug');
const playerDebug = requireElement<HTMLElement>('.player-debug');
const obstacleDebug = requireElement<HTMLElement>('.obstacle-debug');
const scoreDebug = requireElement<HTMLElement>('.score-debug');
const audioDebug = requireElement<HTMLElement>('.audio-debug');
const latencyDebug = requireElement<HTMLElement>('.latency-debug');
const inputDebug = requireElement<HTMLElement>('.input-debug');

const stateManager = new StateManager();
audioContextManager.listenForFirstGesture(window);

const engine = new Engine(canvas, viewport);
const input = new InputHandler(window, viewport);
const particles = new ParticleSystem();
const dayNightCycle = new DayNightCycle();
const background = new ParallaxBackground(engine.width, engine.height);
const font = new PixelFont();
const hud = new HUD(font);
const gameOver = new GameOverOverlay(font);
const hudData = {
  score: 0,
  highScore: 0,
  hasShield: false,
  isMuted: false,
  isSupported: false,
  color: '',
};
const gameOverData = {
  score: 0,
  highScore: 0,
  isNewRecord: false,
  color: '',
};
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
const counters: Record<InputAction, { justPressed: number; released: number }> = {
  [InputAction.Jump]: { justPressed: 0, released: 0 },
  [InputAction.Duck]: { justPressed: 0, released: 0 },
};

let lastMilestone = 0;
let debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
let inputLatency = debugEnabled ? new InputLatencyMeter() : null;
let duckAppliedLastStep = false;

input.setLatencyTracking(debugEnabled);
debugPanel.hidden = !debugEnabled;

scoreManager.onMilestone((milestone) => {
  sounds.milestone();
  hud.onMilestone();
  lastMilestone = milestone;
});

stateManager.subscribe((nextState) => {
  if (nextState === GameState.Playing) {
    if (inputLatency) {
      input.clearLatencyActivations();
      duckAppliedLastStep = false;
    }
    player.reset();
    obstacles.reset();
    scoreManager.reset();
    particles.reset();
    dayNightCycle.reset();
    background.reset();
    hud.resetMilestone();
    lastMilestone = 0;
  } else if (nextState === GameState.GameOver) {
    scoreManager.finishRun();
    gameOver.open();
  }
});

function updatePlaying(dt: number): void {
  const previousPlayerState = inputLatency ? player.state : undefined;
  player.update(dt);
  if (inputLatency) {
    if (
      player.state === PlayerState.Jumping && previousPlayerState !== PlayerState.Jumping
    ) {
      inputLatency.queue(InputAction.Jump, input.takeLatencyActivation(InputAction.Jump));
    }
    // Si el paso empezó en el aire, Duck activa la gravedad de caída rápida.
    const duckApplied = player.state === PlayerState.Ducking ||
      (previousPlayerState === PlayerState.Jumping && input.isPressed(InputAction.Duck));
    if (duckApplied) {
      const activation = input.takeLatencyActivation(InputAction.Duck);
      if (!duckAppliedLastStep) {
        inputLatency.queue(InputAction.Duck, activation);
      }
    }
    duckAppliedLastStep = duckApplied;
  }
  obstacles.update(dt, scoreManager.score);
  scoreManager.update(obstacles.distance);
  dayNightCycle.update(scoreManager.score);
  background.update(dt, obstacles.speed);

  const shieldPowerUp = obstacles.activeShieldPowerUp;
  if (shieldPowerUp && intersects(player.hitbox, shieldPowerUp.hitbox)) {
    obstacles.removeShieldPowerUp();
    player.collectShield();
    sounds.shieldPickup();
  }

  const collision = collisions.firstCollision(player, obstacles.activeObstacles);
  if (!collision) {
    return;
  }

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

function update(dt: number): void {
  const jumpPressed = input.justPressed(InputAction.Jump);

  switch (stateManager.state) {
    case GameState.Menu:
      if (jumpPressed) {
        stateManager.transition(GameState.Playing);
      }
      break;
    case GameState.GameOver:
      if (gameOver.canRestart() && jumpPressed) {
        stateManager.transition(GameState.Playing);
      } else {
        // El primer paso que cumple los 500 ms descarta pulsaciones pendientes.
        gameOver.advance();
      }
      break;
    case GameState.Playing:
      updatePlaying(dt);
      break;
  }

  // En GAME_OVER las partículas siguen cayendo con el escenario detenido.
  if (stateManager.state !== GameState.Menu) {
    const scrollSpeed = stateManager.state === GameState.Playing ? obstacles.speed : 0;
    particles.update(dt, scrollSpeed, GROUND_Y, engine.width);
  }

  if (debugEnabled) {
    for (const action of Object.values(InputAction)) {
      if (input.justPressed(action)) {
        counters[action].justPressed++;
      }
      if (input.released(action)) {
        counters[action].released++;
      }
    }
  }

  // Consume también la entrada que arrancó o reinició la partida.
  input.update();
}

function setDebugText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function renderDebug(): void {
  setDebugText(gameStateText, stateManager.state);
  setDebugText(loopDebug, `FPS: ${loop.fps || '—'} · Updates/s: ${loop.ups || '—'}`);
  setDebugText(
    cycleDebug,
    `Fase: ${dayNightCycle.phase.toUpperCase()}` +
      ` · Transición: ${Math.round(dayNightCycle.transitionProgress * 100)} %`,
  );
  setDebugText(
    playerDebug,
    `Jugador: ${player.state} · Velocidad Y: ${player.verticalVelocity.toFixed(1)} px/s` +
      ` · Altura: ${player.height} px · hasShield: ${player.hasShield}` +
      ` · Invulnerabilidad restante: ${Math.ceil(player.invulnerabilityRemaining * 1000)} ms`,
  );
  setDebugText(
    obstacleDebug,
    `Velocidad: ${obstacles.speed.toFixed(1)} px/s · Distancia: ${obstacles.distance.toFixed(1)} px` +
      ` · Obstáculos activos: ${obstacles.activeObstacles.length} (aviones: ${obstacles.activeAirplanes})` +
      ` · Pool: ${obstacles.poolSize} · Prob. avión: ${Math.round(obstacles.airplaneChance * 100)} %` +
      ` · shieldSpawnedThisSession: ${obstacles.shieldSpawnedThisSession}`,
  );
  setDebugText(
    scoreDebug,
    `Puntos: ${scoreManager.score} · Récord: ${scoreManager.highScore}` +
      ` · Último hito: ${lastMilestone || '—'}` +
      ` · Partículas: ${particles.activeCount}/${particles.capacity} (descartadas: ${particles.dropped})`,
  );

  const audioState = !audioContextManager.isSupported
    ? 'no disponible'
    : audioContextManager.isReady ? 'activo' : 'esperando gesto';
  setDebugText(
    audioDebug,
    `Sonido: ${audioContextManager.isMuted ? 'OFF' : 'ON'} · Web Audio: ${audioState}`,
  );
  setDebugText(
    inputDebug,
    Object.values(InputAction).map((action) =>
      `${action.padEnd(4)} · isPressed: ${input.isPressed(action) ? 'SÍ' : 'no'}` +
      ` · justPressed: ${counters[action].justPressed} · released: ${counters[action].released}`,
    ).join('\n'),
  );
}

function render(alpha: number): void {
  const ctx = engine.getContext();
  const palette = dayNightCycle.currentPalette;
  const isGameOver = stateManager.state === GameState.GameOver;

  engine.clear();
  background.setPalette(palette);
  background.render(ctx, alpha);

  const renderAlpha = isGameOver ? 1 : alpha;
  obstacles.render(ctx, renderAlpha);
  player.render(ctx, renderAlpha);
  particles.render(ctx, alpha);

  const { score, highScore, isNewRecord } = scoreManager;
  const color = palette.hudText;
  hudData.score = score;
  hudData.highScore = highScore;
  hudData.hasShield = player.hasShield;
  hudData.isMuted = audioContextManager.isMuted;
  hudData.isSupported = audioContextManager.isSupported;
  hudData.color = color;
  hud.draw(ctx, hudData);

  if (stateManager.state === GameState.Menu) {
    hud.drawStartScreen(ctx, color);
  } else if (isGameOver) {
    gameOverData.score = score;
    gameOverData.highScore = highScore;
    gameOverData.isNewRecord = isNewRecord;
    gameOverData.color = color;
    gameOver.draw(ctx, gameOverData);
  }

  if (window.innerHeight > window.innerWidth) {
    hud.drawPortraitHint(ctx, color);
  }

  if (inputLatency) {
    const latencyText = inputLatency.finishFrame(stateManager.state === GameState.Playing);
    if (latencyText !== undefined) {
      setDebugText(latencyDebug, latencyText);
    }
    renderDebug();
  }
}

const loop = new GameLoop(update, render);

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  if (event.code === 'KeyM') {
    audioContextManager.toggleMuted();
  } else if (event.code === 'KeyD') {
    debugEnabled = !debugEnabled;
    inputLatency = debugEnabled ? new InputLatencyMeter() : null;
    input.setLatencyTracking(debugEnabled);
    duckAppliedLastStep = false;
    debugPanel.hidden = !debugEnabled;
    if (debugEnabled) {
      setDebugText(latencyDebug, EMPTY_LATENCY_TEXT);
    } else {
      player.showHitbox = false;
      obstacles.showHitboxes = false;
    }
  } else if (debugEnabled && event.code === 'KeyH') {
    player.showHitbox = !player.showHitbox;
    obstacles.showHitboxes = player.showHitbox;
  } else if (debugEnabled && event.code === 'KeyN') {
    dayNightCycle.advancePhaseForDebug();
  }
});

loop.start();