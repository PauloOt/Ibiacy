import Phaser from 'phaser';
import { bakeAll } from '../art';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    bakeAll(this);
    const gallery = new URLSearchParams(location.search).has('galeria');
    this.scene.start(gallery ? 'Gallery' : 'Game');
  }
}
