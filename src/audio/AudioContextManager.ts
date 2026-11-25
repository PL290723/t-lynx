const MUTED_STORAGE_KEY = 't-lynx:muted';
const MASTER_VOLUME = 0.3;
const MUTE_RAMP_SECONDS = 0.02;

export interface AudioGraph {
  readonly context: AudioContext;
  readonly destination: AudioNode;
}

export class AudioContextManager {
  private static singleton: AudioContextManager | null = null;

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mutedState: boolean;
  private gestureListenersInstalled = false;
  private activationHandled = false;

  private constructor() {
    this.mutedState = this.loadMuted();
  }

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.singleton) {
      AudioContextManager.singleton = new AudioContextManager();
    }

    return AudioContextManager.singleton;
  }

  get isMuted(): boolean {
    return this.mutedState;
  }

  get isReady(): boolean {
    return this.context !== null && this.masterGain !== null;
  }

  get isSupported(): boolean {
    return typeof window.AudioContext === 'function';
  }

  listenForFirstGesture(target: Window): void {
    if (this.gestureListenersInstalled) {
      return;
    }

    this.gestureListenersInstalled = true;

    target.addEventListener('keydown', this.onFirstUserGesture, {
      once: false,
    });

    target.addEventListener('pointerdown', this.onFirstUserGesture, {
      once: false,
    });

    target.addEventListener('touchstart', this.onFirstUserGesture, {
      once: false,
      passive: true,
    });
  }

  getGraph(): AudioGraph | null {
    if (!this.context || !this.masterGain || this.context.state === 'closed') {
      return null;
    }

    return {
      context: this.context,
      destination: this.masterGain,
    };
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedState);
    return this.mutedState;
  }

  setMuted(muted: boolean): void {
    if (this.mutedState === muted) {
      return;
    }

    this.mutedState = muted;
    this.saveMuted();
    this.applyMasterGain();
  }

  private readonly onFirstUserGesture = (): void => {
    if (this.activationHandled) {
      return;
    }

    this.activationHandled = true;

    if (!this.isSupported) {
      return;
    }

    try {
      const context = new window.AudioContext();
      const masterGain = context.createGain();

      masterGain.gain.setValueAtTime(
        this.mutedState ? 0 : MASTER_VOLUME,
        context.currentTime,
      );
      masterGain.connect(context.destination);

      this.context = context;
      this.masterGain = masterGain;

      if (context.state === 'suspended') {
        void context.resume().catch(() => {
          // Si el navegador rechaza el audio, el juego continúa en silencio.
        });
      }
    } catch {
      this.context = null;
      this.masterGain = null;
    }
  };

  private applyMasterGain(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const gain = this.masterGain.gain;
    const target = this.mutedState ? 0 : MASTER_VOLUME;

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + MUTE_RAMP_SECONDS);
  }

  private loadMuted(): boolean {
    try {
      return window.localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private saveMuted(): void {
    try {
      window.localStorage.setItem(
        MUTED_STORAGE_KEY,
        String(this.mutedState),
      );
    } catch {
      // Almacenamiento bloqueado: el estado se conserva solo en memoria.
    }
  }
}

export const audioContextManager = AudioContextManager.getInstance();