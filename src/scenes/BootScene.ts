import Phaser from 'phaser';
import { bakeAll } from '../art';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    bakeAll(this);
    // ?galeria mostra as animações; ?fase pula o lobby e cai direto na fase
    const q = new URLSearchParams(location.search);
    this.scene.start(q.has('galeria') ? 'Gallery' : q.has('fase') ? 'Game' : 'Lobby');
  }
}
