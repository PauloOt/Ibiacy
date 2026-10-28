import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY } from './config';
import { FONT_HUB, FONT_TEXT, FONT_TITLE } from './ui/tokens';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { GalleryScene } from './scenes/GalleryScene';
import { HubScene } from './scenes/HubScene';
import { PauseScene } from './scenes/PauseScene';

// O Phaser desenha texto em canvas: as fontes precisam estar carregadas antes, senão sai a padrão.
// Sem internet, segue com a fonte de reserva depois de 1,5 s.
const fontReady = Promise.race([
  Promise.all([FONT_TEXT, FONT_TITLE, FONT_HUB].map((f) => document.fonts.load(`16px ${f}`))),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]);

fontReady.then(() => new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e1a12',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      // ?debug na URL mostra as caixas de colisão
      debug: new URLSearchParams(location.search).has('debug'),
    },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, HubScene, GameScene, HudScene, PauseScene, GalleryScene],
}));
