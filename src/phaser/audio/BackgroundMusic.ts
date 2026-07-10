export class BackgroundMusic {
  private static readonly outputGain = 1 / 3;
  private readonly audio: HTMLAudioElement;
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private volume = 0.5;
  private started = false;

  constructor(source: string) {
    this.audio = new Audio(source);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.getEffectiveVolume();
  }

  unlock(): void {
    this.ensureAudioGraph();
    if (this.context?.state === 'suspended') {
      void this.context.resume();
    }

    if (this.started) {
      return;
    }

    this.started = true;
    this.audio.play().catch(() => {
      this.started = false;
    });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gain && this.context) {
      this.gain.gain.setTargetAtTime(this.getEffectiveVolume(), this.context.currentTime, 0.015);
    } else {
      this.audio.volume = this.getEffectiveVolume();
    }
  }

  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
  }

  private getEffectiveVolume(): number {
    return this.volume * BackgroundMusic.outputGain;
  }

  private ensureAudioGraph(): void {
    if (this.gain || this.context) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    try {
      this.context = new AudioContextClass();
      this.source = this.context.createMediaElementSource(this.audio);
      this.gain = this.context.createGain();
      this.gain.gain.value = this.getEffectiveVolume();
      this.source.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.audio.volume = 1;
    } catch {
      this.context = null;
      this.source = null;
      this.gain = null;
      this.audio.volume = this.getEffectiveVolume();
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
