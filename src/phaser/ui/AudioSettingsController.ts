type AudioSettingsCallbacks = {
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
};

const volumeStorageKey = 'asteridle.settings.volume';
const musicVolumeStorageKey = 'asteridle.settings.musicVolume';
const maxSfxVolume = 1.2;
const maxMusicVolume = 1;
const defaultSfxVolume = 0.75;
const defaultMusicVolume = 0.5;

export class AudioSettingsController {
  private onOpenSettings: (() => void) | null = null;
  private readonly handleToggleClick = (): void => {
    this.onOpenSettings?.();
  };

  constructor(
    private readonly toggleEl: HTMLButtonElement,
    private readonly callbacks: AudioSettingsCallbacks
  ) {}

  bind(onOpenSettings: () => void): void {
    this.onOpenSettings = onOpenSettings;
    this.applySavedVolumes();
    this.toggleEl.addEventListener('click', this.handleToggleClick);
  }

  destroy(): void {
    this.toggleEl.removeEventListener('click', this.handleToggleClick);
    this.onOpenSettings = null;
  }

  setExpanded(expanded: boolean): void {
    this.toggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  render(): HTMLElement[] {
    return [
      this.createVolumeControl('SFX', this.loadSfxVolume(), maxSfxVolume, (volume) => {
        this.callbacks.setSfxVolume(volume);
        this.saveSfxVolume(volume);
      }),
      this.createVolumeControl('Music', this.loadMusicVolume(), maxMusicVolume, (volume) => {
        this.callbacks.setMusicVolume(volume);
        this.saveMusicVolume(volume);
      })
    ];
  }

  private applySavedVolumes(): void {
    this.callbacks.setSfxVolume(this.loadSfxVolume());
    this.callbacks.setMusicVolume(this.loadMusicVolume());
  }

  private loadSfxVolume(): number {
    return this.loadStoredVolume(volumeStorageKey, defaultSfxVolume, maxSfxVolume);
  }

  private loadMusicVolume(): number {
    return this.loadStoredVolume(musicVolumeStorageKey, defaultMusicVolume, maxMusicVolume);
  }

  private loadStoredVolume(key: string, defaultVolume: number, maxVolume: number): number {
    const storedValue = window.localStorage.getItem(key);
    const parsedValue = storedValue === null ? defaultVolume : Number(storedValue);
    return Number.isFinite(parsedValue) ? Math.max(0, Math.min(maxVolume, parsedValue)) : defaultVolume;
  }

  private saveSfxVolume(volume: number): void {
    this.saveStoredVolume(volumeStorageKey, volume);
  }

  private saveMusicVolume(volume: number): void {
    this.saveStoredVolume(musicVolumeStorageKey, volume);
  }

  private saveStoredVolume(key: string, volume: number): void {
    try {
      window.localStorage.setItem(key, volume.toString());
    } catch {
      // Audio preferences are best-effort.
    }
  }

  private createVolumeControl(label: string, value: number, max: number, onChange: (volume: number) => void): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-modal-control';

    const heading = document.createElement('label');
    heading.className = 'settings-control';
    const text = document.createElement('span');
    text.textContent = label;
    const valueLabel = document.createElement('strong');
    valueLabel.textContent = `${Math.round(value * 100)}%`;
    heading.append(text, valueLabel);

    const slider = document.createElement('input');
    slider.className = 'volume-slider';
    slider.type = 'range';
    slider.min = '0';
    slider.max = Math.round(max * 100).toString();
    slider.value = Math.round(value * 100).toString();
    slider.setAttribute('aria-label', `${label} volume`);
    const commitVolume = (): void => {
      const nextVolume = Number(slider.value) / 100;
      valueLabel.textContent = `${Math.round(nextVolume * 100)}%`;
      onChange(nextVolume);
    };
    slider.addEventListener('input', commitVolume);
    slider.addEventListener('change', commitVolume);

    wrapper.append(heading, slider);
    return wrapper;
  }
}
