import Phaser from 'phaser';
import { PIXEL_FONT } from '../config';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0e1a12, 0.65).setOrigin(0);
    const title = this.add.text(width / 2, height / 2 - 24, 'Pausado', {
      fontFamily: PIXEL_FONT,
      fontSize: '48px',
      color: '#ffe08a',
      stroke: '#1a0f14',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(width / 2, height / 2 + 30, 'Esc pra voltar', { fontFamily: PIXEL_FONT, fontSize: '18px', color: '#d7e8d9' }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ESC', () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
  }
}
