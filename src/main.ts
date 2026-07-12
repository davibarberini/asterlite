import Phaser from 'phaser';
import './styles.css';
import './styles/skill-tree.css';
import { GameScene } from './phaser/scenes/GameScene';

const installMobileZoomGuards = (): void => {
  let lastTouchEnd = 0;

  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd < 350) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(
      type,
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
  });
};

const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }

  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl === './') {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${baseUrl}sw.js?v=${encodeURIComponent(__ASTERIDLE_BUILD_ID__)}`;
    navigator.serviceWorker.register(swUrl, { scope: baseUrl }).catch(() => {
      // The game remains playable if PWA registration is unavailable.
    });
  });
};

installMobileZoomGuards();
registerServiceWorker();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [GameScene]
};

new Phaser.Game(config);
