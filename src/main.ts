import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e1a12',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      // ?debug na URL mostra as caixas de colisão
      debug: new URLSearchParams(location.search).has('debug'),
    },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene, HudScene, PauseScene],
});
