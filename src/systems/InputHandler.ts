/** Acciones del juego, independientes del dispositivo de entrada. */
export const InputAction = {
  Jump: 'JUMP',
  Duck: 'DUCK',
} as const;

export type InputAction = (typeof InputAction)[keyof typeof InputAction];

/** Teclas (event.code) asignadas a cada acción. */
const KEY_BINDINGS: Readonly<Record<string, InputAction>> = {
  Space: InputAction.Jump,
  ArrowUp: InputAction.Jump,
  KeyW: InputAction.Jump,
  ArrowDown: InputAction.Duck,
  KeyS: InputAction.Duck,
};

/** Distancia vertical (px CSS) que debe recorrer un dedo para contar como deslizar hacia abajo. */
const SWIPE_DOWN_THRESHOLD = 30;

interface ActionState {
  /** Fuentes que mantienen la acción activa: teclas ("key:Space") o toques ("touch:0"). */
  sources: Set<string>;
  justPressed: boolean;
  released: boolean;
}

interface ActiveTouch {
  startY: number;
  action: InputAction;
}

/**
 * Traduce teclado y pantalla táctil a acciones del juego.
 *
 * - isPressed: la acción está activa en este cuadro.
 * - justPressed: la acción se activó en este cuadro.
 * - released: la acción se soltó en este cuadro.
 *
 * Se debe llamar a update() al final de cada actualización del juego para
 * limpiar justPressed y released.
 */
export class InputHandler {
  private readonly states: Record<InputAction, ActionState>;
  private readonly touches = new Map<number, ActiveTouch>();
  private readonly keyTarget: Window;
  private readonly touchTarget: HTMLElement;

  constructor(keyTarget: Window, touchTarget: HTMLElement) {
    this.keyTarget = keyTarget;
    this.touchTarget = touchTarget;
    this.states = {
      [InputAction.Jump]: InputHandler.createState(),
      [InputAction.Duck]: InputHandler.createState(),
    };

    keyTarget.addEventListener('keydown', this.onKeyDown);
    keyTarget.addEventListener('keyup', this.onKeyUp);
    keyTarget.addEventListener('blur', this.releaseAll);
    touchTarget.addEventListener('touchstart', this.onTouchStart, { passive: false });
    touchTarget.addEventListener('touchmove', this.onTouchMove, { passive: false });
    touchTarget.addEventListener('touchend', this.onTouchEnd, { passive: false });
    touchTarget.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  isPressed(action: InputAction): boolean {
    return this.states[action].sources.size > 0;
  }

  justPressed(action: InputAction): boolean {
    return this.states[action].justPressed;
  }

  released(action: InputAction): boolean {
    return this.states[action].released;
  }

  /** Limpia los estados de un solo cuadro. Llamar al final de cada update. */
  update(): void {
    for (const state of Object.values(this.states)) {
      state.justPressed = false;
      state.released = false;
    }
  }

  /** Quita todos los listeners (por ejemplo, al destruir la escena). */
  destroy(): void {
    this.keyTarget.removeEventListener('keydown', this.onKeyDown);
    this.keyTarget.removeEventListener('keyup', this.onKeyUp);
    this.keyTarget.removeEventListener('blur', this.releaseAll);
    this.touchTarget.removeEventListener('touchstart', this.onTouchStart);
    this.touchTarget.removeEventListener('touchmove', this.onTouchMove);
    this.touchTarget.removeEventListener('touchend', this.onTouchEnd);
    this.touchTarget.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private static createState(): ActionState {
    return { sources: new Set<string>(), justPressed: false, released: false };
  }

  private press(action: InputAction, source: string): void {
    const state = this.states[action];

    if (state.sources.size === 0) {
      state.justPressed = true;
    }

    state.sources.add(source);
  }

  private release(action: InputAction, source: string): void {
    const state = this.states[action];

    if (!state.sources.delete(source)) {
      return;
    }

    if (state.sources.size === 0) {
      state.released = true;
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];

    if (!action) {
      return;
    }

    // Evita que Espacio y las flechas hagan scroll en la página.
    event.preventDefault();

    // Ignora la autorrepetición del sistema al mantener una tecla.
    if (event.repeat) {
      return;
    }

    this.press(action, `key:${event.code}`);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];

    if (!action) {
      return;
    }

    event.preventDefault();
    this.release(action, `key:${event.code}`);
  };

  /** Tocar o mantener = salto. */
  private readonly onTouchStart = (event: TouchEvent): void => {
    // Evita scroll, zoom con doble toque y el clic simulado.
    event.preventDefault();

    for (const touch of Array.from(event.changedTouches)) {
      this.touches.set(touch.identifier, { startY: touch.clientY, action: InputAction.Jump });
      this.press(InputAction.Jump, `touch:${touch.identifier}`);
    }
  };

  /** Deslizar hacia abajo = agacharse (en el aire sirve como caída rápida). */
  private readonly onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();

    for (const touch of Array.from(event.changedTouches)) {
      const active = this.touches.get(touch.identifier);

      if (!active || active.action === InputAction.Duck) {
        continue;
      }

      if (touch.clientY - active.startY >= SWIPE_DOWN_THRESHOLD) {
        const source = `touch:${touch.identifier}`;
        this.release(InputAction.Jump, source);
        this.press(InputAction.Duck, source);
        active.action = InputAction.Duck;
      }
    }
  };

  private readonly onTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();

    for (const touch of Array.from(event.changedTouches)) {
      const active = this.touches.get(touch.identifier);

      if (!active) {
        continue;
      }

      this.release(active.action, `touch:${touch.identifier}`);
      this.touches.delete(touch.identifier);
    }
  };

  /** Si la ventana pierde el foco, suelta todo para que ninguna acción se quede pegada. */
  private readonly releaseAll = (): void => {
    for (const action of Object.values(InputAction)) {
      for (const source of Array.from(this.states[action].sources)) {
        this.release(action, source);
      }
    }

    this.touches.clear();
  };
}