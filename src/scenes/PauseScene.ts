import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0e1a12, 0.6).setOrigin(0);
    this.add.text(width / 2, height / 2 - 20, 'Pausado', { fontFamily: 'system-ui, sans-serif', fontSize: '42px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 30, 'Esc pra voltar', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#d7e8d9' }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ESC', () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
  }
}
