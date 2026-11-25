import { audioContextManager } from './AudioContextManager';
import type { AudioGraph } from './AudioContextManager';

const MIN_GAIN = 0.0001;
const ATTACK_SECONDS = 0.006;
const RELEASE_PADDING_SECONDS = 0.01;

const JUMP_DURATION_SECONDS = 0.15;
const SHIELD_BREAK_DURATION_SECONDS = 0.2;
const GAME_OVER_DURATION_SECONDS = 0.45;

const SHIELD_ARPEGGIO_FREQUENCIES = [659.25, 830.61, 987.77] as const;
const SHIELD_ARPEGGIO_STEP_SECONDS = 0.09;
const SHIELD_NOTE_DURATION_SECONDS = 0.13;

const MILESTONE_FREQUENCIES = [800, 1200] as const;
const MILESTONE_STEP_SECONDS = 0.1;
const MILESTONE_NOTE_DURATION_SECONDS = 0.12;

interface ToneOptions {
  type: OscillatorType;
  startTime: number;
  duration: number;
  startFrequency: number;
  endFrequency?: number;
  peakGain: number;
}

export class SoundEffects {
  private noiseBuffer: AudioBuffer | null = null;

  jump(): void {
    const graph = audioContextManager.getGraph();
    if (!graph) {
      return;
    }

    this.playTone(graph, {
      type: 'square',
      startTime: graph.context.currentTime,
      duration: JUMP_DURATION_SECONDS,
      startFrequency: 150,
      endFrequency: 450,
      peakGain: 0.12,
    });
  }

  shieldPickup(): void {
    const graph = audioContextManager.getGraph();
    if (!graph) {
      return;
    }

    const now = graph.context.currentTime;

    SHIELD_ARPEGGIO_FREQUENCIES.forEach((frequency, index) => {
      this.playTone(graph, {
        type: 'sine',
        startTime: now + index * SHIELD_ARPEGGIO_STEP_SECONDS,
        duration: SHIELD_NOTE_DURATION_SECONDS,
        startFrequency: frequency,
        peakGain: 0.16,
      });
    });
  }

  shieldBreak(): void {
    const graph = audioContextManager.getGraph();
    if (!graph) {
      return;
    }

    const { context, destination } = graph;
    const now = context.currentTime;
    const endTime = now + SHIELD_BREAK_DURATION_SECONDS;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();

    source.buffer = this.getNoiseBuffer(context);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(450, endTime);
    filter.Q.setValueAtTime(0.8, now);

    envelope.gain.setValueAtTime(MIN_GAIN, now);
    envelope.gain.linearRampToValueAtTime(0.2, now + ATTACK_SECONDS);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, endTime);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };

    source.start(now);
    source.stop(endTime);
  }

  milestone(): void {
    const graph = audioContextManager.getGraph();
    if (!graph) {
      return;
    }

    const now = graph.context.currentTime;

    MILESTONE_FREQUENCIES.forEach((frequency, index) => {
      this.playTone(graph, {
        type: 'triangle',
        startTime: now + index * MILESTONE_STEP_SECONDS,
        duration: MILESTONE_NOTE_DURATION_SECONDS,
        startFrequency: frequency,
        peakGain: 0.14,
      });
    });
  }

  gameOver(): void {
    const graph = audioContextManager.getGraph();
    if (!graph) {
      return;
    }

    this.playTone(graph, {
      type: 'sawtooth',
      startTime: graph.context.currentTime,
      duration: GAME_OVER_DURATION_SECONDS,
      startFrequency: 300,
      endFrequency: 80,
      peakGain: 0.15,
    });
  }

  private playTone(graph: AudioGraph, options: ToneOptions): void {
    const { context, destination } = graph;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const endTime = options.startTime + options.duration;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(
      options.startFrequency,
      options.startTime,
    );

    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        options.endFrequency,
        endTime,
      );
    }

    envelope.gain.setValueAtTime(MIN_GAIN, options.startTime);
    envelope.gain.linearRampToValueAtTime(
      options.peakGain,
      options.startTime + ATTACK_SECONDS,
    );
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, endTime);

    oscillator.connect(envelope);
    envelope.connect(destination);

    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };

    oscillator.start(options.startTime);
    oscillator.stop(endTime + RELEASE_PADDING_SECONDS);
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const frameCount = Math.ceil(
      context.sampleRate * SHIELD_BREAK_DURATION_SECONDS,
    );
    const buffer = context.createBuffer(
      1,
      frameCount,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);

    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

export const sounds = new SoundEffects();