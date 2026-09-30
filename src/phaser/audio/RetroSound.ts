import type { GameAudioEvent } from '../../game/simulation/types';

type Wave = OscillatorType;

export class RetroSound {
  private static readonly outputGain = 2;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.75;
  private readonly maxVolume = 1.2;
  private droneBurstStartedAt = 0;
  private droneShotsInBurst = 0;
  private lastDroneShotAt = 0;
  private lastSeekerHumAt = 0;
  private lastSeekerShootAt = 0;

  unlock(): void {
    const context = this.getContext();
    if (context?.state === 'suspended') {
      void context.resume();
    }
  }

  play(event: GameAudioEvent): void {
    const context = this.getContext();
    if (!context || context.state === 'suspended') {
      return;
    }

    switch (event.type) {
      case 'playerShoot':
        this.tone(620, 180, 0.055, 'square', 0.055);
        break;
      case 'droneShoot':
        if (this.canPlayDroneShot(context.currentTime)) {
          this.tone(820, 420, 0.045, 'square', 0.026);
        }
        break;
      case 'saucerShoot':
        this.tone(240, 430, 0.13, 'sawtooth', 0.045);
        break;
      case 'bossShoot':
        this.tone(130, 76, 0.11, 'sawtooth', 0.034);
        this.tone(420, 190, 0.09, 'square', 0.018, 0.012);
        break;
      case 'bossSentinelVolley':
        this.tone(920, 510, 0.08, 'square', 0.036);
        this.tone(1380, 860, 0.06, 'triangle', 0.018, 0.028);
        this.noise(0.055, 0.014, 1900);
        break;
      case 'bossCrusherShockwave':
        this.noise(0.18, 0.052, 260);
        this.tone(58, 34, 0.28, 'sawtooth', 0.05);
        this.tone(116, 72, 0.18, 'triangle', 0.026, 0.04);
        break;
      case 'bossPrismRicochet':
        this.tone(760, 1240, 0.055, 'triangle', 0.03);
        this.tone(1180, 620, 0.08, 'square', 0.018, 0.035);
        this.tone(1540, 910, 0.07, 'triangle', 0.014, 0.08);
        break;
      case 'bossMothershipRing':
        this.tone(180, 320, 0.16, 'sawtooth', 0.032);
        this.tone(540, 280, 0.13, 'triangle', 0.02, 0.025);
        this.noise(0.1, 0.016, 900);
        break;
      case 'bossMothershipFan':
        this.tone(360, 780, 0.12, 'square', 0.032);
        this.tone(520, 1120, 0.1, 'triangle', 0.018, 0.035);
        this.noise(0.08, 0.012, 1300);
        break;
      case 'bossMothershipBeam':
        this.noise(0.22, 0.022, 2100);
        this.tone(220, 1480, 0.34, 'sawtooth', 0.035);
        this.tone(1240, 420, 0.3, 'sine', 0.023, 0.05);
        this.tone(72, 108, 0.42, 'triangle', 0.018);
        break;
      case 'bossMothershipSummon':
        this.noise(0.26, 0.03, 520);
        this.tone(96, 180, 0.32, 'sawtooth', 0.038);
        this.tone(420, 980, 0.2, 'triangle', 0.02, 0.1);
        break;
      case 'bossMothershipPhaseShift':
        this.noise(0.34, 0.038, 780);
        this.tone(320, 84, 0.42, 'sawtooth', 0.04);
        this.tone(760, 160, 0.24, 'triangle', 0.018, 0.12);
        break;
      case 'bossSeekerShoot':
        if (this.canPlaySeekerShot(context.currentTime)) {
          this.tone(470, 260, 0.065, 'triangle', 0.02);
          this.tone(870, 520, 0.05, 'square', 0.011, 0.012);
        }
        break;
      case 'bossSeekerHum':
        if (this.canPlaySeekerHum(context.currentTime)) {
          this.tone(72, 92, 0.22, 'sine', 0.012);
          this.noise(0.18, 0.009, 420);
        }
        break;
      case 'asteroidHit':
        this.noise(0.08, 0.035, 900);
        break;
      case 'asteroidDestroyed':
        this.noise(event.size === 'large' ? 0.22 : 0.14, event.size === 'large' ? 0.13 : 0.08, 520);
        this.tone(event.size === 'small' ? 260 : 180, 70, 0.12, 'triangle', 0.04);
        break;
      case 'saucerDestroyed':
        this.tone(540, 120, 0.2, 'sawtooth', 0.06);
        this.noise(0.18, 0.08, 700);
        break;
      case 'shipHit':
        this.tone(130, 70, 0.15, 'sawtooth', 0.05);
        break;
      case 'shipDestroyed':
        this.noise(0.42, 0.18, 360);
        this.tone(220, 45, 0.42, 'sawtooth', 0.065);
        break;
      case 'shipLevelUp':
        this.noise(0.3, 0.052, 1300);
        this.tone(260, 780, 0.28, 'triangle', 0.052);
        this.tone(520, 1240, 0.34, 'sine', 0.038, 0.06);
        this.tone(98, 46, 0.36, 'sawtooth', 0.034, 0.02);
        break;
      case 'vectorTapBoost':
        this.tone(360, 860, 0.11, 'triangle', 0.032);
        this.tone(920, 460, 0.08, 'square', 0.014, 0.025);
        this.noise(0.08, 0.012, 1200);
        break;
      case 'emberFlameWave':
        this.noise(0.18, 0.034, 680);
        this.tone(150, 82, 0.2, 'sawtooth', 0.024);
        this.tone(620, 260, 0.12, 'triangle', 0.014, 0.035);
        break;
      case 'spaceTravel':
        this.noise(0.72, 0.045, 1700);
        this.tone(72, 1460, 0.76, 'sawtooth', 0.052);
        this.tone(210, 880, 0.38, 'triangle', 0.032, 0.12);
        this.tone(980, 160, 0.32, 'sine', 0.025, 0.42);
        break;
      case 'bossSummoned':
        this.noise(0.62, 0.062, 320);
        this.tone(86, 42, 0.52, 'sawtooth', 0.06);
        this.tone(190, 410, 0.3, 'triangle', 0.032, 0.1);
        this.tone(620, 160, 0.2, 'square', 0.026, 0.34);
        break;
      case 'bossDefeated':
        this.noise(0.56, 0.18, 520);
        this.noise(0.34, 0.08, 1500);
        this.tone(280, 38, 0.58, 'sawtooth', 0.07);
        this.tone(820, 140, 0.26, 'square', 0.032, 0.08);
        break;
      case 'zoneUnlocked':
        this.tone(330, 660, 0.16, 'triangle', 0.04);
        this.tone(495, 990, 0.18, 'triangle', 0.036, 0.1);
        this.tone(742, 1240, 0.24, 'sine', 0.032, 0.22);
        break;
      case 'warpReset':
        this.noise(0.45, 0.055, 1200);
        this.tone(680, 120, 0.38, 'sawtooth', 0.045);
        this.tone(130, 520, 0.28, 'triangle', 0.032, 0.2);
        break;
      case 'purchase':
        this.tone(520, 780, 0.08, 'square', 0.035);
        this.tone(780, 1040, 0.12, 'square', 0.03, 0.06);
        break;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(this.maxVolume, volume));
    if (this.master) {
      this.master.gain.value = this.getEffectiveVolume();
    }
  }

  getVolume(): number {
    return this.volume;
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.getEffectiveVolume();
    this.master.connect(this.context.destination);
    return this.context;
  }

  private getEffectiveVolume(): number {
    return this.volume * RetroSound.outputGain;
  }

  private canPlayDroneShot(now: number): boolean {
    if (now - this.droneBurstStartedAt > 0.22) {
      this.droneBurstStartedAt = now;
      this.droneShotsInBurst = 0;
    }

    if (now - this.lastDroneShotAt < 0.035 || this.droneShotsInBurst >= 4) {
      return false;
    }

    this.lastDroneShotAt = now;
    this.droneShotsInBurst += 1;
    return true;
  }

  private canPlaySeekerHum(now: number): boolean {
    if (now - this.lastSeekerHumAt < 0.5) {
      return false;
    }

    this.lastSeekerHumAt = now;
    return true;
  }

  private canPlaySeekerShot(now: number): boolean {
    if (now - this.lastSeekerShootAt < 0.07) {
      return false;
    }

    this.lastSeekerShootAt = now;
    return true;
  }

  private tone(startFrequency: number, endFrequency: number, duration: number, wave: Wave, volume: number, delay = 0): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) {
      return;
    }

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(duration: number, volume: number, lowpassFrequency: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) {
      return;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = lowpassFrequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + duration);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
