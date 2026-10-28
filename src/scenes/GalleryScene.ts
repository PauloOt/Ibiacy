import Phaser from 'phaser';
import { heroArts } from '../art/heroes';

/** Vitrine da arte (abrir com ?galeria): todas as animações rodando, em tamanho grande. */
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super('Gallery');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#3b5a45');
    const zoom = 1.5;
    let y = 40;
    for (const art of heroArts()) {
      let x = 30;
      let rowH = 0;
      for (const a of art.anims) {
        const s = this.add.sprite(x, y, art.key).setOrigin(0).setScale(zoom).play(`${art.key}-${a.name}`);
        this.add.text(x, y - 16, `${art.key} ${a.name}`, { fontFamily: 'monospace', fontSize: '11px', color: '#e8f0d8' });
        x += s.displayWidth + 24;
        rowH = Math.max(rowH, s.displayHeight);
      }
      y += rowH + 40;
    }
    (window as unknown as { __galeria?: unknown }).__galeria = this;
  }
}
