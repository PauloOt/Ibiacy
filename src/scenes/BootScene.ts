import Phaser from 'phaser';
import { makePlaceholderTextures } from '../art/placeholders';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    makePlaceholderTextures(this);
    this.scene.start('Game');
  }
}
